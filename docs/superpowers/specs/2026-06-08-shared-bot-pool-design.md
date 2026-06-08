# Shared Bot Pool - Design Spec

**Date:** 2026-06-08
**Status:** Approved (Hướng A from brainstorm)
**Owner:** Penny team

## Problem

Hiện tại mỗi user phải **tự tạo bot Zalo riêng** rồi dán token + xác minh — quá khó cho người mới (xem `2026-05-19-onboarding-wizard-design.md`, pain points vẫn còn). Mục tiêu mới: sau khi thanh toán, user được **cấp sẵn 1 bot** do admin tạo trước; admin cấu hình TOKEN + QR ở trang admin; **mỗi bot tối đa 5 user**; hệ thống **tự động phân phối đều**. Luồng tự tạo bot cũ trở thành tuỳ chọn nâng cao.

### Ràng buộc kỹ thuật cốt lõi (lý do thiết kế)

Hôm nay việc gán giao dịch là **theo chủ bot**: webhook nhận tại `/api/webhooks/zalo/:botConfigId` → tra `BotConfig.userId` (đúng 1 chủ) → mọi giao dịch của mọi người nhắn vào bot đó đều ghi cho 1 user (`message-handler/index.ts:79,92`; `webhook.controller.ts:105`; `BotConfig.userId @unique`). Nếu 5 user dùng chung 1 bot mà giữ logic này → **chi tiêu của cả 5 bị gộp chung**.

➡️ Bắt buộc chuyển sang gán giao dịch **theo người gửi Zalo** (`ZaloUser(zaloUserId, botConfigId) → userId`), kèm **một bước liên kết 1 lần/user** để hệ thống biết tài khoản Zalo nào là của app-user nào.

## Goals

1. Sau khi thanh toán, **tự động gán** user vào 1 pool bot còn chỗ, **phân phối đều** (least-loaded).
2. Admin quản lý pool bot (CRUD) ở `/admin/bots`: TOKEN, QR (upload ảnh), capacity (mặc định 5), bật/tắt; thấy tải mỗi bot (vd 3/5) và danh sách user.
3. Onboarding mặc định rút còn **2 bước**: ① Kết nối (quét QR bot được cấp + gửi mã liên kết) → ② Cá nhân hoá.
4. Gán giao dịch **đúng người** trên bot dùng chung (per Zalo sender).
5. **Chặn mua khi pool hết chỗ** + cảnh báo admin (không bán quá số chỗ).
6. **Giải phóng chỗ ngay** khi gói hết hạn/huỷ; thêm **job quét hết hạn** vì hiện chưa có cơ chế tự EXPIRED.
7. **Giữ luồng tự tạo bot** (self-bot) làm tuỳ chọn nâng cao; user/bot cũ vẫn chạy y nguyên.

## Non-goals

- Không xây OAuth/SSO Zalo, không "magic link" tự động (deep-link auto-link để sau — Zalo Bot API hiện không lộ tham số `start`/`ref` trong payload, xem `zalo-api.ts:40-58`).
- Không xây hạ tầng lưu file (S3/disk). QR lưu dạng **data URL string** trong `BotConfig.qrImageUrl` (ảnh QR nhỏ vài KB; `REQUEST_BODY_LIMIT=10mb` đủ).
- Không đổi cơ chế thanh toán SePay.
- Không gộp persona/budget thành dùng chung — mỗi app-user vẫn có persona/budget riêng.

## Quyết định đã chốt (brainstorm)

| Vấn đề | Quyết định |
|---|---|
| Mô hình dữ liệu | **Hướng A**: pool bot = `BotConfig kind=POOL` (không chủ) + bảng `BotAssignment` |
| Liên kết Zalo↔app | **QR + mã liên kết** gõ tay (mã lưu trên `BotAssignment.linkCode`, dùng 1 lần) |
| Pool hết chỗ khi mua | **Chặn ở checkout + cảnh báo admin** (self-bot bỏ qua chặn) |
| Self-bot | **Giữ làm tuỳ chọn nâng cao** |
| Hết hạn/huỷ | **Giải phóng chỗ ngay** + **job quét hết hạn** (mới) |
| Nhập QR | **Upload ảnh** → data URL string |
| Phân phối | **Least-loaded**, hoà thì bot tạo trước (deterministic) |

