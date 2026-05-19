# Onboarding Wizard - Design Spec

**Date:** 2026-05-19
**Status:** Approved (Phương án A from brainstorm)
**Owner:** Penny team

## Problem

Khách hàng sau khi mua gói phải trải qua 5 lần context-switch giữa web ↔ Zalo để kết nối bot. Pain points:
- Copy/paste bot token trên mobile rất khó (token dài, phải long-press trong Zalo, switch app, paste).
- Verification 6 số thêm 1 round-trip thủ công.
- Trang `/payment/success` chỉ là hướng dẫn tĩnh; user có thể "Bỏ qua" rồi lạc trong dashboard.
- Persona + budget gộp chung settings page → first-time user scroll qua.
- Không có deep link mở Zalo Bot Manager → QR vô dụng trên mobile.

## Goals

1. Giảm friction copy/paste token bằng clipboard auto-detect + deep links.
2. Gộp toàn bộ first-time setup vào **1 trang wizard 4-step** không thể skip cho đến khi bot đã kết nối hoặc user chủ động hoãn.
3. Loại bỏ lỗi "quên prefix `Bot ` trong tên" bằng nút copy tên gợi ý.
4. Route guard: user có active subscription nhưng chưa connect bot → tự động đẩy về `/onboarding`.

## Non-goals

- Không xây OAuth/SSO với Zalo Bot Platform (docs không hỗ trợ).
- Không thay đổi cơ chế verification token + 6-digit code phía backend (giữ nguyên `bot.controller.ts`).
- Không build "magic link" qua tin nhắn bot (Phương án B, để sau).
- Không build shared OA / managed bot (Phương án C, chiến lược kinh doanh).

## User Flow

```
[Payment IPN ACTIVE] ──► refreshUser ──► hasActiveSub && !botConfig.isActive
                                                            │
                                                            ▼
                                                     /onboarding
                                                            │
                       Step 1 ─ Tạo bot trên Zalo           │
                            │                               │
                            ▼  user mở Zalo Bot Manager (deep link/QR),
                            │  tạo bot tên "Bot Penny <Name>",
                            │  nhận token qua tin nhắn Zalo
                            ▼
                       Step 2 ─ Dán Bot Token
                            │  - Clipboard API tự đọc nếu tab focus
                            │  - Nút "Dán từ clipboard" lớn
                            │  - POST /api/bot/connect → {verifyId, code, botInfo}
                            ▼
                       Step 3 ─ Xác minh sở hữu bot
                            │  - Hiện mã 6 số
                            │  - Nút "Sao chép 'Xác minh: 123456' + mở chat"
                            │    → deep link zalo://chat?id=<botInfo.username/id>
                            │  - Poll /api/bot/verify 3s/lần
                            ▼
                       Step 4 ─ Cá nhân hoá Penny
                            │  - Persona radio (5 nhân vật) + displayName
                            │  - Budget tháng (3 preset: 3M/5M/10M + custom)
                            │  - Có thể "Bỏ qua, để sau"
                            ▼
                          /dashboard
```

## Architecture

### Frontend

**New files:**

| Path | Purpose |
|---|---|
| `frontend/src/pages/onboarding.tsx` | Wizard host: state machine 4 step, progress bar, layout fullscreen |
| `frontend/src/components/onboarding/step-create-bot.tsx` | Step 1: deep link / QR + copy tên gợi ý |
| `frontend/src/components/onboarding/step-paste-token.tsx` | Step 2: clipboard auto-detect + paste UI |
| `frontend/src/components/onboarding/step-verify.tsx` | Step 3: code + copy formatted + deep link bot chat |
| `frontend/src/components/onboarding/step-personalize.tsx` | Step 4: persona + budget inline |
| `frontend/src/components/onboarding/progress-bar.tsx` | Visual progress (4 dots) |
| `frontend/src/hooks/use-clipboard-detect.ts` | Đọc clipboard khi tab focus, validate format token Zalo |

**Modified files:**

| Path | Change |
|---|---|
| `frontend/src/App.tsx` | Thêm route `/onboarding` (ProtectedRoute); `/payment/success` redirect sang `/onboarding` |
| `frontend/src/pages/payment-success.tsx` | **Xóa** (thay bằng redirect trong App.tsx) |
| `frontend/src/components/auth/protected-route.tsx` (hoặc inline trong App.tsx) | Route guard: nếu user có active sub + chưa active bot → push `/onboarding` (trừ khi đang ở `/onboarding` hoặc `/dashboard/contact`) |
| `frontend/src/pages/dashboard/settings.tsx` | Giữ nguyên Bot connect card (cho re-connect sau khi disconnect). Persona + budget vẫn ở đây. |

### Backend

**Modified files:**

| Path | Change |
|---|---|
| `backend/src/controllers/bot.controller.ts` | `connectBot` response thêm field `botInfo` chứa `id`, `username` (đã có) — chỉ cần đảm bảo trả về để frontend gen deep link. Đã có sẵn `botInfo` trong response → không cần đổi. |
| `backend/src/utils/zalo-api.ts` | Không đổi |
| `backend/src/services/bot-verification.service.ts` | Không đổi |

**Không cần migration database.** Schema hiện đã đủ.

## Detailed Component Design

### `useClipboardDetect` hook

```ts
function useClipboardDetect(onDetect: (text: string) => void) {
  // - On window focus, attempt navigator.clipboard.readText()
  // - Permission may fail silently — fallback to manual paste button
  // - Validate: token Zalo format thường dài >40 chars, không có whitespace
  // - Debounce 500ms để tránh đọc nhiều lần
}
```

Token format Zalo: chuỗi dài, alphanumeric + `:` hoặc `_`. Validate đơn giản: `value.length > 20 && !/\s/.test(value)`.

