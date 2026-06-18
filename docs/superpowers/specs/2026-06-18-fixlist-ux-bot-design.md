# Fix-list: UX + Bot accuracy — Design Spec

**Date:** 2026-06-18
**Status:** Approved (decisions locked via brainstorm)
**Owner:** Penny team

Grounded in exploration workflow `wco1rkqc6`. Two independently-deployable groups; ship both then deploy together.

## Group A — Frontend UX (rebuild `pennybot-web`, no backend)

### A1. Đăng ký: xác nhận mật khẩu + xem mật khẩu
- New reusable `frontend/src/components/ui/password-input.tsx`: wraps `Input`, adds an Eye/EyeOff toggle (`<button type="button">`, `pr-9`). Used in **both** register and login.
- `register.tsx`: add "Xác nhận mật khẩu" field (state `confirmPassword`); in `handleSubmit`, before calling `register(...)`, if `password !== confirmPassword` → `setError("Mật khẩu xác nhận không khớp")` and return (reuse existing Alert). `confirmPassword` is **client-only** — never sent to the API; no validator/controller change.
- `login.tsx`: swap its password `Input` for `PasswordInput`.

### A2. Input quá nhỏ
- `components/ui/input.tsx`: `h-8 → h-11` (44px tap target); drop `md:text-sm` so font stays `text-base` (16px, also prevents iOS focus-zoom).
- Match neighbours: `button.tsx` default `h-8 → h-11`; `select.tsx` default trigger `h-8 → h-11`.
- Strip the per-instance `text-sm`/`text-xs` overrides that would undo the bump: `step-personalize.tsx:81,135`, `step-paste-token.tsx:109` (keep `font-mono`), `settings.tsx:283,301,351`, `transactions.tsx:160,164,177`. Leave `sidebar.tsx` SidebarInput as-is (search box, by design).

### A3. Đăng xuất
- `logout()` already exists in `use-auth.tsx` but is never called. Add a destructive "Đăng xuất" button (LogOut icon) at the bottom of `dashboard/settings.tsx`: `logout()` then `navigate("/login", { replace: true })`. Optional: also clear React Query cache. No backend (stateless JWT).

## Group B — Bot backend (rebuild `pennybot-backend`; #5 also touches web)

### B4. Báo cáo chính xác (priority bug)
Three root causes → make reports **100% deterministic**:
1. **Stop the AI re-rendering numbers.** `report.ts` and `history.ts` currently pass computed totals through `aiService.generateChatResponse` for persona styling → LLM rounds/drops/restates. Build the user-facing message by **string template from DB rows** and send via `sendTrackedMessage` with no LLM round-trip on the figures. A fixed persona greeting line is OK; digits never pass through the LLM.
2. **VN-timezone ranges.** Add a deterministic resolver in `utils/vn-time.ts` (reuse `startOfVnDay`, `+07:00`) mapping Vietnamese phrases → half-open `[startUtc, endUtc)`: hôm nay, hôm qua, tuần này, tuần trước/tuần vừa qua, tháng này, tháng trước, 7 ngày qua, N ngày qua. Run on raw user text in `report.ts`/`history.ts`; fall back to the AI `dateFilter` (re-anchored through `startOfVnDay`) only when no phrase matches. Replace the `+"T23:59:59.999Z"` hack with `lt nextDayStart`.
3. **Monthly default** in `report.ts` uses server-local `new Date(y,m,1)` → wrong in UTC container. Use VN month-start. (Set `TZ=Asia/Ho_Chi_Minh` in deploy as defense-in-depth.)
- **List every transaction** (decision): itemize all rows (date, category, note, amount) + exact total + per-category breakdown. Total computed by exact integer sum (VND) over the same VN range as the listing so they always agree.
- Existing data note: current writes store bare `YYYY-MM-DD` = UTC-midnight = 07:00 VN of that day, which **falls in the correct VN day** under the new ranges — so existing transactions report correctly with the read-path fix alone. Write-path `startOfVnDay` change is optional belt-and-suspenders; defer to avoid churn.

### B5. Lệnh đăng nhập — magic-link one-tap (decision)
- **Backend** (`auth.service.ts`): `signMagicToken(userId)` → JWT `{ userId, typ:"magic" }`, `expiresIn: "10m"`. New `POST /auth/magic` (`auth.controller.ts` + `auth.route.ts`): verify token (`typ==="magic"`, not expired) → load user → return `{ user, token: signToken(...) }` (normal 7-day session JWT). Stateless (no migration). Short TTL + private delivery channel bound the risk; not single-use.
- **Bot** (`command.ts`/`index.ts`/`parsers.ts`): `/login` + new `/dangnhap` alias (shared `sendLoginLink` helper); add `looksLikeLoginRequest(text)` (deterministic, diacritics-insensitive: "đăng nhập", "dang nhap", "login", anchored) checked in `index.ts` right after the `startsWith("/")` block and before the AI call. The reply sends `${frontendUrl}/login?token=<magicToken>`.
- **Web** (`login.tsx`): on mount, if `?token=` present → `POST /auth/magic` → store returned session token (`penny_token`) + user → `navigate("/dashboard")`. On failure → fall back to the normal login form with a toast.

### B6. Bot nhớ tin nhắn cũ (bug)
History is stored AND replayed; the bug is the **30-min staleness wipe** (`conversation-state.service.ts STALE_AFTER_MS`) discarding the whole transcript after any gap.
- On stale: keep the message transcript; only clear volatile `pendingIntent`/`awaitingUserReply` (a stale clarifying-loop shouldn't resurrect). Add a separate longer `HISTORY_STALE_AFTER_MS` (24h) after which history is dropped.
- Raise replayed window: `buildConversationContext` `maxTurns` 8 → `MAX_HISTORY_TURNS` (12).
- (Thinking budget is unaffected — history is input tokens, already injected each call; window stays bounded by `MAX_HISTORY_TURNS` + per-turn 500-char truncation.)

## Testing (TDD for backend logic; build for UI)
- `vn-time` range resolver: each phrase → correct `[start,end)` instants at +07:00 (hôm qua, tuần trước, tháng này, 7 ngày qua, unknown→null).
- Deterministic report formatter: rows → text with exact total + itemized list; total = sum of listed amounts.
- `looksLikeLoginRequest`: matches đăng nhập/dang nhap/login; rejects ordinary chat.
- Magic token: `signMagicToken`→verify ok; rejects expired/`typ!=="magic"`/normal token.
- Conversation staleness: >30min keeps transcript & clears flags; >24h drops history.
- Frontend: `npm run build` (typecheck).
- Lệnh: `cd backend && npm run typecheck && npm test`.

## Deploy
Per `memory/deploy-pennybot-vps.md`: merge → push main → on VPS `cd /opt/penny-deploy && docker compose build --no-cache pennybot-web pennybot-backend && docker compose up -d ...`. **No DB migration.** Optionally add `TZ=Asia/Ho_Chi_Minh` to `backend.env`.

## Out of scope
Admin changes; per-user bot provisioning; single-use magic-link nonce (stateless 10-min TTL accepted).