## User Flow (pool — mặc định)

```
[Sub thành ACTIVE: IPN prod / dev-auto / admin manual-upgrade]
        │  assignBotToUser(userId):
        │    chọn pool bot active còn chỗ, tải ít nhất (hoà → tạo trước)
        │    tạo BotAssignment(status=PENDING_LINK, linkCode=PENNY-XXXX)
        │    (nếu hết chỗ do race → mark "awaiting bot" + cảnh báo admin)
        ▼
   refreshUser → me.botConnection = { kind:'POOL', status:'PENDING_LINK' }
        ▼
   /onboarding  (guard: sub ACTIVE && !connected)
        │
   Step 1 ─ Kết nối bot
        │   - Hiện QR bot được cấp (qrImageUrl) + mã liên kết "PENNY-XXXX"
        │   - Hướng dẫn: Quét QR → mở chat → gửi mã cho bot
        │   - Poll GET /bot/status tới khi status=LINKED
        │        (user gửi mã → webhook pool-bot khớp linkCode →
        │         tạo ZaloUser(from.id, botConfigId, userId), assignment=LINKED)
        ▼
   Step 2 ─ Cá nhân hoá (persona + budget) — như cũ
        ▼
   /dashboard
```

Checkout bị chặn khi hết chỗ:
```
POST /subscriptions {planSlug}  (botMode mặc định 'pool')
   └─ pool còn chỗ? ── không ──► 409 POOL_FULL  → FE: "Tạm hết chỗ" + cảnh báo admin
                                                   + gợi ý "Tự kết nối bot riêng" (botMode='self', bỏ chặn)
                     ── có ───►  tạo subscription như cũ
```

## Architecture

### Data Model (Prisma)

**`BotConfig` (sửa):**
```prisma
model BotConfig {
  id          String    @id @default(cuid())
  userId      String?   @unique  // OWNED = chủ bot; POOL = null
  kind        BotKind   @default(OWNED)
  label       String?   // admin đặt tên, vd "Bot 01"
  botToken    String
  botLink     String?   // link chat công khai (tuỳ chọn)
  qrImageUrl  String?   // data URL ảnh QR (pool bot)
  capacity    Int       @default(5)
  isActive    Boolean   @default(false)
  connectedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User?           @relation(fields: [userId], references: [id])
  assignments BotAssignment[]

  @@index([kind, isActive])
}

enum BotKind { OWNED  POOL }
```
- **Giữ `userId String? @unique`** (đổi từ `String` sang `String?`). PostgreSQL cho phép **nhiều NULL** trên UNIQUE index → nhiều POOL bot cùng `userId=null` vẫn hợp lệ, đồng thời vẫn enforce "1 OWNED bot / user". Nhờ vậy quan hệ 1-1 `User.botConfig BotConfig?` **giữ nguyên** và mọi call site owned-bot (`findUnique/upsert({where:{userId}})`, `connectBot`) **không phải đổi**.
- `User.botConfig BotConfig?` giữ nguyên (chỉ trỏ tới OWNED bot của user; pool bot không thuộc user nào).

**`BotAssignment` (mới):**
```prisma
model BotAssignment {
  id               String           @id @default(cuid())
  botConfigId      String
  userId           String           @unique   // 1 assignment đang-hoạt-động / user
  status           AssignmentStatus @default(PENDING_LINK)
  linkCode         String           @unique
  linkedZaloUserId String?
  createdAt        DateTime         @default(now())
  linkedAt         DateTime?

  botConfig BotConfig @relation(fields: [botConfigId], references: [id])
  user      User      @relation(fields: [userId], references: [id])

  @@index([botConfigId])
  @@index([status])
}

enum AssignmentStatus { PENDING_LINK  LINKED }
```
- Release = **xoá** dòng (số dòng theo `botConfigId` = tải hiện tại). Lịch sử sub đã có ở `SubscriptionAudit`.
- `User` thêm quan hệ `botAssignment BotAssignment?`.

**`AdminAction` (thêm):** `BOT_CREATE`, `BOT_UPDATE`, `BOT_DELETE`.

**`ZaloUser`, `ConversationState`, `Transaction`, `Persona`: KHÔNG đổi** (đã khoá theo `botConfigId`/`userId`).