### Deep link cho mobile

- **Mở Zalo Bot Manager**: docs Zalo không công bố deep link cố định. Strategy:
  - Mobile: show 1 nút "Mở Zalo Bot Manager" link tới `https://zalo.me/zbot-creator` (tên OA chuẩn theo Zalo Bot Platform docs). Nếu user không vào được, vẫn show QR + hướng dẫn text bên dưới như fallback.
  - Desktop: show QR (lấy ảnh `https://bot.zapps.me/images/zbot-creator_qrcode.jpg` — đã dùng trong `payment-success.tsx` hiện tại) + label "Quét bằng điện thoại".
- **Mở chat với bot vừa tạo (Step 3)**: nếu `botInfo` từ `getMe()` trả `username` → link `https://zalo.me/<username>`. Nếu không có username → bỏ deep link, chỉ show hướng dẫn text "mở Zalo > tìm tên bot".

Detect mobile bằng `navigator.userAgent.match(/Mobi|Android|iPhone/)` qua 1 helper `lib/is-mobile.ts`.

### Route guard logic

Trong `App.tsx` `ProtectedRoute`, thêm:

```ts
const needsOnboarding =
  user.subscription?.status === "ACTIVE" &&
  !user.botConfig?.isActive;

if (needsOnboarding && location.pathname !== "/onboarding" && location.pathname !== "/dashboard/contact") {
  return <Navigate to="/onboarding" replace />;
}
```

Cho phép `/dashboard/contact` luôn truy cập được để user có thể liên hệ hỗ trợ kể cả khi đang onboarding.

### State machine wizard

```ts
type Step = 1 | 2 | 3 | 4;

interface OnboardingState {
  step: Step;
  verifyId?: string;
  verifyCode?: string;
  botInfo?: { id: string; username?: string; display_name?: string };
}
```

Lưu state trong localStorage (`penny_onboarding_state`) để user refresh không mất tiến trình. Khi `step === 4` complete (hoặc skip) → clear state + navigate `/dashboard`.

### Suggested bot name

`Bot Penny ${user.name.split(" ").pop() ?? user.name}` — lấy first/last word của tên user. Vd "Nguyễn Văn A" → "Bot Penny A".

### Step 4 - Persona/Budget inline

- Persona: 5 nhân vật như settings.tsx hiện tại, nhưng grid 2x3 thay vì 3x2. Mặc định FRIEND.
- Budget: 3 nút preset 3.000.000 / 5.000.000 / 10.000.000 + input custom. Mặc định 5tr nếu user không tương tác.
- Nút "Bỏ qua, để sau" → vẫn save mặc định FRIEND + 5tr budget, nhưng không show toast warning.
- Nút "Hoàn tất" → save persona + budget + navigate dashboard với toast chào mừng.

## Error Handling

| Trường hợp | Xử lý |
|---|---|
| `getMe(token)` thất bại | Toast "Token không hợp lệ. Kiểm tra lại bot token và thử lại." Wizard stay Step 2. |
| Clipboard API permission denied | Silent fallback. Show "Dán thủ công" với input field. |
| Verification timeout (5 phút) | Backend tự cleanup. Frontend timer → toast "Quá thời gian xác minh, hãy thử lại." → reset về Step 2. |
| User refresh trang giữa wizard | Load state từ localStorage. Nếu `verifyId` còn hợp lệ → tiếp tục Step 3 polling. Nếu hết hạn → quay Step 1. |
| Subscription bị huỷ giữa wizard | Route guard sẽ không đẩy nữa (vì `subscription?.status !== "ACTIVE"`). User navigate tự do. |

## Testing

### Manual (browser, mobile + desktop)

- [ ] User mới đăng ký + mua gói → IPN ACTIVE → tự động vào `/onboarding` step 1
- [ ] Step 1 desktop: thấy QR, nút copy tên gợi ý hoạt động
- [ ] Step 1 mobile: deep link `zalo://` mở app Zalo, fallback http khi không có Zalo
- [ ] Step 2: dán token → connectBot OK → chuyển Step 3 với code
- [ ] Step 2: dán token sai → toast error, stay Step 2
- [ ] Step 2 clipboard auto: copy 1 chuỗi dài → mở wizard → token tự điền
- [ ] Step 3 mobile: nút copy → message format "Xác minh: 123456" copy vào clipboard
- [ ] Step 3 background poll: gửi mã từ Zalo → frontend chuyển Step 4 sau ≤ 3s
- [ ] Step 4: chọn persona Coach + budget 10tr → save → navigate dashboard
- [ ] Step 4 "Bỏ qua": vẫn save default → navigate dashboard
- [ ] Refresh trang giữa Step 3 → resume polling đúng verifyId
- [ ] User đã có bot active → vào `/onboarding` → tự redirect `/dashboard`

### Automated

Không thêm test mới ở milestone này (UI flow phụ thuộc nhiều integration Zalo). Vẫn chạy:
- `cd backend && npm run typecheck && npm test`
- `cd frontend && npm run build` (typecheck inline)

## Deployment

- Push lên GitHub `main`
- SSH `root@160.22.123.174`
- `cd /www/wwwroot/pennybot.vn/app && git pull`
- `cd backend && npm ci --omit=dev && npm run build` (nếu đổi backend code, lần này KHÔNG đổi)
- `cd frontend && npm ci && npm run build`
- `pm2 restart penny-backend` (chỉ nếu backend đổi)
- Verify `https://pennybot.vn/onboarding` (cần login + active sub mới truy cập được)

## Open Questions

(Không có. Tất cả ràng buộc đã được xác định trong session brainstorm.)
