# Admin Delete User Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin permanently delete a USER account and every row of their data, with safeguards and an audit record.

**Architecture:** A transactional `deleteUserCompletely(userId)` service erases all child rows in FK-safe order (after best-effort bot/webhook teardown); a `DELETE /api/admin/users/:id` controller enforces safeguards (no self, no ADMIN) and writes a `USER_DELETE` audit log; the Vue admin portal adds a danger-zone delete button gated behind typing the user's phone.

**Tech Stack:** Node 22, TypeScript (strict), Express, Prisma (Postgres), Vitest (backend, `vi.hoisted` mocks); Vue 3 + Naive UI + axios admin portal.

## Global Constraints

- Hard delete: permanently remove the User and ALL data (incl. Subscription/Payment/SubscriptionAudit). No anonymize mode.
- Only `role = USER` accounts may be deleted: deleting self → 400; deleting an ADMIN → 400.
- Never return `botToken` in any response.
- Side-effect failures (stopBot/deleteWebhook on a dead token) are swallowed + logged at warn; they never block the DB deletion.
- The whole DB cascade is one `prisma.$transaction` — atomic (all-or-nothing).
- User-facing copy is Vietnamese.
- Backend test pattern: `vi.hoisted` + `vi.mock` then import unit; `beforeEach(() => vi.clearAllMocks())`.
- `logAdminAction({ adminId, action, payload, summary })` is the audit API; `userIdParams` validator already exists.

---

### Task 1: Add `USER_DELETE` audit action + migration

**Files:**
- Modify: `backend/prisma/schema.prisma` (the `AdminAction` enum)
- Create: `backend/prisma/migrations/20260617120000_add_user_delete_action/migration.sql`

**Interfaces:**
- Produces: the `AdminAction.USER_DELETE` enum value, usable as `action: "USER_DELETE"` in `logAdminAction`.

- [ ] **Step 1: Add the enum value**

In `backend/prisma/schema.prisma`, the `AdminAction` enum currently ends with `BOT_DELETE`. Add `USER_DELETE` as the final value:

```prisma
enum AdminAction {
  USER_LOCK
  USER_UNLOCK
  USER_ROLE_CHANGE
  PLAN_CREATE
  PLAN_UPDATE
  PLAN_DELETE
  SUBSCRIPTION_MANUAL_UPGRADE
  SUBSCRIPTION_CANCEL
  NOTIFICATION_BROADCAST
  BOT_CREATE
  BOT_UPDATE
  BOT_DELETE
  USER_DELETE
}
```

- [ ] **Step 2: Create the migration SQL**

Create `backend/prisma/migrations/20260617120000_add_user_delete_action/migration.sql` with exactly:

```sql
-- AlterEnum
ALTER TYPE "AdminAction" ADD VALUE 'USER_DELETE';
```

- [ ] **Step 3: Regenerate the Prisma client (no DB needed)**

Run: `cd backend && npx prisma generate`
Expected: "Generated Prisma Client" success. (The client now includes `USER_DELETE`.)

