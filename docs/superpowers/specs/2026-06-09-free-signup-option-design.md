# "Dùng miễn phí" signup option — Design

Date: 2026-06-09
Status: Approved

## Problem

After registering, users are **forced to choose a paid plan** before they can use the
bot: `register.tsx` redirects to `/pricing`, the pricing page shows only paid plans,
and both `onboarding.tsx` and the `App.tsx` route guard hard-block anyone without an
ACTIVE subscription. The free tier (10 msg/day for non-ACTIVE users) already exists in
the backend, but there is no way for a user to *enter* it — they can never get a pool
bot to talk to. We need a **"Dùng miễn phí" option on the Pricing page**, with clear
explanation, that lets a user start using the bot for free.

Decision (from the user): **do not remove plan selection** — add a free option on the
Pricing page alongside the paid plans, and explain clearly what free includes.

## Key insight

Pool-bot linking (`tryLinkPoolUser`) already does **not** require a subscription, and
the free-tier gate already treats any non-ACTIVE user as 10/day. The *only* things
blocking a free user are:

1. They never get a `BotAssignment` (assignment is only created for ACTIVE subs).
2. The frontend forces them to `/pricing` and the onboarding page + route guard block
   non-ACTIVE users.

So the feature is small: give the user a pool `BotAssignment` (no subscription) and let
them through onboarding. No change to `SubStatus`, the free-tier gate, or expiry logic.

## Flow

```
Register → /pricing
  ├─ choose paid plan → /subscriptions → SePay → ACTIVE → onboarding (unchanged)
  └─ "Bắt đầu miễn phí" → POST /api/bot/free (assign pool bot, NO subscription)
        → /onboarding (shows pool linkCode/QR) → user sends code to bot on Zalo
        → tryLinkPoolUser links them (isOnboarded=true) → use bot @ 10 msg/day
```

## Backend — one new endpoint

`POST /api/bot/free` (auth required, no body). Controller `claimFreeBot`:

```ts
export const claimFreeBot = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  // Self-bot (OWNED) users manage their own bot — nothing to claim.
  const config = await prisma.botConfig.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (config) {
    res.json({ ok: true, alreadyHasBot: true });
    return;
  }
  // assignBotToUser is idempotent (returns the existing assignment) and returns
  // null only when no active pool bot has a free slot.
  const assignment = await assignBotToUser(userId);
  if (!assignment) {
    throw new HttpError(409, "Hiện đã đủ người dùng, vui lòng thử lại sau hoặc nâng cấp gói");
  }
  res.json({ ok: true, status: assignment.status });
};
```

Route: `router.post("/free", asyncHandler(claimFreeBot));` in `bot.route.ts`
(`authMiddleware` is already applied via `router.use`).

Notes:
- No subscription row is created — the user stays non-ACTIVE, so the existing
  free-tier gate (10/day) applies automatically.
- Harmless for an ACTIVE pool user who happens to click it (idempotent assignment).
- Pool capacity is **shared** with paid users, first-come-first-served; a full pool
  returns 409 with a friendly message (mirrors the existing `POOL_FULL` behavior at
  subscription checkout).

## Frontend

### Pricing page (`pages/pricing.tsx`)
- Add a distinct **"Miễn phí" (0đ)** card alongside the 3 paid plans, with explanatory
  copy so users understand the trade-off:
  - Features: "10 tin nhắn mỗi ngày", "Ghi chi tiêu & hỏi đáp với AI", "Báo cáo cơ
    bản", "Nâng cấp bất cứ lúc nào".
  - Sub-note clarifying paid benefit: "Gói trả phí: nhắn không giới hạn + nhắc ghi
    chép mỗi ngày."
  - Button "Bắt đầu miễn phí".
- Layout: grid becomes `md:grid-cols-2 lg:grid-cols-4`; the free card renders first.
- Handler `handleFree`:
  - not logged in → `navigate("/register")`.
  - else `POST /api/bot/free` → on success `refreshUser()` → `navigate("/onboarding")`.
  - 409 / error → toast the server message.

### Onboarding guard (`pages/onboarding.tsx`)
Current redirect blocks non-ACTIVE users:
```ts
if (user && user.subscription?.status !== "ACTIVE") return <Navigate to="/pricing" replace />;
```
Relax to allow users who have a bot connection (pool assignment) even without ACTIVE:
```ts
if (user && user.subscription?.status !== "ACTIVE" && !user.botConnection) {
  return <Navigate to="/pricing" replace />;
}
```

### Route guard (`App.tsx` `ProtectedRoute`)
Current only sends ACTIVE users to onboarding:
```ts
const needsOnboarding = user.subscription?.status === "ACTIVE" && !connected;
```
Relax so a free user with a pending pool assignment is also routed to finish linking:
```ts
const hasBot = !!user.botConnection;
const needsOnboarding = (user.subscription?.status === "ACTIVE" || hasBot) && !connected;
```
For ACTIVE users behavior is unchanged; non-ACTIVE users with no assignment are not
forced anywhere.

## Edge cases

- **Idempotent:** clicking free twice, or after already being assigned, returns the
  existing assignment and routes to onboarding.
- **Already linked:** `connected === true` → guards don't force onboarding; user uses
  the dashboard normally.
- **Pool full:** 409 → toast "Hiện đã đủ người dùng, vui lòng thử lại sau hoặc nâng
  cấp gói".
- **Not authenticated on /pricing:** free button → `/register`.

## Testing

Backend unit test `bot.controller.free.test.ts` (mock `prisma.botConfig.findUnique`,
`assignBotToUser`, a fake `res`):
- no owned bot + pool capacity → `assignBotToUser` returns assignment → `res.json({ ok:
  true, status })`.
- pool full → `assignBotToUser` returns null → throws `HttpError` 409.
- owned bot exists → returns `{ ok: true, alreadyHasBot: true }`, does **not** call
  `assignBotToUser`.

Frontend: typecheck + production build (no unit-test harness in the main frontend);
manual smoke per "Verification".

## Verification (manual, post-deploy)

Register a fresh account → on /pricing click "Bắt đầu miễn phí" → land on /onboarding
with a pool linkCode/QR → send the code to the bot on Zalo → confirm linked and that
messages work up to 10/day, then the upgrade notice appears.

## Out of scope (possible follow-ups)

- Reserving pool capacity for paying customers (free currently shares the pool).
- TTL cleanup of "dangling" PENDING_LINK assignments from free users who never link.
- Surfacing the free CTA on the landing page / register step (Pricing only for now).
