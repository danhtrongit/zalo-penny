# Free tier (10 msg/day) + upgrade & expiry nudges — Design

Date: 2026-06-09
Status: Approved

## Problem

Today there is **no access gate** in the Zalo message pipeline: any user — with no
subscription, PENDING, EXPIRED, CANCELLED, or ACTIVE — can chat and log expenses
without limit. We want a free tier so users can try the bot without paying, while
creating upgrade pressure and capping AI cost.

Requirements (from the user):

1. Users may use the bot **for free without registering a plan**.
2. Free limit is **10 messages per day**.
3. When the limit is exceeded, **notify the user with an upgrade link**.
4. When a user's **subscription expires**, remind them.

## Decisions

- **What counts:** every incoming message that reaches intent processing counts as 1
  (logging an expense, asking a question, sending a receipt photo — all count).
  Chosen for fidelity to "10 tin/ngày", simplicity, and because the gate sits
  *before* any AI call, so blocked messages cost nothing.
- **Over-limit behavior:** the 11th message of the day receives **one** upgrade
  notice; further messages that day are ignored silently (no spam). Resets at VN
  midnight.
- **OWNED bots unchanged:** OWNED bots already stop when the owner isn't ACTIVE
  (`bot-manager`). We do **not** change that. The free tier therefore serves
  POOL-bot users and never-subscribed users (POOL bots always run) — exactly where
  free/new users live. OWNED owners who lapse get the one-time expiry notice (sent
  before the bot stops) and must renew to keep using the bot.

## Gating model

- **ACTIVE subscription → unlimited.** Gate skipped entirely, no DB write.
- **Everyone else → 10/day** (no subscription, PENDING, EXPIRED, CANCELLED).
- "Message" = anything reaching the intent router. **Excluded** from the count:
  onboarding messages, `/slash` commands, ownership-verification handshakes,
  sticker/voice auto-replies — these return earlier in the handler.
- Day boundary = VN calendar day, reusing `utils/vn-time.ts`
  (`vnDateStr`, `startOfVnDay`).

## Data model — new `DailyUsage` table

```prisma
model DailyUsage {
  id              String    @id @default(cuid())
  userId          String
  date            DateTime           // VN-midnight bucket for the day
  count           Int       @default(0)
  limitNotifiedAt DateTime?          // set once when the over-limit notice is sent
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, date])
  @@index([date])
}
```

Migration is hand-authored SQL under
`prisma/migrations/20260609xxxxxx_daily_usage/migration.sql` (no local DB; applied on
the server via `prisma migrate deploy` during deploy), mirroring the reminder-log
migration. `prisma generate` is run locally so the client type exists for tests.

## Component 1 — the free-tier gate (`services/usage.service.ts`)

Single entry point called from `message-handler/index.ts`:

```ts
enforceFreeTier(opts: {
  userId: string;
  botToken: string;
  chatId: string;
  systemPrompt: string;   // already built from persona in the handler
}): Promise<{ blocked: boolean }>
```

Algorithm:

1. Fetch the user's subscription status
   (`prisma.subscription.findUnique({ where: { userId }, select: { status } }`).
   If `status === "ACTIVE"` → return `{ blocked: false }` (no counting).
2. Compute `date = startOfVnDay(vnDateStr(new Date()))`.
3. Atomically increment the day counter:
   ```ts
   const usage = await prisma.dailyUsage.upsert({
     where: { userId_date: { userId, date } },
     create: { userId, date, count: 1 },
     update: { count: { increment: 1 } },
     select: { count: true },
   });
   ```
4. If `usage.count <= FREE_DAILY_MESSAGE_LIMIT` → return `{ blocked: false }`.
5. Otherwise (over limit) → claim the once-per-day notice atomically:
   ```ts
   const claim = await prisma.dailyUsage.updateMany({
     where: { userId, date, limitNotifiedAt: null },
     data: { limitNotifiedAt: new Date() },
   });
   if (claim.count === 1) await sendLimitNotice(botToken, chatId, systemPrompt);
   return { blocked: true };
   ```
   The conditional `updateMany` is a single atomic SQL `UPDATE … WHERE
   limitNotifiedAt IS NULL`, so under concurrent messages exactly one caller wins
   the claim and sends the notice; the rest see `claim.count === 0` and stay silent.