- [ ] **Step 4: Typecheck**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260617120000_add_user_delete_action
git commit -m "feat(db): add USER_DELETE admin audit action"
```

> Deploy note (not a code step): `npx prisma migrate deploy` (or applying the ALTER TYPE) must run against the production DB before the new controller is used — captured in the deploy phase, not here.

---

### Task 2: `deleteUserCompletely` service

**Files:**
- Create: `backend/src/services/user-deletion.service.ts`
- Test: `backend/src/services/user-deletion.service.test.ts`

**Interfaces:**
- Consumes: `prisma`, `botManager.stopBot(botConfigId: string): void`, `zaloApi.deleteWebhook(token)`, `logger`.
- Produces: `deleteUserCompletely(userId: string): Promise<Record<string, number>>` — returns per-table deletion counts (keys: `payments, subscriptions, subscriptionAudits, transactions, receipts, budgets, personas, dailyUsage, reminderLogs, botAssignments, zaloUsers, conversationStates, botConfigs, user`).

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/services/user-deletion.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, tx, mgr, zalo } = vi.hoisted(() => {
  const del = (count: number) => vi.fn().mockResolvedValue({ count });
  const tx = {
    payment: { deleteMany: del(1) },
    subscription: { deleteMany: del(1) },
    subscriptionAudit: { deleteMany: del(2) },
    transaction: { deleteMany: del(9) },
    receipt: { deleteMany: del(3) },
    budget: { deleteMany: del(4) },
    persona: { deleteMany: del(1) },
    dailyUsage: { deleteMany: del(7) },
    reminderLog: { deleteMany: del(5) },
    botAssignment: { deleteMany: del(1) },
    zaloUser: { deleteMany: del(2) },
    conversationState: { deleteMany: del(6) },
    botConfig: { deleteMany: del(1) },
    user: { delete: vi.fn().mockResolvedValue({ id: "u1" }) },
  };
  const prismaMock = {
    botConfig: { findUnique: vi.fn() },
    zaloUser: { findMany: vi.fn() },
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  const mgr = { stopBot: vi.fn() };
  const zalo = { deleteWebhook: vi.fn() };
  return { prismaMock, tx, mgr, zalo };
});
vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("./bot-manager.service", () => mgr);
vi.mock("../utils/zalo-api", async () => {
  const actual = await vi.importActual<typeof import("../utils/zalo-api")>("../utils/zalo-api");
  return { ...actual, deleteWebhook: (...a: unknown[]) => zalo.deleteWebhook(...a) };
});

import { deleteUserCompletely } from "./user-deletion.service";

beforeEach(() => vi.clearAllMocks());

describe("deleteUserCompletely", () => {
  it("tears down the OWNED bot and deletes every table, returning counts", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", botToken: "tok" });
    prismaMock.zaloUser.findMany.mockResolvedValue([{ zaloUserId: "z1", botConfigId: "bc1" }]);
    zalo.deleteWebhook.mockResolvedValue(null);

    const counts = await deleteUserCompletely("u1");

    expect(mgr.stopBot).toHaveBeenCalledWith("bc1");
    expect(zalo.deleteWebhook).toHaveBeenCalledWith("tok");
    expect(tx.transaction.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(tx.payment.deleteMany).toHaveBeenCalledWith({ where: { subscription: { userId: "u1" } } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(counts).toMatchObject({ transactions: 9, receipts: 3, budgets: 4, zaloUsers: 2, conversationStates: 6, user: 1 });
  });

  it("skips bot teardown when the user has no OWNED bot, and still deletes data", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue(null);
    prismaMock.zaloUser.findMany.mockResolvedValue([]);
    const counts = await deleteUserCompletely("u1");
    expect(mgr.stopBot).not.toHaveBeenCalled();
    expect(zalo.deleteWebhook).not.toHaveBeenCalled();
    // No bot and no zalo rows → conversationState delete is skipped (count 0, deleteMany not called)
    expect(tx.conversationState.deleteMany).not.toHaveBeenCalled();
    expect(counts.conversationStates).toBe(0);
    expect(counts.user).toBe(1);
  });

  it("does not let a deleteWebhook failure block the deletion", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", botToken: "dead" });
    prismaMock.zaloUser.findMany.mockResolvedValue([]);
    zalo.deleteWebhook.mockRejectedValue(new Error("401"));
    const counts = await deleteUserCompletely("u1");
    expect(tx.user.delete).toHaveBeenCalled();
    expect(counts.user).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/user-deletion.service.test.ts`
Expected: FAIL — cannot import `./user-deletion.service`.

- [ ] **Step 3: Implement the service**

