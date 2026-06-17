# Migrate users from broken personal bots to the shared pool

**Date:** 2026-06-17
**Status:** Approved (design)

## Problem

Some users connected a **personal (OWNED) bot** whose Zalo bot token frequently
dies — `getMe` returns **HTTP 401 Unauthorized**. When the token is dead the bot
can neither receive nor send messages, so the user is silently stranded. We
cannot even notify them through that bot (sending requires a live token).

We want a low-friction way to move an affected user onto a **shared POOL bot**
(which is centrally maintained and stable), **without losing any of their data**,
ideally by clicking a single link.

## Key facts (current system)

- All user data — `Transaction`, `Budget`, `Receipt`, `Persona`, `Subscription`
  — is keyed by `User.id`. **Switching bots preserves all data**; only the
  Zalo→app channel changes.
- `BotConfig.userId` is unique & optional: OWNED bots set `userId` = owner;
  POOL bots have `userId = null`, `kind = POOL`, a `capacity`, and the optional
  presentational fields `botLink` and `qrImageUrl`.
- `BotAssignment` (unique per `userId`) links a user to a pool bot with a unique
  `linkCode` (`PENNY-XXXX`) and `status` `PENDING_LINK` → `LINKED`.
- `ZaloUser` maps `(zaloUserId, botConfigId) → userId`. It has **no Prisma FK**
  to `BotConfig` (loose `botConfigId` string), so deleting a `BotConfig` does
  **not** cascade-delete `ZaloUser`/`ConversationState`.
- Pool infrastructure already exists in `bot-pool.service.ts`:
  `assignBotToUser` (idempotent, least-loaded bot, creates `PENDING_LINK` +
  `linkCode`, returns `null` when the pool is full), `poolHasCapacity`,
  `releaseAssignment`.
- Linking already works in `message-handler/link.ts` `tryLinkPoolUser`: an
  unlinked Zalo account sends its `linkCode` to a pool bot → creates
  `ZaloUser(pool) → userId` and flips the assignment to `LINKED`.
- `GET /api/bot/status` already returns `pool: { status, linkCode, botLink,
  qrImageUrl, label }` for pool users.

## Hard constraint

To bind a user's Zalo account to the new pool bot, the backend must learn that
user's `zaloUserId` on that bot — which it only sees **when the user sends a
message to the pool bot**. Therefore a fully zero-action switch is not possible
via the baseline mechanism: the minimum is **open the pool bot chat → send the
link code once**. The UX goal is "tap one link → code pre-filled → tap Send".

(There is an optional optimization that removes even the code step — see
"Optional enhancement: pre-map" — but it depends on an unverified Zalo property
and is out of scope for the baseline.)

## Approach (chosen: A)

Reuse the existing pool + `linkCode` + deep-link machinery. Add a dashboard
banner shown **only to users whose OWNED bot is currently failing** (`getMe`
401), plus one new endpoint that moves them onto a pool bot and returns the
deep link + code.

## Design

### 1. Detect a broken personal bot

- Extend `GET /api/bot/status`: when the user has an **OWNED** `BotConfig`, call
  `zaloApi.getMe(botToken)`.
  - Success → `ownedBotHealthy: true`.
  - Throws `ZaloApiError` with `errorCode === 401` → `ownedBotHealthy: false`.
  - Other errors (network, 5xx, timeout) → treat as **healthy/unknown**
    (`ownedBotHealthy: true`) to avoid false "your bot is broken" banners on a
    transient blip.
- **Cache** the health result in-memory per `botConfigId` with a short TTL
  (60s) so polling `botStatus` does not hammer the Zalo API. Cache lives in a
  small module (`bot-health.service.ts`): `getOwnedBotHealth(botConfigId,
  token)`.
- `botStatus` response gains: `ownedBotHealthy: boolean` (only meaningful when
  `config` is an OWNED bot).

### 2. Migration endpoint — `POST /api/bot/migrate-to-pool`

Auth required (same `authMiddleware` as the rest of `bot.route.ts`).

Steps (order chosen so a full pool never strands the user):

1. Load the caller's `BotConfig`. If none, or `kind !== OWNED` → `400` ("no
   personal bot to migrate").
2. **Guard**: confirm the bot is actually broken — `getMe` must throw 401.
   - If `getMe` succeeds → `409` ("bot vẫn hoạt động bình thường") unless the
     request passes `force: true` (lets a user opt in even if momentarily
     healthy). Default UI does not send `force`.
