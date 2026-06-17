# Admin: delete a user and all their data

**Date:** 2026-06-17
**Status:** Approved (design)

## Problem

Admins can lock/unlock and change roles, but cannot remove a user. We need a way
for an admin to **permanently delete a USER account and every row of their data**
(hard delete), with strong safeguards and an audit record of the deletion.

## Key facts (current system)

- Admin user management lives in `backend/src/controllers/admin/users.controller.ts`
  (list/detail/lock/unlock/changeRole) and `routes/admin/users.route.ts`, behind
  the admin auth middleware. Audit via `logAdminAction` (`admin-audit.service.ts`).
- The Vue admin portal (`admin/src/pages/UserDetailView.vue`, `UsersView.vue`)
  consumes these endpoints.
- **No relation in `schema.prisma` declares `onDelete`** → Prisma/Postgres default
  is RESTRICT. Deleting a `User` with children FAILS unless children are deleted
  first. So deletion must be an explicit, ordered cascade in a transaction.
- Tables referencing a user (directly or transitively):
  - `Subscription` (userId unique) → `Payment` (subscriptionId unique)
  - `Transaction` (userId; also `receiptId` → `Receipt`)
  - `Receipt` (userId), `Budget` (userId), `Persona` (userId unique)
  - `DailyUsage` (userId), `ReminderLog` (userId), `SubscriptionAudit` (userId)
  - `BotConfig` (userId, OWNED only — POOL bots have `userId = null`)
  - `BotAssignment` (userId unique — the user's pool-bot assignment)
  - `ZaloUser` (loose `userId`, no FK — the user's Zalo↔app mappings across bots)
  - `ConversationState` (loose; keyed by `zaloUserId` + `botConfigId`, **no userId column**)
  - `AdminAuditLog` (`adminId`, required, relation "AdminActor") — only ADMINs ever
    have rows here.
- `bot-manager.service.ts` `stopBot(botConfigId)` is synchronous; `zaloApi.deleteWebhook(token)`
  may throw on a dead token.

## Decisions

- **Hard delete** (not anonymize): permanently remove the User and all data listed above,
  including `Subscription`/`Payment`/`SubscriptionAudit`. A single `AdminAuditLog`
  record (created by the acting admin) preserves who/when/what was deleted.
- **Protected accounts:** an admin may delete only `role = USER` accounts.
  - Deleting self → 400.
  - Deleting another `ADMIN` → 400 ("demote to USER first"). Because only ADMINs have
    `AdminAuditLog` rows, restricting deletion to USERs means the `AdminAuditLog.adminId`
    FK is never violated — no audit trail is ever destroyed.
- **Confirmation:** the admin UI requires typing the target user's exact phone number to
  enable the delete action (guards against deleting the wrong row).

## Approach (chosen: A)

A dedicated transactional service `deleteUserCompletely(userId)` performs the ordered
cascade; the controller enforces safeguards and writes the audit record. (Rejected:
adding `onDelete: Cascade` across every relation — too broad a schema/behavior change
for one feature, and it cannot perform the non-DB side effects: stopping the bot,
deleting the Zalo webhook, freeing the pool slot.)

## Design

### 1. Endpoint

`DELETE /api/admin/users/:id` registered in `routes/admin/users.route.ts`,
`validate({ params: userIdParams })`, `asyncHandler(ctrl.remove)`.

### 2. Controller `remove(req, res)`

1. `id = req.params.id`.
2. Load target: `prisma.user.findUnique({ where:{id}, select:{ id, role, phone, name, email } })`.
   - Not found → `HttpError(404, "Không tìm thấy người dùng")`.
3. Safeguards:
   - `id === req.userId` → `HttpError(400, "Không thể tự xoá tài khoản của chính mình")`.
   - `user.role === "ADMIN"` → `HttpError(400, "Không thể xoá tài khoản admin. Hãy hạ quyền về USER trước.")`.
4. `const counts = await deleteUserCompletely(id)`.
5. `logAdminAction({ adminId: req.userId!, action: "USER_DELETE", payload: { targetUserId: id, phone: user.phone, name: user.name, email: user.email, counts }, summary: \`Deleted user ${id} (${user.phone})\` })`.
6. `res.json({ ok: true, deleted: counts })`.

### 3. Service `deleteUserCompletely(userId): Promise<Record<string, number>>`

File: `backend/src/services/user-deletion.service.ts`. One responsibility: erase a user.

Non-DB side effects FIRST (best-effort; never block the delete):
- Load the user's OWNED bot: `prisma.botConfig.findUnique({ where:{userId}, select:{id, botToken} })`.
- If present: `botManager.stopBot(config.id)`; `try { await zaloApi.deleteWebhook(config.botToken) } catch (err) { logger.warn(...) }`.
- Load the user's `ZaloUser` rows (`{ zaloUserId, botConfigId }[]`) — needed to clean
  `ConversationState`, which has no `userId`.

Then a single `prisma.$transaction(async (tx) => { ... })` deleting in this FK-safe order
(children before parents), capturing each `deleteMany` count:
1. `Payment` where `subscription.userId = userId` (via `tx.payment.deleteMany({ where:{ subscription:{ userId } } })`).
2. `Subscription` where `userId`.
3. `SubscriptionAudit` where `userId`.
4. `Transaction` where `userId` (before Receipt — `Transaction.receiptId` → `Receipt`).
5. `Receipt` where `userId`.
6. `Budget` where `userId`.
7. `Persona` where `userId`.
8. `DailyUsage` where `userId`.
9. `ReminderLog` where `userId`.
10. `BotAssignment` where `userId` (frees the pool slot — slot count drops automatically).
11. `ZaloUser` where `userId` (all mappings: OWNED + pool).
12. `ConversationState`: delete rows matching the user's `(zaloUserId, botConfigId)` pairs
    gathered above, plus any where `botConfigId = ownedBotConfigId`.
    (`tx.conversationState.deleteMany({ where:{ OR: [...pairs, { botConfigId: ownedId }] } })`,
    omitting the owned clause when there is no OWNED bot, and skipping entirely when there
    are no pairs and no owned bot.)
13. `BotConfig` where `userId` (the OWNED bot; POOL bots are untouched — they have null userId).
14. `User` where `id = userId`.

Return an object of counts keyed by table (e.g. `{ transactions: 42, receipts: 5, ... , user: 1 }`).

### 4. Schema / audit

- Add `USER_DELETE` to the `AdminAction` enum in `schema.prisma`; run a Prisma migration
  (`npx prisma migrate dev --name add_user_delete_action`, committed). No other schema change.

### 5. Frontend (admin Vue)

- `UserDetailView.vue`: a "Vùng nguy hiểm" section with a red **"Xoá người dùng"** button,
  shown only when the target is `role === "USER"` and not the current admin.
- Clicking opens a confirm modal: warns the action is irreversible and lists what is deleted;
  a text input requires the user's exact phone number; the confirm button is disabled until
  it matches. On confirm → `DELETE /admin/users/:id` → success toast → navigate back to
  `UsersView`. Error → toast with the API message.
- `api.ts`/types: add the `deleteUser(id)` call and a `USER_DELETE` audit-action label where
  audit actions are rendered (`AuditView.vue`).

### 6. Error handling

- 404 unknown user; 400 self / admin target.
- Side-effect failures (stopBot/deleteWebhook on a dead token) are swallowed and logged at
  warn — they never block the DB deletion.
- The whole DB cascade runs in one transaction: if any step fails, nothing is deleted
  (atomic), and the controller surfaces the error.

## Testing

- `user-deletion.service` (mock prisma `$transaction`, `botManager`, `zaloApi`):
  - deletes in the correct FK-safe order; returns per-table counts.
  - calls `stopBot` + `deleteWebhook` when an OWNED bot exists; skips when none.
  - a `deleteWebhook` rejection does not prevent the transaction from running.
  - no OWNED bot and no Zalo rows → ConversationState delete is skipped (no malformed `where`).
- `users.controller.remove` (mock service + prisma + audit):
  - self → 400; ADMIN target → 400; unknown → 404 (service not called).
  - USER target → service called once with the id, audit logged with `USER_DELETE`, 200 `{ ok, deleted }`.

## Out of scope

- Anonymization / soft-delete mode.
- Deleting ADMIN accounts (must be demoted to USER first).
- Bulk / multi-user deletion.
- Retaining financial records (Payment/Subscription) — hard delete removes them; the audit
  snapshot is the only retained trace.
- Exporting the user's data before deletion.