**Migration:** thêm cột với default an toàn (`kind=OWNED`, `capacity=5`, `userId` cũ giữ nguyên), tạo bảng `BotAssignment`, thêm enum. Dữ liệu cũ → tất cả là OWNED, chạy y như cũ.

### Backend

**New files:**

| Path | Purpose |
|---|---|
| `backend/src/services/bot-pool.service.ts` | `assignBotToUser(userId)` (least-loaded + capacity), `releaseAssignment(userId)`, `poolHasCapacity()`, `getPoolLoad()`, gen `linkCode` |
| `backend/src/services/subscription-expiry.service.ts` | `sweepExpiredSubscriptions()`: ACTIVE & endDate<now → EXPIRED + release slot; chạy định kỳ (setInterval khi boot, như `bot-verification.service.ts:70`) |
| `backend/src/controllers/admin/bots.controller.ts` | CRUD pool bot (list + load, create, update, remove); audit log |
| `backend/src/routes/admin/bots.route.ts` | Routes theo khuôn `plans.route.ts` (auth+admin, Zod) |
| `backend/src/services/message-handler/link.ts` | `tryLinkPoolUser(botConfig, message)`: khớp `linkCode` → tạo ZaloUser + set LINKED |

**Modified files:**

| Path | Change |
|---|---|
| `backend/prisma/schema.prisma` | Như mục Data Model + migration |
| `backend/src/controllers/webhook.controller.ts` | Truyền `botConfig` (kèm `kind`) vào `handleMessage`, không truyền sẵn `userId` |
| `backend/src/services/bot-manager.service.ts` | Polling map khoá theo **`botConfigId`**; `startBot(botConfigId, botToken)`; `startAllBots` start pool bot (isActive) + owned bot (chủ có sub ACTIVE); `handleMessage(botConfig, message)` |
| `backend/src/services/message-handler/index.ts` | Phân giải app-user **theo người gửi**: POOL → `ZaloUser(from.id, botConfigId)` (chưa có → `tryLinkPoolUser`); OWNED → giữ logic chủ bot. Bỏ `findFirst({botToken,userId})` cứng. |
| `backend/src/services/message-handler/onboarding.ts` | `getOrCreateZaloUser` giữ; với pool, ZaloUser được tạo ở bước link (đã có userId chính xác) |
| `backend/src/controllers/subscription.controller.ts` | `createSubscription`: nhận `botMode?: 'pool'\|'self'` (default pool); pool → gate `poolHasCapacity()` else 409 `POOL_FULL` + log cảnh báo; sau khi ACTIVE (dev path) → `assignBotToUser` |
| `backend/src/services/payment.service.ts` | `activateSubscriptionFromIpn`: sau transaction ACTIVE → `assignBotToUser(userId)` (catch lỗi, không làm hỏng IPN) |
| `backend/src/controllers/admin/subscriptions.controller.ts` | `manualUpgrade`: sau khi tạo ACTIVE → `assignBotToUser`; trước đó release assignment cũ nếu có |
| `backend/src/controllers/bot.controller.ts` | `botStatus` trả thêm trạng thái pool assignment (kind/status/linkCode/qr/botLink); `connectBot` self-bot vẫn dùng `kind=OWNED` |
| `backend/src/controllers/auth.controller.ts` | `me` trả thêm `botConnection: { kind, status, isActive }` (gộp owned bot + pool assignment) |
| `backend/src/validators/*` | Zod cho `botMode`, admin bot CRUD |
| `backend/src/server.ts` (hoặc app boot) | Khởi động `sweepExpiredSubscriptions` định kỳ |

### Frontend

**New files:**

| Path | Purpose |
|---|---|
| `frontend/src/pages/admin/bots.tsx` | List pool bot + tải (X/5) + nút thêm/sửa/xoá; cảnh báo "pool đầy / X user chờ cấp bot" |
| `frontend/src/components/admin/bot-form-dialog.tsx` | Dialog create/edit: label, botToken, capacity, isActive, upload QR (file→dataURL), botLink |
| `frontend/src/components/onboarding/step-connect-pool.tsx` | Step kết nối pool: hiện QR + mã liên kết + poll status |

**Modified files:**

