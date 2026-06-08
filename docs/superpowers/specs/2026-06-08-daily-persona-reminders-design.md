# Nhắc Ghi Hoá Đơn Tự Động Theo Persona - Design Spec

**Date:** 2026-06-08
**Status:** Approved (Approach A từ brainstorm)
**Owner:** Penny team

## Problem

Người dùng dễ quên ghi chi tiêu hằng ngày, làm dữ liệu đứt quãng và giảm giá trị của bot. Cần một cơ chế **chủ động nhắc** người dùng ghi hoá đơn khi thấy họ "1 ngày chưa ghi", nhưng lời nhắc phải **cá nhân hoá theo persona** (giọng FRIEND/ASSISTANT/HOMEMAKER/COACH/COMEDIAN + các mức tease/serious/frugal/emoji) để không khô khan, không spam.

Hệ thống đã có sẵn:
- Pattern **gửi chủ động ngoài webhook** (`controllers/admin/notifications.controller.ts` → `broadcast`): lặp `BotConfig` active → `ZaloUser` → load `User`(persona, subscription) → lọc `subscription.status === "ACTIVE"` → cá nhân hoá bằng `buildSystemPrompt(persona)` + `aiService.generateChatResponse(...)` → `zaloApi.sendMessage(botToken, zaloUserId, text)`.
- **Persona → tone** qua `buildSystemPrompt(persona)` (`services/persona.service.ts`).
- **Pattern job nền**: `setInterval` + `.unref()` khởi động trong `server.ts` sau `server.listen` (vd `startExpirySweep()` ở `services/subscription-expiry.service.ts`). **Repo không dùng cron library.**

Còn thiếu: bộ lập lịch 2 khung giờ/ngày, logic phát hiện "chưa ghi" theo múi giờ VN, prompt nhắc riêng, và cơ chế chống gửi trùng.

## Goals

1. Tự động gửi lời nhắc ghi hoá đơn **2 lần/ngày**: **08:00** và **17:00** giờ Việt Nam (`Asia/Ho_Chi_Minh`).
2. **Cá nhân hoá theo persona** của từng người (tái dùng `buildSystemPrompt` + `generateChatResponse`).
3. Chỉ nhắc người **"chưa ghi"** theo ngữ nghĩa từng khung (xem Quyết định).
4. **Không gửi trùng** (kể cả khi server restart giữa khung giờ) và có **audit** số lần đã gửi.
5. Bám sát quy ước repo: **không thêm cron library**, dùng `setInterval`+`unref`, tái dùng xương sống gửi của `broadcast`.

## Non-goals

- **Không** thêm cờ bật/tắt cho người dùng (chốt: **luôn bật** cho mọi người đủ điều kiện) → không đổi schema `Persona`/`User` cho mục đích opt-out.
- **Không** kèm số liệu/streak trong nội dung (chốt: **chỉ lời nhắc theo persona**).
- **Không** thêm cron library (node-cron/node-schedule).
- **Không** bù gửi khi server tắt suốt cả khung giờ (chấp nhận bỏ lần đó với loại tin reminder).
- **Không** đổi cơ chế gửi (vẫn `zaloApi.sendMessage` như `broadcast`, không bắt buộc ghi vào lịch sử hội thoại).

## Quyết định đã chốt (brainstorm)

| Vấn đề | Quyết định |
|---|---|
| Ngữ nghĩa "1 ngày chưa ghi" | **Sáng (08:00)** = nhắc ai **hôm qua** không ghi khoản nào; **Chiều (17:00)** = nhắc ai **hôm nay** vẫn chưa ghi gì. Người hoàn toàn không ghi có thể nhận **tối đa 2 tin/ngày** (nội dung khác nhau). |
| Opt-out | **Luôn bật**, không cho tắt → không thêm schema toggle. |
| Nội dung | **Chỉ lời nhắc theo persona** (1–2 câu, không nêu số liệu). |
| Bộ lập lịch | **Approach A**: tick `setInterval` 60s trong tiến trình + tính giờ VN bằng `Intl` (không dependency mới). |
| Chống trùng | Bảng mới **`ReminderLog`** với `@@unique([userId, kind, sentOn])`. |
| Đối tượng | `subscription.status === "ACTIVE"` **và** `ZaloUser.isOnboarded === true`. |

## Architecture

### 1. Múi giờ & mốc ngày VN

- Hằng số `REMINDER_TZ = "Asia/Ho_Chi_Minh"` trong `config/constants.ts`. VN = **UTC+7, không DST** → tính mốc ngày đơn giản & chính xác.
- Helper `vnNow()` → `{ dateStr: "YYYY-MM-DD", hour: number, minute: number }`, dùng `Intl.DateTimeFormat("en-CA", { timeZone: REMINDER_TZ, ... })` (có sẵn trong Node, không thêm dependency).
- Quy mốc ngày VN về UTC `Date`:
  - `startOfTodayVN = new Date(`${dateStr}T00:00:00+07:00`)`
  - `startOfYesterdayVN = new Date(startOfTodayVN.getTime() - 24*60*60*1000)`

