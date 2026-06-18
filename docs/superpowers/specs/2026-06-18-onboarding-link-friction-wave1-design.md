# Onboarding Link Friction — Wave 1 Design Spec

**Date:** 2026-06-18
**Status:** Approved (Wave 1 from link-friction analysis)
**Owner:** Penny team

## Problem

Sau khi thanh toán/đăng ký free, user được cấp 1 pool bot + mã `PENNY-XXXX` và phải **mở Zalo → tìm chat bot → tự gõ/dán mã → gửi** để liên kết (`step-connect-pool.tsx`, `tryLinkPoolUser` trong `link.ts`). Quá phức tạp cho người dùng phổ thông (chủ yếu mobile). Các điểm nghẽn nặng nhất:

1. **(sev 5)** Tự chép tay mã 9 ký tự sang app khác — dễ sai, phản trực giác.
2. **(sev 4)** Đổi qua lại web ↔ Zalo; tab web để nền, nhiều người không quay lại nên không biết đã xong.
3. **(sev 3)** QR ghi "quét bằng máy khác" hiển thị ngay trên điện thoại đang dùng → vô dụng + gây rối trên mobile.

## Ràng buộc gốc (đã kiểm chứng)

Nền tảng **Zalo Bot** (`bot-api.zaloplatforms.com`) **không** hỗ trợ: tham số `start/ref` trong webhook, deep link điền sẵn tin nhắn, nút bấm, xin số điện thoại. ⟹ Bước "user gửi 1 tin nhắn chứa mã" là **bắt buộc**. Auto-link 0-thao-tác chỉ khả thi qua Zalo OA OpenAPI hoặc Zalo Mini App (Sóng 3, nặng). Xem `memory/zalo-bot-api-link-constraints.md`.

**Trần thực tế của Sóng 1:** "1 chạm mở Zalo → dán (mã đã tự chép) → gửi → web tự nhận diện + báo thành công rõ ràng." Không phụ thuộc bất kỳ tính năng Zalo nào chưa có.

## Goals

1. Giảm thao tác liên kết xuống còn: 1 chạm → dán → gửi.
2. Bỏ rối trên mobile (ẩn QR "máy khác"); desktop vẫn dùng QR.
3. Người dùng luôn biết trạng thái: đang chờ / thành công / cần trợ giúp.
4. Khoan dung lỗi gõ mã (chấp nhận nhiều biến thể).

## Non-goals (để Sóng 2+)

- QR động per-user (O3); cá nhân hoá in-chat (O11).
- Sửa lỗ hổng free-tier pool đầy không self-heal (chỉ ACTIVE mới được `assignAwaitingUsers`).
- Zalo OA / Mini App auto-link (O7/O9 + Mini App).
- Không đổi cơ chế pool/assignment/attribution.

## Changes

### Backend — O4: forgiving link-code matcher

**New file** `backend/src/services/message-handler/link-code.ts`:
- `extractLinkCode(text: string): string | null` — hàm thuần, không phụ thuộc prisma/zalo-api (để unit-test dễ).
- Chuẩn hoá: trim → uppercase → bỏ khoảng trắng/gạch → bỏ tiền tố `PENNY` → còn đúng 4 ký tự thuộc alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` ⟹ trả `PENNY-<4 ký tự>`; ngược lại `null`.
- Chấp nhận: `PENNY-ABCD`, `penny-abcd`, `PENNYABCD`, `penny abcd`, `ABCD`, `abcd `, `PENNY - ABCD`.
- Từ chối: chuỗi rỗng, tin nhắn dài/đa từ không phải mã (vd "ăn trưa 50k"), ký tự ngoài alphabet (vd chứa `I/O/0/1`).

**Modify** `backend/src/services/message-handler/link.ts`:
- Thay `const code = text.trim().toUpperCase()` bằng `const code = extractLinkCode(text)`; nếu `null` → trả lời nhắc đúng định dạng và `return null` (không query DB).
- Câu nhắc khi sai: cụ thể hơn, nêu đúng dạng `PENNY-XXXX`.

An toàn: `tryLinkPoolUser` chỉ chạy cho **unlinked sender trên pool bot** (`index.ts:112-124`), nên nới lỏng matcher không ảnh hưởng tin nhắn chi tiêu của user đã liên kết.

### Frontend — `step-connect-pool.tsx`

- **O1 one-tap:** nút chính đổi từ `<a href={botLink} target="_blank">` → `<Button onClick>` chạy `navigator.clipboard.writeText(linkCode)` (trong cùng user-gesture) rồi điều hướng `window.location.href = botLink` (cùng tab). Nếu clipboard fail → vẫn điều hướng, dựa vào nút chép tay làm fallback.
- **O5 mobile vs desktop:** `const coarse = window.matchMedia('(pointer: coarse)').matches` → mobile ẩn block QR; desktop hiện QR + mã. (Dùng pointer:coarse làm tín hiệu chính, không dựa UA.)
- **O2 feedback:** thêm listener `visibilitychange` → khi tab hiện lại, gọi `/bot/status` ngay (không đợi nhịp 3s). Khi `LINKED` → `toast.success("Kết nối thành công 🎉")` trước `onLinked()`. Sau ~60s chưa link → hiện link "Chưa kết nối được? Liên hệ hỗ trợ" → `/dashboard/contact`.
- **O6 copy:** hướng dẫn 3 bước đánh số ("1. Bấm mở Zalo · 2. Bấm giữ ô chat, Dán · 3. Gửi"); màn "pool đầy" thêm nút/-link "Liên hệ hỗ trợ" → `/dashboard/contact`.

Không đổi API `/bot/status` (đã trả `pool.botLink/qrImageUrl/linkCode/status`).

## Testing

### Automated (backend, vitest)
`backend/src/services/message-handler/link-code.test.ts` cho `extractLinkCode`:
- accept: `PENNY-ABCD`, `penny-abcd`, `pennyabcd`, `penny abcd`, `ABCD`, `  abcd  `, `PENNY - ABCD` → `PENNY-ABCD`.
- reject → `null`: `""`, `"   "`, `"ăn trưa 50k"`, `"hello there"`, `"ABCDE"` (5 ký tự), `"AB1D"` (chứa ký tự ngoài alphabet), `"penny xyz w"` (nhiều token).
- Lệnh: `cd backend && npm run typecheck && npm test`

### Manual (browser + Zalo)
- [ ] Mobile: bấm "Mở Zalo" → mã đã ở clipboard → dán+gửi trong Zalo → quay lại web thấy toast thành công + sang bước cá nhân hoá.
- [ ] Mobile: QR "máy khác" bị ẩn.
- [ ] Desktop: thấy QR + mã.
- [ ] Gửi mã sai định dạng → bot nhắc đúng dạng; gửi `abcd` (thường) vẫn khớp.
- [ ] Pool đầy → thấy nút Liên hệ hỗ trợ.
- [ ] `cd frontend && npm run build`

## Deployment

Theo `memory/deploy-pennybot-coolify.md` (Coolify/myvps, build `--no-cache`, không auto-migrate). Wave 1 **không có migration DB**. Backend đổi → rebuild backend; frontend đổi → rebuild frontend.

## Open Questions

(Không có cho Sóng 1. Quyết định free-tier pool đầy + QR động + Mini App thuộc Sóng 2/3.)