| Path | Change |
|---|---|
| `frontend/src/pages/onboarding.tsx` | Rẽ nhánh: pool (2 bước: connect-pool → personalize) vs self (4 bước cũ, sau link "Tự kết nối bot riêng (nâng cao)") |
| `frontend/src/App.tsx` | Route `/admin/bots`; guard `needsOnboarding = sub ACTIVE && !connected` (connected = owned active **hoặc** pool LINKED) |
| `frontend/src/hooks/use-auth.tsx` | `User.botConnection?: { kind:'OWNED'\|'POOL'\|null; status?: 'PENDING_LINK'\|'LINKED'; isActive:boolean }` |
| `frontend/src/components/admin/admin-sidebar.tsx` | Thêm mục "Bot Pool" → `/admin/bots` |
| `frontend/src/lib/api.ts` | Endpoint admin bots + bot status pool (dùng axios sẵn) |
| `frontend/src/pages/dashboard/settings.tsx` | Hiện trạng thái bot được cấp (pool) hoặc bot riêng (self); self-bot reconnect như cũ |

## Detailed Component Design

### `bot-pool.service.ts`
```ts
// least-loaded: pool bot isActive, đang dùng < capacity, ít assignment nhất, hoà → createdAt asc
export async function assignBotToUser(userId): Promise<BotAssignment | null>
// xoá assignment của user + dọn ZaloUser mapping (theo botConfigId cũ)
export async function releaseAssignment(userId): Promise<void>
export async function poolHasCapacity(): Promise<boolean>
export async function getPoolLoad(): Promise<{ botConfigId; label; used; capacity }[]>
function generateLinkCode(): string // "PENNY-" + 4 ký tự base32, unique (retry nếu trùng)
```
- Tránh race khi gán: chọn bot + tạo assignment trong `$transaction`; kiểm tra lại `count < capacity` trước khi tạo (hoặc dựa `@@unique(userId)` + đếm lại).

### Linking (pool) — `message-handler/link.ts` + `index.ts`
- Khi pool bot nhận tin từ `from.id` **chưa có ZaloUser** trên `botConfigId`:
  - Tìm `BotAssignment{ botConfigId, status:PENDING_LINK, linkCode == text.trim() }`.
  - Khớp → tạo `ZaloUser(from.id, botConfigId, userId=assignment.userId)`, set `assignment.status=LINKED, linkedZaloUserId=from.id, linkedAt=now`; bot trả lời chào mừng + chạy onboarding bot.
  - Không khớp → bot nhắc "Gửi đúng mã liên kết hiển thị trên web nhé"; **không** xử lý chi tiêu.
  - Từ chối nếu `from.id` đã LINKED với app-user khác trên bot này (1 Zalo = 1 app-user/bot).
- OWNED bot: giữ nguyên (verify ownership qua `bot-verification.service`, `userId = chủ`).

### Attribution refactor — `index.ts`
- `handleMessage(botConfig, message)`:
  - `appUserId`: OWNED → `botConfig.userId`; POOL → `ZaloUser(from.id, botConfig.id)?.userId` (null → vào link flow).
  - Phần còn lại (persona/expense/report…) dùng `appUserId` đã phân giải → mỗi user giữ dữ liệu riêng.
- Dedup key vẫn `botConfig.id:messageId` (đã đúng cho cả pool).

### Admin Bot Pool — theo khuôn Plans
- `bots.controller.ts`: `list` (kèm `used`/capacity), `create` (validate token `getMe`, `startBot`, audit `BOT_CREATE`), `update` (audit `BOT_UPDATE`; đổi token/capacity/isActive; isActive=false → `stopBot`), `remove` (chỉ cho xoá khi `used==0`; audit `BOT_DELETE`).
- Dialog upload QR: `<input type=file accept=image/*>` → `FileReader.readAsDataURL` → gửi chuỗi; FE render `<img src={qrImageUrl}>`. Giới hạn ~200KB.

### Onboarding rẽ nhánh — `onboarding.tsx`
- Đọc `me.botConnection.kind`. POOL → render `StepConnectPool` (QR + mã + poll) → `StepPersonalize`. Có link nhỏ "Tự kết nối bot riêng (nâng cao)" → chuyển sang luồng 4 bước cũ (gọi checkout/connect self nếu cần). OWNED/self → luồng cũ.
- `StepConnectPool`: GET `/bot/status` mỗi 3s; `status==='LINKED'` → next + `refreshUser`.