### 2. Ngữ nghĩa "chưa ghi" theo khung

| Khung | `kind` | Điều kiện "due" (cần nhắc) |
|---|---|---|
| 08:00 | `MORNING` | 0 `Transaction` với `createdAt ∈ [startOfYesterdayVN, startOfTodayVN)` |
| 17:00 | `EVENING` | 0 `Transaction` với `createdAt ∈ [startOfTodayVN, now]` |

### 3. Đối tượng nhận & phát hiện hiệu quả (không loop từng user)

1. **Lắp danh sách người nhận** (theo pattern `broadcast`): lặp `BotConfig` active → `ZaloUser` (`isOnboarded === true`) → load `User`(persona, subscription) → giữ `subscription.status === "ACTIVE"`. Kết quả: tuple `{ userId, botToken, zaloUserId, persona, userCreatedAt }`. **Dedup theo `userId`** (1 người 1 tin dù có nhiều ZaloUser); cache `User` như `broadcast`.
2. **Tập userId đã có giao dịch trong khung**:
   `prisma.transaction.findMany({ where: { createdAt: { gte, lt } }, distinct: ["userId"], select: { userId: true } })`.
3. **Cần nhắc = (người đủ điều kiện) − (đã có giao dịch trong khung)**.

### 4. Bộ lập lịch + chống trùng

- `startReminderScheduler()` (trong `services/reminder.service.ts`): `setInterval` mỗi **60s**, `timer.unref()`; khởi động trong `server.ts` ngay sau `startExpirySweep()`; `clearInterval` khi shutdown.
- Mỗi tick: tính `vnNow()`; cờ module-scope `lastMorningRunDate` / `lastEveningRunDate` (kiểu `dateStr`):
  - `hour === 8 && lastMorningRunDate !== dateStr` → set cờ, chạy `runReminderSweep("MORNING")`.
  - `hour === 17 && lastEveningRunDate !== dateStr` → set cờ, chạy `runReminderSweep("EVENING")`.
  - Bọc `.catch()` + log như `startExpirySweep`.
- **Bảng mới** (`prisma/schema.prisma`):
  ```prisma
  enum ReminderKind {
    MORNING
    EVENING
  }

  model ReminderLog {
    id        String       @id @default(cuid())
    userId    String
    kind      ReminderKind
    sentOn    DateTime     // = startOfTodayVN (mốc ngày VN)
    createdAt DateTime     @default(now())

    @@unique([userId, kind, sentOn])
    @@index([sentOn])
  }
  ```
- **Idempotency:** trước khi gửi mỗi user, `prisma.reminderLog.create({ data: { userId, kind, sentOn: startOfTodayVN } })`; nếu lỗi unique (`P2002`) → đã gửi → bỏ qua người đó. → an toàn khi restart giữa khung (không gửi lại người đã nhận, bù người chưa nhận) + có audit/đếm.

### 5. Sinh nội dung & gửi

- `buildReminderPrompt(kind)` → câu lệnh ngắn cho Gemini (đóng vai user message), vd:
  - `MORNING`: *"Viết MỘT tin nhắn ngắn (1–2 câu) chào buổi sáng, nhắc nhẹ người dùng hôm qua chưa ghi khoản chi nào và khuyến khích ghi chép đều hôm nay. Đúng giọng persona. KHÔNG nêu số liệu, KHÔNG bịa số tiền."*
  - `EVENING`: *"Viết MỘT tin nhắn ngắn (1–2 câu) cuối ngày, nhắc người dùng cả ngày nay chưa ghi khoản chi nào và gợi ý ngồi tổng kết/ghi lại. Đúng giọng persona. KHÔNG nêu số liệu, KHÔNG bịa số tiền."*
- `text = await aiService.generateChatResponse(buildReminderPrompt(kind), buildSystemPrompt(persona))` — đúng pattern `broadcast`.
- **Fallback** (AI lỗi/timeout/trả rỗng, hoặc user không có persona): câu tĩnh tiếng Việt theo `kind`:
  - `MORNING`: `"Chào buổi sáng! Hôm qua mình chưa thấy bạn ghi khoản chi nào. Hôm nay nhớ ghi lại nhé 📝"`
  - `EVENING`: `"Cuối ngày rồi, hôm nay bạn chưa ghi khoản chi nào. Dành chút thời gian ghi lại nha!"`