3. `assignBotToUser(userId)`:
   - Returns `null` → pool full → `409` ("Hiện đã đủ người dùng, vui lòng thử
     lại sau") and **leave the OWNED bot untouched**.
   - Returns an assignment → continue.
4. Deactivate the old OWNED bot: `botManager.stopBot(config.id)`, set
   `BotConfig.isActive = false`, best-effort `zaloApi.deleteWebhook` (will fail
   on the dead token — ignore). The OWNED `BotConfig` row is **kept** (inactive)
   for audit; it is no longer the user's active channel.
5. Respond `{ ok: true, pool: { botConfigId, label, botLink, qrImageUrl,
   linkCode, status } }`.

Idempotent: if a `BotAssignment` already exists for the user, return it (step 3
is already idempotent) without re-deactivating.

### 3. `botStatus` precedence

A migrated user transiently has both an inactive OWNED `BotConfig` and a pool
`BotAssignment`. Update `botStatus` so that **when a `BotAssignment` exists it is
the primary connection** regardless of a lingering inactive OWNED config:

- If `botAssignment` exists → report the pool connection (`pool: {...}`,
  `running` derived from assignment `LINKED`), and mark `migratedFromOwned:
  true` when an inactive OWNED config also exists.
- Else fall back to the current OWNED/`config` logic.

### 4. Frontend (dashboard)

- When `botStatus` returns an OWNED config with `ownedBotHealthy === false`,
  show a prominent banner: **"Bot cá nhân của bạn đang lỗi (token hết hạn).
  Chuyển sang bot dùng chung ổn định — dữ liệu của bạn được giữ nguyên."** with
  a button **"Chuyển sang bot mới"**.
- Button → `POST /api/bot/migrate-to-pool`. On success, render the existing
  pool-connect view (reuse the component that already shows `botLink` + QR +
  `linkCode` for free/pool users):
  - A primary **"Mở bot trên Zalo"** link/button → `botLink` (deep link). Where
    Zalo supports a pre-filled message, append the `linkCode` so the chat opens
    with the code ready to send; otherwise show the code big with a **Copy**
    button and "dán & gửi mã này cho bot".
  - QR fallback for desktop users.
- The view polls `GET /api/bot/status`; when `pool.status === "LINKED"` it shows
  **"Đã chuyển sang bot mới thành công 🎉"**.
- On `409` pool-full → friendly "hết chỗ, thử lại sau" message.

### 5. Optional enhancement: pre-map (out of baseline scope)

If a user's Zalo `from.id` is the **same value across different bots** (to be
verified empirically — Zalo Bot Platform is Telegram-like, where it is global),
then at migration time we already know the user's `zaloUserId` from their
existing OWNED `ZaloUser` row. We could pre-create `ZaloUser(pool)` with that id
+ flip the assignment to `LINKED` immediately, so the user only opens the new
bot and says anything (no code). This is a follow-up: gated behind a one-off
verification task; if the id is per-bot scoped, drop it and keep the baseline.

## Error handling

- Dead token during migration → expected; `getMe` 401 is the trigger, not an
  error. `deleteWebhook` failures are swallowed (logged at warn).
- Pool full → `409`, OWNED bot untouched, user can retry later.
- Zalo health check transient failure → treated as healthy (no false banner).
- Re-clicking migrate after assignment exists → idempotent, returns existing
  pool info.

## Testing

- `migrate-to-pool`: (a) healthy bot → `409` without `force`; (b) broken bot +
  pool capacity → assignment created, OWNED bot deactivated, returns
  botLink/linkCode; (c) broken bot + pool full → `409`, OWNED bot still active;
  (d) idempotent second call returns same assignment.
- `botStatus`: OWNED + 401 health → `ownedBotHealthy=false`; assignment present
  → pool reported as primary even with inactive OWNED config.
- `bot-health.service`: caches within TTL (one Zalo call per window); maps
  401→unhealthy, other errors→healthy.

## Out of scope

- Reaching users through any non-web channel (email/SMS/Zalo OA broadcast).
- Auto-migrating without user action.
- Renewing/repairing the dead personal bot token.
- Bulk/admin-initiated migration of many users at once (this is user-initiated
  from their own dashboard).