Call site (after the onboarding early-return, before the receipt/AI block):

```ts
if ((await enforceFreeTier({ userId, botToken, chatId, systemPrompt })).blocked) {
  await rememberProcessedMessage(conversation, message.message_id);
  await completeMessageProcessing(processingKey);
  return;
}
```

We still mark the message processed/complete so dedup bookkeeping stays consistent.

### Over-limit notice

Persona-flavored body via `aiService.generateChatResponse(prompt, systemPrompt)`
(the handler's `systemPrompt`), then a **deterministically appended** upgrade line so
the link can never be dropped by the model:

```
<persona nudge: "bạn đã dùng hết 10 tin miễn phí hôm nay…">

👉 Nâng cấp để dùng không giới hạn: <FRONTEND_URL>/pricing
```

Static fallback if the AI call fails or returns empty (mirrors `REMINDER_FALLBACK`).

## Component 2 — expiry reminder (`services/subscription-expiry.service.ts`)

The hourly sweep already flips ACTIVE→EXPIRED and releases/stops bots but sends no
message. For each expiring subscription, **before** `update`/`releaseAssignment`/
`stopBot` (so an OWNED bot is still running when we send):

1. Resolve the user's onboarded `ZaloUser` rows
   (`where: { userId, isOnboarded: true }`, include `botConfig.botToken`).
2. Build a persona-flavored expiry message (AI + fallback) and append the upgrade
   link. Neutral wording ("Gói của bạn đã hết hạn. Gia hạn để tiếp tục: <link>") so
   it is correct for both POOL and OWNED users (we don't promise free access that
   OWNED users won't have after their bot stops).
3. Send to each onboarded ZaloUser, **best-effort** (each send wrapped in try/catch;
   a failure is logged and never blocks the status transition or bot stop).

Idempotency is inherent: the status flips to EXPIRED in the same sweep iteration, so
the subscription is never re-selected.

## Shared helper

`utils/upgrade-link.ts`:

```ts
export const upgradeUrl = () => `${env.FRONTEND_URL}/pricing`;
export const appendUpgradeLink = (text: string) =>
  `${text}\n\n👉 Nâng cấp để dùng không giới hạn: ${upgradeUrl()}`;
```

Constant in `config/constants.ts`: `FREE_DAILY_MESSAGE_LIMIT = 10`.

## Error handling

- Sending the over-limit notice or expiry notice never throws into the caller: all
  Zalo/AI calls are wrapped; failures are logged.
- The counter `upsert` is the only DB write on the hot path for non-ACTIVE users; it
  is a single indexed upsert. ACTIVE users incur one extra indexed `findUnique` per
  message (status lookup) and no write.
- If the AI personalization fails, the static fallback text is used; the link is
  always appended deterministically.

## Testing

Unit tests mirror `reminder.service.test.ts` (mocked `prisma`, `aiService`,
`zaloApi`):

`usage.service.test.ts`
- ACTIVE subscription → `{ blocked: false }`, no `upsert`, no `findUnique` on usage.
- counts 1..10 → not blocked.
- count 11 → blocked, claim succeeds, one `sendMessage` whose text contains
  `/pricing`.
- count 12 → blocked, claim returns 0, no second `sendMessage`.
- AI failure → fallback text still sent with the link appended.

`subscription-expiry.service.test.ts`
- an expiring sub triggers `sendMessage` to each onboarded ZaloUser, with the link,
  and the send happens before `stopBot` for an OWNED owner.
- a send failure does not prevent the status update / `releaseAssignment` / `stopBot`.

## Out of scope (possible follow-ups)

- Admin-portal UI for free-tier usage stats.
- Pre-expiry "N days left" warnings.
- Changing OWNED-bot lifecycle to keep running in free mode after expiry.