- Gửi: `zaloApi.sendMessage(botToken, zaloUserId, text)`; bọc try/catch; đếm `sent` / `failed`; `logger.info({ kind, sent, failed }, "Reminder sweep done")`. (Nếu gửi lỗi sau khi đã tạo `ReminderLog` → chấp nhận, không retry; lần sau sẽ không gửi lại do unique. Để giảm rủi ro, tạo `ReminderLog` **trước** khi gọi `sendMessage`.)

## Data flow

```
[setInterval 60s tick]
   └─ vnNow() → { dateStr, hour }
        ├─ hour===8  & chưa chạy MORNING hôm nay → runReminderSweep("MORNING")
        └─ hour===17 & chưa chạy EVENING hôm nay → runReminderSweep("EVENING")

runReminderSweep(kind):
   1. Tính [gte, lt) theo kind + startOfTodayVN
   2. recipients = lắp từ BotConfig active → ZaloUser onboarded → User ACTIVE (dedup userId)
        (MORNING: chỉ giữ user.createdAt < startOfTodayVN)
   3. activeUserIds = transaction.distinct(userId) trong [gte, lt)
   4. due = recipients.filter(r => !activeUserIds.has(r.userId))
   5. for each due:
        a. create ReminderLog(userId, kind, sentOn) — P2002 → skip
        b. text = generateChatResponse(buildReminderPrompt(kind), buildSystemPrompt(persona))
                  (catch → fallback theo kind)
        c. zaloApi.sendMessage(botToken, zaloUserId, text) — catch → failed++
   6. logger.info({ kind, sent, failed })
```

## Edge cases

- **User mới tinh:** sweep `MORNING` chỉ nhắc user có `createdAt < startOfTodayVN` (tránh báo "hôm qua chưa ghi" cho người vừa tạo hôm nay). `EVENING` không cần guard này.
- **Restart giữa khung 08:00/17:00:** cờ module reset, nhưng `hour` vẫn khớp → tick chạy lại sweep; `ReminderLog` unique đảm bảo không gửi lại + bù người chưa nhận.
- **Server tắt suốt cả giờ 8 hoặc 17:** bỏ qua lần đó (non-goal: không bù).
- **Nhiều `ZaloUser` cho 1 `userId`:** dedup theo `userId`, gửi tới ZaloUser đã liên kết/đầu tiên.
- **AI lỗi/timeout:** fallback tĩnh theo `kind` (không để throw làm hỏng cả sweep).
- **`generateChatResponse` trả chuỗi rỗng:** coi như lỗi → dùng fallback.

## Files thêm/sửa

**Thêm:**
- `backend/src/services/reminder.service.ts` — `runReminderSweep(kind)`, `startReminderScheduler()`, `vnNow()`/mốc ngày, `buildReminderPrompt(kind)`, fallback templates, eligibility + due-detection.
- `backend/src/services/reminder.service.test.ts` — test (vitest).
- Migration Prisma cho `ReminderLog` + enum `ReminderKind`.

**Sửa:**
- `backend/prisma/schema.prisma` — thêm `enum ReminderKind` + `model ReminderLog`; `prisma generate`.
- `backend/src/server.ts` — `import { startReminderScheduler, stopReminderScheduler }`; gọi `startReminderScheduler()` sau `startExpirySweep()`; `clearInterval` trong `shutdown()`.
- `backend/src/config/constants.ts` — `REMINDER_TZ`, có thể thêm `REMINDER_TICK_MS = 60_000`.

## Testing

Theo mẫu `services/subscription-expiry.service.test.ts` (vitest, mock prisma):
1. **Mốc ngày VN:** với một thời điểm cố định, `startOfTodayVN`/`startOfYesterdayVN` đúng (UTC+7).
2. **Phân loại due `MORNING`:** user không có giao dịch hôm qua → due; có giao dịch hôm qua → không; user `createdAt` trong hôm nay → bị loại.
3. **Phân loại due `EVENING`:** user không có giao dịch hôm nay → due; có → không.
4. **Eligibility:** chỉ ACTIVE + onboarded; dedup theo `userId`.
5. **Idempotency:** gọi `runReminderSweep` 2 lần liên tiếp → lần 2 không gửi (P2002 skip); đếm `sent` đúng.
6. **Fallback:** `generateChatResponse` ném lỗi/ trả rỗng → dùng câu tĩnh theo `kind`, vẫn gọi `sendMessage`.

## Rollout

- Migration chạy qua `prisma migrate`. Không breaking change với dữ liệu cũ.
- Khởi động cùng server; không cần biến môi trường bắt buộc (TZ tính qua `Intl`, độc lập với TZ tiến trình).
- Theo dõi qua log `"Reminder sweep done"` (`sent`/`failed`) và bảng `ReminderLog`.