```ts
// backend/src/services/user-deletion.service.ts
import prisma from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import * as botManager from "./bot-manager.service";
import * as zaloApi from "../utils/zalo-api";
import { logger } from "../utils/logger";

/**
 * Permanently delete a user and ALL of their data. Bot/webhook teardown runs
 * best-effort outside the transaction (a dead token must not block deletion);
 * every table is then deleted in FK-safe order inside a single transaction.
 * Returns the number of rows removed per table.
 */
export async function deleteUserCompletely(
  userId: string
): Promise<Record<string, number>> {
  const ownedBot = await prisma.botConfig.findUnique({
    where: { userId },
    select: { id: true, botToken: true },
  });
  if (ownedBot) {
    botManager.stopBot(ownedBot.id);
    try {
      await zaloApi.deleteWebhook(ownedBot.botToken);
    } catch (err) {
      logger.warn({ err, userId }, "deleteWebhook failed during user deletion (ignored)");
    }
  }

  // ConversationState has no userId column — clean it by the user's
  // (zaloUserId, botConfigId) pairs, gathered before we delete ZaloUser.
  const zaloRows = await prisma.zaloUser.findMany({
    where: { userId },
    select: { zaloUserId: true, botConfigId: true },
  });

  return prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {};
    counts.payments = (await tx.payment.deleteMany({ where: { subscription: { userId } } })).count;
    counts.subscriptions = (await tx.subscription.deleteMany({ where: { userId } })).count;
    counts.subscriptionAudits = (await tx.subscriptionAudit.deleteMany({ where: { userId } })).count;
    counts.transactions = (await tx.transaction.deleteMany({ where: { userId } })).count;
    counts.receipts = (await tx.receipt.deleteMany({ where: { userId } })).count;
    counts.budgets = (await tx.budget.deleteMany({ where: { userId } })).count;
    counts.personas = (await tx.persona.deleteMany({ where: { userId } })).count;
    counts.dailyUsage = (await tx.dailyUsage.deleteMany({ where: { userId } })).count;
    counts.reminderLogs = (await tx.reminderLog.deleteMany({ where: { userId } })).count;
    counts.botAssignments = (await tx.botAssignment.deleteMany({ where: { userId } })).count;
    counts.zaloUsers = (await tx.zaloUser.deleteMany({ where: { userId } })).count;

    const orConds: Prisma.ConversationStateWhereInput[] = zaloRows.map((z) => ({
      zaloUserId: z.zaloUserId,
      botConfigId: z.botConfigId,
    }));
    if (ownedBot) orConds.push({ botConfigId: ownedBot.id });
    counts.conversationStates = orConds.length
      ? (await tx.conversationState.deleteMany({ where: { OR: orConds } })).count
      : 0;

    counts.botConfigs = (await tx.botConfig.deleteMany({ where: { userId } })).count;
    await tx.user.delete({ where: { id: userId } });
    counts.user = 1;
    return counts;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/user-deletion.service.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/user-deletion.service.ts backend/src/services/user-deletion.service.test.ts
git commit -m "feat(admin): deleteUserCompletely service (FK-safe cascade + bot teardown)"
```

---

### Task 3: `DELETE /api/admin/users/:id` controller + route

**Files:**
- Modify: `backend/src/controllers/admin/users.controller.ts` (add `remove`)
- Modify: `backend/src/routes/admin/users.route.ts` (register DELETE route)
- Test: `backend/src/controllers/admin/users.controller.delete.test.ts` (create)

**Interfaces:**
- Consumes: `deleteUserCompletely` (Task 2), `USER_DELETE` enum (Task 1), `prisma`, `HttpError`, `logAdminAction`.
- Produces: `remove(req, res)` → `DELETE /api/admin/users/:id`, response `{ ok: true, deleted: <counts> }`.

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/controllers/admin/users.controller.delete.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, delMock, auditMock } = vi.hoisted(() => ({
  prismaMock: { user: { findUnique: vi.fn() } },
  delMock: vi.fn(),
  auditMock: vi.fn(),
}));
vi.mock("../../config/prisma", () => ({ default: prismaMock }));
vi.mock("../../services/user-deletion.service", () => ({ deleteUserCompletely: (...a: unknown[]) => delMock(...a) }));
vi.mock("../../services/admin-audit.service", () => ({ logAdminAction: (...a: unknown[]) => auditMock(...a) }));

import { remove } from "./users.controller";

function mockRes() { return { json: vi.fn() } as never; }
const req = (id: string) => ({ params: { id }, userId: "admin1" }) as never;
beforeEach(() => vi.clearAllMocks());