### Expiry sweep — `subscription-expiry.service.ts`
- `setInterval` (vd mỗi 1 giờ) gọi `sweepExpiredSubscriptions()`:
  - `subscription` ACTIVE & `endDate < now` → set `EXPIRED`, `releaseAssignment(userId)`, `stopBot` nếu owned. (Không tự archive; archive vẫn theo replace/cancel.)
- Cũng vá lỗ hổng hiện tại: sub quá hạn vẫn ACTIVE mãi.

### Route guard / auth
```ts
const connected =
  user.botConnection?.kind === 'OWNED'
    ? user.botConnection.isActive
    : user.botConnection?.status === 'LINKED';
const needsOnboarding = user.subscription?.status === 'ACTIVE' && !connected;
```

## Error Handling

| Trường hợp | Xử lý |
|---|---|
| Pool hết chỗ lúc checkout (pool mode) | 409 `POOL_FULL`; FE "Tạm hết chỗ, vui lòng thử lại sau" + nút "Tự kết nối bot riêng"; backend `log.warn` cảnh báo admin |
| Hết chỗ lúc activate (race) | `assignBotToUser` trả null → user "awaiting bot"; `log.warn`; admin thấy "X user chờ cấp bot" ở `/admin/bots`; gán lại khi admin thêm bot |
| User gửi sai mã liên kết | Bot nhắc gửi đúng mã; không tính chi tiêu |
| 1 Zalo định link 2 app-user/bot | Từ chối, bot báo lỗi |
| Admin xoá bot còn user | Chặn (`used>0`) — phải release/đổi trước |
| Token pool bot sai khi tạo | `getMe` fail → 400, không lưu |
| `assignBotToUser` lỗi trong IPN | Catch, log; IPN vẫn 200 (không chặn thanh toán); user "awaiting bot" |
| Đổi gói (replace)/manual-upgrade | Release assignment cũ trước khi gán mới |

## Testing

### Automated (backend, vitest)
- `bot-pool.service`: least-loaded chọn đúng bot ít tải nhất; hoà → tạo trước; full → null; release giảm tải; `poolHasCapacity`.
- `link`: khớp linkCode → tạo ZaloUser + LINKED; sai mã → không link; chặn double-link.
- `subscription-expiry`: ACTIVE quá hạn → EXPIRED + release; chưa hạn → giữ.
- Attribution: 2 ZaloUser khác nhau trên cùng pool bot → 2 transaction về 2 app-user.
- Lệnh: `cd backend && npm run typecheck && npm test`

### Manual (browser + Zalo)
- [ ] Admin tạo pool bot (upload QR, capacity 5) → thấy 0/5
- [ ] User A mua gói → tự gán bot → onboarding hiện QR + mã → gửi mã → LINKED → vào dashboard
- [ ] User A nhắn chi tiêu → ghi đúng tài khoản A
- [ ] User B (Zalo khác) cùng bot → ghi đúng tài khoản B (không lẫn A)
- [ ] Gán đều: tạo 2 bot, nhiều user → phân phối least-loaded
- [ ] Pool đầy → user mới checkout → "Tạm hết chỗ" + admin thấy cảnh báo
- [ ] Sub hết hạn (chỉnh endDate) → sweep → release → bot có lại chỗ
- [ ] Self-bot nâng cao vẫn kết nối được; user cũ không bị ảnh hưởng
- [ ] `cd frontend && npm run build`

## Deployment

- Push GitHub, merge `main`
- SSH server, `git pull`
- `cd backend && npm ci && npx prisma migrate deploy && npm run build && pm2 restart penny-backend`
- `cd frontend && npm ci && npm run build`
- Admin tạo ít nhất 1 pool bot trước khi user mới mua gói (nếu không, checkout sẽ báo hết chỗ)
- Verify: tạo pool bot, mua thử (dev/manual-upgrade), link, nhắn chi tiêu

## Open Questions

(Không còn — tất cả ràng buộc đã chốt trong brainstorm: Hướng A, QR upload, chặn-checkout, release-ngay + sweep job, least-loaded.)