describe("admin users.remove", () => {
  it("404 when the user does not exist (service not called)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(remove(req("ghost"), mockRes())).rejects.toMatchObject({ status: 404 });
    expect(delMock).not.toHaveBeenCalled();
  });

  it("400 when deleting self", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin1", role: "ADMIN", phone: "1", name: "A", email: null });
    await expect(remove(req("admin1"), mockRes())).rejects.toMatchObject({ status: 400 });
    expect(delMock).not.toHaveBeenCalled();
  });

  it("400 when deleting another ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "ADMIN", phone: "2", name: "B", email: null });
    await expect(remove(req("u2"), mockRes())).rejects.toMatchObject({ status: 400 });
    expect(delMock).not.toHaveBeenCalled();
  });

  it("deletes a USER: calls service, audits USER_DELETE, returns counts", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u3", role: "USER", phone: "0900", name: "C", email: "c@x.vn" });
    delMock.mockResolvedValue({ transactions: 5, user: 1 });
    const res = mockRes();
    await remove(req("u3"), res);
    expect(delMock).toHaveBeenCalledWith("u3");
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      adminId: "admin1",
      action: "USER_DELETE",
      payload: expect.objectContaining({ targetUserId: "u3", phone: "0900" }),
    }));
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({ ok: true, deleted: { transactions: 5, user: 1 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/controllers/admin/users.controller.delete.test.ts`
Expected: FAIL — `remove` is not exported.

- [ ] **Step 3: Implement `remove` + register the route**

Add this import to the top of `backend/src/controllers/admin/users.controller.ts` (next to the existing imports):

```ts
import { deleteUserCompletely } from "../../services/user-deletion.service";
```

Append to `backend/src/controllers/admin/users.controller.ts`:

```ts
export const remove = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, phone: true, name: true, email: true },
  });
  if (!user) throw new HttpError(404, "Không tìm thấy người dùng");

  if (id === req.userId) {
    throw new HttpError(400, "Không thể tự xoá tài khoản của chính mình");
  }
  if (user.role === "ADMIN") {
    throw new HttpError(400, "Không thể xoá tài khoản admin. Hãy hạ quyền về USER trước.");
  }

  const counts = await deleteUserCompletely(id);

  await logAdminAction({
    adminId: req.userId!,
    action: "USER_DELETE",
    payload: { targetUserId: id, phone: user.phone, name: user.name, email: user.email, counts },
    summary: `Deleted user ${id} (${user.phone})`,
  });

  res.json({ ok: true, deleted: counts });
};
```

In `backend/src/routes/admin/users.route.ts`, register the DELETE route after the `/:id/role` route (the file already imports `ctrl`, `validate`, `userIdParams`, `asyncHandler`):

```ts
router.delete("/:id", validate({ params: userIdParams }), asyncHandler(ctrl.remove));
```

- [ ] **Step 4: Run tests + typecheck**

Run: `cd backend && npx vitest run src/controllers/admin/users.controller.delete.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (4 passed) and typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/admin/users.controller.ts backend/src/routes/admin/users.route.ts backend/src/controllers/admin/users.controller.delete.test.ts
git commit -m "feat(admin): DELETE /api/admin/users/:id (guarded, audited)"
```

---

### Task 4: Admin portal — danger-zone delete (frontend)

**Files:**
- Modify: `admin/src/pages/UserDetailView.vue`
- Modify: `admin/src/pages/AuditView.vue` (add a `USER_DELETE` action label)

**Interfaces:**
- Consumes: `DELETE /api/admin/users/:id` (Task 3) via `api`; `apiError`, `useMessage` (already used in the file); Naive UI `NModal`/`NInput`/`NButton` (already imported).
- Produces: UI only.

- [ ] **Step 1: Add delete state + handler in `UserDetailView.vue`**

In the `<script setup>` block (after the lock/unlock section), add:

```ts
// Delete user (danger zone)
const showDelete = ref(false);
const deleteConfirmPhone = ref("");
const deleting = ref(false);

function openDelete() {
  deleteConfirmPhone.value = "";
  showDelete.value = true;
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await api.delete(`/admin/users/${userId}`);
    message.success("Đã xoá người dùng và toàn bộ dữ liệu");
    showDelete.value = false;
    router.push("/users");
  } catch (err) {
    message.error(apiError(err, "Không thể xoá người dùng"));
  } finally {
    deleting.value = false;
  }
}
```

- [ ] **Step 2: Add the danger-zone button + confirm modal in the template**

In the template, add a danger-zone button — render it only for `USER` targets (this also hides it for self, since portal users are admins). Place it next to the existing role/lock actions, e.g. after the lock `NButton`:

```vue
<NButton
  v-if="detail && detail.role === 'USER'"
  size="small"
  type="error"
  @click="openDelete"
>
  Xoá người dùng
</NButton>
```

Add the confirm modal near the existing lock modal (`<NModal v-model:show="showLock" ...>`):

```vue
<NModal v-model:show="showDelete" preset="dialog" type="error" title="Xoá người dùng vĩnh viễn">
  <template #default>
    <p>
      Hành động này <strong>không thể hoàn tác</strong>. Toàn bộ dữ liệu của người dùng
      (giao dịch, ngân sách, hoá đơn, hội thoại, bot, gói &amp; thanh toán) sẽ bị xoá.
    </p>
    <p style="margin-top: 8px">
      Nhập số điện thoại <strong>{{ detail?.phone }}</strong> để xác nhận:
    </p>
    <NInput
      v-model:value="deleteConfirmPhone"
      placeholder="Số điện thoại của người dùng"
      style="margin-top: 8px"
    />
  </template>
  <template #action>
    <NButton @click="showDelete = false">Huỷ</NButton>
    <NButton
      type="error"
      :loading="deleting"
      :disabled="deleteConfirmPhone !== detail?.phone"
      @click="confirmDelete"
    >
      Xoá vĩnh viễn
    </NButton>
  </template>
</NModal>
```

- [ ] **Step 3: Add the `USER_DELETE` audit label in `AuditView.vue`**

Find the map/record that renders `AdminAction` values to Vietnamese labels (the object keyed by actions like `USER_LOCK`, `BOT_DELETE`). Add the entry:

```ts
USER_DELETE: "Xoá người dùng",
```

If `AuditView.vue` renders the raw action string with no label map, skip this step and note it in the report (no label map exists).

- [ ] **Step 4: Typecheck + lint + build**

Run: `cd admin && npm run build && npm run lint`
Expected: build succeeds (vue-tsc + vite); lint introduces no NEW errors vs the current baseline (compare against pre-change lint output).

- [ ] **Step 5: Manual smoke test (document result; requires running backend + a USER account)**

1. Open the admin portal → Users → open a USER's detail. Expect a red "Xoá người dùng" button. Open an ADMIN's detail → button absent.
2. Click it → modal appears; the "Xoá vĩnh viễn" button is disabled until the typed phone matches the user's phone.
3. Confirm → user is deleted, success toast, redirect to the user list; the user no longer appears.
4. Open Audit log → a `USER_DELETE` entry appears for the acting admin.

- [ ] **Step 6: Commit**

```bash
git add admin/src/pages/UserDetailView.vue admin/src/pages/AuditView.vue
git commit -m "feat(admin-ui): danger-zone delete user with phone confirmation"
```

---

## Self-Review

**Spec coverage:**
- Endpoint `DELETE /api/admin/users/:id` → Task 3. ✓
- Safeguards (self/admin → 400, 404) → Task 3 + tests. ✓
- `deleteUserCompletely` FK-safe cascade + bot/webhook teardown + pool-slot release (BotAssignment delete) + ConversationState handling → Task 2. ✓
- `USER_DELETE` enum + migration + audit snapshot (phone/name/email/counts) → Task 1 + Task 3. ✓
- Frontend danger-zone button (USER-only) + phone-confirm modal + audit label → Task 4. ✓
- Never return botToken: no task returns it; service selects botToken only for teardown, controller selects only id/role/phone/name/email. ✓
- Atomic transaction → Task 2 uses a single `$transaction`. ✓

**Placeholder scan:** No TBD/TODO; all code steps contain full code. Task 4 Step 3 has a documented conditional ("if no label map, skip + note") — concrete, not a placeholder.

**Type consistency:** `deleteUserCompletely(userId): Promise<Record<string, number>>` defined in Task 2, consumed identically in Task 3; `remove` response `{ ok, deleted: counts }`; audit `action: "USER_DELETE"` matches the enum added in Task 1; `userIdParams` reused from the existing validator. ✓
