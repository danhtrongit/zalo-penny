# Migrate users from broken personal bots to the shared pool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user whose personal (OWNED) Zalo bot has a dead token switch to a shared POOL bot from the dashboard with one click, preserving all their data.

**Architecture:** Reuse the existing pool/`linkCode`/deep-link machinery. Add (1) an in-memory-cached health check for OWNED bots, (2) a `POST /api/bot/migrate-to-pool` endpoint that assigns a pool bot and deactivates the dead OWNED bot, (3) `botStatus` fields + precedence so a pool assignment wins over a lingering inactive OWNED config, and (4) a dashboard banner that triggers migration and reuses the `StepConnectPool` component to finish linking.

**Tech Stack:** Node 22, TypeScript (strict), Express, Prisma (Postgres), Vitest (backend tests, `vi.hoisted` mocks), React + Vite (frontend), Tailwind/shadcn UI, axios wrapper `@/lib/api`.

## Global Constraints

- All user data is keyed by `User.id`; switching bots must NOT touch `Transaction`/`Budget`/`Receipt`/`Persona`/`Subscription`.
- User-facing copy is Vietnamese.
- Backend test pattern: `vi.hoisted(() => ({...}))` + `vi.mock(...)` then import the unit under test; `beforeEach(() => vi.clearAllMocks())`.
- Never return `botToken` in any API response.
- A non-401 / transient Zalo error must be treated as **healthy** (never show a false "bot broken" banner).
- Follow existing file/style conventions; commit after each task.
- Secrets/model come from env; do not hard-code.

---

### Task 1: OWNED bot health service (cached)

**Files:**
- Create: `backend/src/services/bot-health.service.ts`
- Test: `backend/src/services/bot-health.service.test.ts`

**Interfaces:**
- Consumes: `getMe`, `ZaloApiError` from `../utils/zalo-api`.
- Produces:
  - `getOwnedBotHealth(botConfigId: string, botToken: string): Promise<boolean>` — `true` = healthy/unknown, `false` = token dead (401). Cached 60s per `botConfigId`.
  - `clearBotHealthCache(): void` — test/util helper.

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/services/bot-health.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { getMe } = vi.hoisted(() => ({ getMe: vi.fn() }));
vi.mock("../utils/zalo-api", async () => {
  const actual = await vi.importActual<typeof import("../utils/zalo-api")>("../utils/zalo-api");
  return { ...actual, getMe: (...a: unknown[]) => getMe(...a) };
});

import { getOwnedBotHealth, clearBotHealthCache } from "./bot-health.service";
import { ZaloApiError } from "../utils/zalo-api";

beforeEach(() => {
  vi.clearAllMocks();
  clearBotHealthCache();
});

describe("getOwnedBotHealth", () => {
  it("returns true and caches when getMe succeeds (one Zalo call per window)", async () => {
    getMe.mockResolvedValue({ id: "bot" });
    expect(await getOwnedBotHealth("bc1", "tok")).toBe(true);
    expect(await getOwnedBotHealth("bc1", "tok")).toBe(true);
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  it("returns false when getMe throws 401", async () => {
    getMe.mockRejectedValue(new ZaloApiError("getMe", 401, "Unauthorized", 200));
    expect(await getOwnedBotHealth("bc2", "tok")).toBe(false);
  });

  it("treats a non-401 error as healthy (no false alarm)", async () => {
    getMe.mockRejectedValue(new Error("network down"));
    expect(await getOwnedBotHealth("bc3", "tok")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/bot-health.service.test.ts`
Expected: FAIL — cannot import `./bot-health.service` (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/services/bot-health.service.ts
import * as zaloApi from "../utils/zalo-api";
import { ZaloApiError } from "../utils/zalo-api";

interface CacheEntry {
  healthy: boolean;
  expiresAt: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * True when the OWNED bot's token is usable (getMe succeeds), false only on a
 * definitive 401. Transient/other errors return true so we never show a false
 * "your bot is broken" banner. Cached per botConfigId for TTL_MS to avoid
 * hammering Zalo from the polled botStatus endpoint.
 */
export async function getOwnedBotHealth(
  botConfigId: string,
  botToken: string
): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(botConfigId);
  if (hit && hit.expiresAt > now) return hit.healthy;

  let healthy = true;
  try {
    await zaloApi.getMe(botToken);
    healthy = true;
  } catch (err) {
    healthy = !(err instanceof ZaloApiError && err.errorCode === 401);
  }

  cache.set(botConfigId, { healthy, expiresAt: now + TTL_MS });
  return healthy;
}

export function clearBotHealthCache(): void {
  cache.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/bot-health.service.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/bot-health.service.ts backend/src/services/bot-health.service.test.ts
git commit -m "feat(bot): cached OWNED bot health check (getMe 401 => unhealthy)"
```

---

### Task 2: `botStatus` — expose `ownedBotHealthy` + pool precedence

**Files:**
- Modify: `backend/src/controllers/bot.controller.ts` (the `botStatus` export)
- Test: `backend/src/controllers/bot.controller.status.test.ts` (create)

**Interfaces:**
- Consumes: `getOwnedBotHealth` (Task 1); existing `assignBotToUser`, `botManager.*`.
- Produces: `GET /api/bot/status` response now also returns `ownedBotHealthy: boolean` and `migratedFromOwned: boolean`; when a `BotAssignment` exists it is the primary connection (`pool` set, `running` = `LINKED`).

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/controllers/bot.controller.status.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, healthMock, mgr } = vi.hoisted(() => ({
  prismaMock: {
    botConfig: { findUnique: vi.fn() },
    botAssignment: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
  healthMock: vi.fn(),
  mgr: { getBotRuntimeMode: vi.fn(() => "webhook"), getBotWebhookUrl: vi.fn(() => "https://x/api/webhooks/zalo/bc1"), isBotRunning: vi.fn(() => false) },
}));
vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("../services/bot-health.service", () => ({ getOwnedBotHealth: (...a: unknown[]) => healthMock(...a) }));
vi.mock("../services/bot-manager.service", () => mgr);
vi.mock("../services/bot-pool.service", () => ({ assignBotToUser: vi.fn() }));

import { botStatus } from "./bot.controller";

function mockRes() { return { json: vi.fn() } as never; }
const req = { userId: "u1" } as never;
beforeEach(() => vi.clearAllMocks());

describe("botStatus", () => {
  it("reports ownedBotHealthy=false for a dead OWNED bot, without leaking botToken", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", isActive: true, connectedAt: null, createdAt: new Date(), botToken: "secret" });
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    healthMock.mockResolvedValue(false);
    const res = mockRes();
    await botStatus(req, res);
    const body = (res as { json: ReturnType<typeof vi.fn> }).json.mock.calls[0][0];
    expect(body.ownedBotHealthy).toBe(false);
    expect(body.config).not.toHaveProperty("botToken");
    expect(body.pool).toBeNull();
  });

  it("prefers the pool assignment over a lingering inactive OWNED config", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", isActive: false, connectedAt: null, createdAt: new Date(), botToken: "secret" });
    prismaMock.botAssignment.findUnique.mockResolvedValue({ status: "PENDING_LINK", linkCode: "PENNY-AAAA", botConfig: { id: "pool1", label: "P1", qrImageUrl: null, botLink: "https://zalo/pool1" } });
    healthMock.mockResolvedValue(false);
    const res = mockRes();
    await botStatus(req, res);
    const body = (res as { json: ReturnType<typeof vi.fn> }).json.mock.calls[0][0];
    expect(body.migratedFromOwned).toBe(true);
    expect(body.pool).toMatchObject({ status: "PENDING_LINK", linkCode: "PENNY-AAAA", id: "pool1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/controllers/bot.controller.status.test.ts`
Expected: FAIL — `ownedBotHealthy`/`migratedFromOwned` undefined (and possibly `botToken` present).

- [ ] **Step 3: Replace the `botStatus` function**

Add this import near the other service imports at the top of `backend/src/controllers/bot.controller.ts`:

```ts
import { getOwnedBotHealth } from "../services/bot-health.service";
```

Replace the entire existing `export const botStatus = async (req, res) => { ... }` with:

```ts
export const botStatus = async (req: AuthRequest, res: Response) => {
  // Select botToken so we can health-check, but never return it.
  const configRow = await prisma.botConfig.findUnique({
    where: { userId: req.userId! },
    select: { id: true, isActive: true, connectedAt: true, createdAt: true, botToken: true },
  });
  const config = configRow
    ? {
        id: configRow.id,
        isActive: configRow.isActive,
        connectedAt: configRow.connectedAt,
        createdAt: configRow.createdAt,
      }
    : null;

  let ownedBotHealthy = true;
  if (configRow) {
    ownedBotHealthy = await getOwnedBotHealth(configRow.id, configRow.botToken);
  }

  const assignmentSelect = {
    status: true,
    linkCode: true,
    botConfig: { select: { id: true, label: true, qrImageUrl: true, botLink: true } },
  } as const;

  // Pool users don't own a BotConfig — their connection lives on BotAssignment.
  let assignment = await prisma.botAssignment.findUnique({
    where: { userId: req.userId! },
    select: assignmentSelect,
  });

  // Self-heal: a user who paid while the pool was empty/full has no assignment.
  if (!assignment && !config) {
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.userId! },
      select: { status: true },
    });
    if (sub?.status === "ACTIVE") {
      const created = await assignBotToUser(req.userId!);
      if (created) {
        assignment = await prisma.botAssignment.findUnique({
          where: { userId: req.userId! },
          select: assignmentSelect,
        });
      }
    }
  }

  const mode = botManager.getBotRuntimeMode();
  const ownedRunning = config
    ? mode === "webhook"
      ? !!config.isActive
      : botManager.isBotRunning(config.id)
    : false;

  // A BotAssignment, when present, is the primary connection — even if an
  // inactive OWNED config lingers after a migration.
  const running = assignment ? assignment.status === "LINKED" : ownedRunning;

  res.json({
    config,
    running,
    polling: running, // backward compat
    mode,
    ownedBotHealthy,
    migratedFromOwned: !!(assignment && config),
    webhookUrl:
      config && !assignment && mode === "webhook"
        ? botManager.getBotWebhookUrl(config.id)
        : null,
    pool: assignment
      ? { status: assignment.status, linkCode: assignment.linkCode, ...assignment.botConfig }
      : null,
  });
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/controllers/bot.controller.status.test.ts src/controllers/bot.controller.free.test.ts`
Expected: PASS (existing free-bot test still green; new status tests pass).

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/bot.controller.ts backend/src/controllers/bot.controller.status.test.ts
git commit -m "feat(bot): botStatus exposes ownedBotHealthy + prefers pool assignment"
```

---

### Task 3: `POST /api/bot/migrate-to-pool`

**Files:**
- Modify: `backend/src/controllers/bot.controller.ts` (add `migrateToPool`)
- Modify: `backend/src/validators/bot.schema.ts` (add `migrateBotBody`)
- Modify: `backend/src/routes/bot.route.ts` (register route)
- Test: `backend/src/controllers/bot.controller.migrate.test.ts` (create)

**Interfaces:**
- Consumes: `assignBotToUser` (`bot-pool.service`), `botManager.stopBot`, `zaloApi.getMe`/`deleteWebhook`, `ZaloApiError`, `HttpError`, `logger`, `prisma`.
- Produces: `migrateToPool(req, res)` → `POST /api/bot/migrate-to-pool`, body `{ force?: boolean }`, response `{ ok: true, pool: { botConfigId, label, botLink, qrImageUrl, linkCode, status } }`.

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/controllers/bot.controller.migrate.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, assignMock, mgr, zalo } = vi.hoisted(() => ({
  prismaMock: {
    botConfig: { findUnique: vi.fn(), update: vi.fn() },
    botAssignment: { findUnique: vi.fn() },
  },
  assignMock: vi.fn(),
  mgr: { stopBot: vi.fn() },
  zalo: { getMe: vi.fn(), deleteWebhook: vi.fn() },
}));
vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("../services/bot-pool.service", () => ({ assignBotToUser: (...a: unknown[]) => assignMock(...a) }));
vi.mock("../services/bot-manager.service", () => mgr);
vi.mock("../utils/zalo-api", async () => {
  const actual = await vi.importActual<typeof import("../utils/zalo-api")>("../utils/zalo-api");
  return { ...actual, getMe: (...a: unknown[]) => zalo.getMe(...a), deleteWebhook: (...a: unknown[]) => zalo.deleteWebhook(...a) };
});

import { migrateToPool } from "./bot.controller";
import { ZaloApiError } from "../utils/zalo-api";

function mockRes() { return { json: vi.fn() } as never; }
const req = (body: unknown = {}) => ({ userId: "u1", body }) as never;
beforeEach(() => vi.clearAllMocks());

describe("migrateToPool", () => {
  it("400 when the user has no OWNED bot", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    prismaMock.botConfig.findUnique.mockResolvedValue(null);
    await expect(migrateToPool(req(), mockRes())).rejects.toMatchObject({ status: 400 });
  });

  it("409 and leaves the bot untouched when the OWNED bot is still healthy", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", botToken: "tok" });
    zalo.getMe.mockResolvedValue({ id: "bot" }); // healthy
    await expect(migrateToPool(req(), mockRes())).rejects.toMatchObject({ status: 409 });
    expect(assignMock).not.toHaveBeenCalled();
    expect(prismaMock.botConfig.update).not.toHaveBeenCalled();
  });

  it("migrates a dead bot: assigns pool, deactivates OWNED, returns linkCode", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    prismaMock.botConfig.findUnique
      .mockResolvedValueOnce({ id: "bc1", botToken: "tok" }) // initial load
      .mockResolvedValueOnce({ id: "pool1", label: "P1", botLink: "https://zalo/pool1", qrImageUrl: null }); // pool lookup
    zalo.getMe.mockRejectedValue(new ZaloApiError("getMe", 401, "Unauthorized", 200));
    assignMock.mockResolvedValue({ botConfigId: "pool1", linkCode: "PENNY-AAAA", status: "PENDING_LINK" });
    zalo.deleteWebhook.mockResolvedValue(null);
    const res = mockRes();
    await migrateToPool(req(), res);
    expect(mgr.stopBot).toHaveBeenCalledWith("bc1");
    expect(prismaMock.botConfig.update).toHaveBeenCalledWith({ where: { userId: "u1" }, data: { isActive: false } });
    const body = (res as { json: ReturnType<typeof vi.fn> }).json.mock.calls[0][0];
    expect(body).toMatchObject({ ok: true, pool: { botConfigId: "pool1", linkCode: "PENNY-AAAA", status: "PENDING_LINK", botLink: "https://zalo/pool1" } });
  });

  it("409 when the pool is full; OWNED bot NOT deactivated", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", botToken: "tok" });
    zalo.getMe.mockRejectedValue(new ZaloApiError("getMe", 401, "Unauthorized", 200));
    assignMock.mockResolvedValue(null);
    await expect(migrateToPool(req(), mockRes())).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.botConfig.update).not.toHaveBeenCalled();
  });

  it("is idempotent: returns the existing assignment without re-checking health", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue({ botConfigId: "pool1", linkCode: "PENNY-BBBB", status: "LINKED" });
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "pool1", label: "P1", botLink: "https://zalo/pool1", qrImageUrl: null });
    const res = mockRes();
    await migrateToPool(req(), res);
    expect(zalo.getMe).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    const body = (res as { json: ReturnType<typeof vi.fn> }).json.mock.calls[0][0];
    expect(body).toMatchObject({ ok: true, pool: { linkCode: "PENNY-BBBB", status: "LINKED" } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/controllers/bot.controller.migrate.test.ts`
Expected: FAIL — `migrateToPool` is not exported.

- [ ] **Step 3: Implement `migrateToPool`**

Add to the imports at the top of `backend/src/controllers/bot.controller.ts` (alongside existing imports):

```ts
import { ZaloApiError } from "../utils/zalo-api";
```

(`assignBotToUser`, `botManager`, `zaloApi`, `logger`, `HttpError`, `prisma` are already imported in this file.)

Append this function to `backend/src/controllers/bot.controller.ts`:

```ts
/**
 * POST /api/bot/migrate-to-pool — move a user off a dead personal (OWNED) bot
 * onto a shared pool bot. Data is keyed by userId, so nothing is lost. The new
 * pool bot still needs the one-time link code sent on Zalo to finish (returned
 * here so the UI can show it). Idempotent.
 */
export const migrateToPool = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  // Idempotent: already migrated (or already a pool user) → just return it.
  const existing = await prisma.botAssignment.findUnique({
    where: { userId },
    select: { botConfigId: true, linkCode: true, status: true },
  });
  if (existing) {
    const pool = await prisma.botConfig.findUnique({
      where: { id: existing.botConfigId },
      select: { id: true, label: true, botLink: true, qrImageUrl: true },
    });
    res.json({
      ok: true,
      pool: {
        botConfigId: pool?.id,
        label: pool?.label ?? null,
        botLink: pool?.botLink ?? null,
        qrImageUrl: pool?.qrImageUrl ?? null,
        linkCode: existing.linkCode,
        status: existing.status,
      },
    });
    return;
  }

  const config = await prisma.botConfig.findUnique({
    where: { userId },
    select: { id: true, botToken: true },
  });
  if (!config) {
    throw new HttpError(400, "Bạn không có bot cá nhân để chuyển");
  }

  // Guard: only migrate a genuinely broken bot unless the user forces it.
  const force = (req.body as { force?: boolean } | undefined)?.force === true;
  if (!force) {
    let healthy = true;
    try {
      await zaloApi.getMe(config.botToken);
      healthy = true;
    } catch (err) {
      healthy = !(err instanceof ZaloApiError && err.errorCode === 401);
    }
    if (healthy) {
      throw new HttpError(409, "Bot cá nhân vẫn hoạt động bình thường, không cần chuyển");
    }
  }

  // Assign FIRST so a full pool never strands the user (OWNED bot untouched).
  const assignment = await assignBotToUser(userId);
  if (!assignment) {
    throw new HttpError(409, "Hiện đã đủ người dùng, vui lòng thử lại sau");
  }

  // Deactivate the old OWNED bot (kept inactive for audit).
  botManager.stopBot(config.id);
  try {
    await zaloApi.deleteWebhook(config.botToken);
  } catch (err) {
    logger.warn({ err, userId }, "deleteWebhook failed during migration (dead token expected)");
  }
  await prisma.botConfig.update({ where: { userId }, data: { isActive: false } });

  const pool = await prisma.botConfig.findUnique({
    where: { id: assignment.botConfigId },
    select: { id: true, label: true, botLink: true, qrImageUrl: true },
  });
  res.json({
    ok: true,
    pool: {
      botConfigId: pool?.id,
      label: pool?.label ?? null,
      botLink: pool?.botLink ?? null,
      qrImageUrl: pool?.qrImageUrl ?? null,
      linkCode: assignment.linkCode,
      status: assignment.status,
    },
  });
};
```

- [ ] **Step 4: Add validator**

In `backend/src/validators/bot.schema.ts`, append:

```ts
export const migrateBotBody = z.object({
  force: z.boolean().optional(),
});

export type MigrateBotInput = z.infer<typeof migrateBotBody>;
```

- [ ] **Step 5: Register the route**

In `backend/src/routes/bot.route.ts`: add `migrateToPool` to the controller import, `migrateBotBody` to the validator import, and register the route after `/free`:

```ts
import {
  connectBot,
  disconnectBot,
  botStatus,
  verifyBotOwnership,
  claimFreeBot,
  migrateToPool,
} from "../controllers/bot.controller";
import { connectBotBody, verifyBotBody, migrateBotBody } from "../validators/bot.schema";

// ...after router.post("/free", ...)
router.post("/migrate-to-pool", validate({ body: migrateBotBody }), asyncHandler(migrateToPool));
```

- [ ] **Step 6: Run tests + typecheck**

Run: `cd backend && npx vitest run src/controllers/bot.controller.migrate.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (5 passed) and typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/bot.controller.ts backend/src/validators/bot.schema.ts backend/src/routes/bot.route.ts backend/src/controllers/bot.controller.migrate.test.ts
git commit -m "feat(bot): POST /api/bot/migrate-to-pool to move dead-bot users onto the pool"
```

---

### Task 4: Dashboard banner + one-click switch (frontend)

**Files:**
- Modify: `frontend/src/pages/dashboard/settings.tsx`

**Interfaces:**
- Consumes: `GET /api/bot/status` (now returns `ownedBotHealthy`, `migratedFromOwned`, `pool`), `POST /api/bot/migrate-to-pool`; reuses `@/components/onboarding/step-connect-pool` `StepConnectPool` (`onLinked` callback; polls status and renders QR + linkCode + "Mở chat với bot").
- Produces: UI only.

- [ ] **Step 1: Extend the bot status type + state**

In `settings.tsx`, update the `botStatus` state type to include the new fields, and add migrating state. Find the `useState<{ config: any; ... }>` declaration and replace its type with:

```ts
const [botStatus, setBotStatus] = useState<{
  config: any;
  running: boolean;
  polling: boolean;
  mode: string;
  ownedBotHealthy?: boolean;
  migratedFromOwned?: boolean;
  pool?: PoolStatus;
} | null>(null);
const [migrating, setMigrating] = useState(false);
```

Add the import for the reusable component near the other imports:

```ts
import { StepConnectPool } from "@/components/onboarding/step-connect-pool";
```

- [ ] **Step 2: Add the migrate handler**

Add near `handleDisconnectBot`:

```ts
const refetchStatus = async () => setBotStatus((await api.get("/bot/status")).data);

const handleMigrate = async () => {
  setMigrating(true);
  try {
    await api.post("/bot/migrate-to-pool");
    toast.success("Đã tạo kết nối bot mới. Hãy gửi mã liên kết trên Zalo để hoàn tất.");
    await refetchStatus();
  } catch (err) {
    toast.error(parseApiError(err, "Không thể chuyển bot"));
    setMigrating(false);
  }
};
```

- [ ] **Step 3: Render the banner + switch view**

Inside the Bot Connection card, BEFORE the existing `botStatus?.pool ? (...)` branch, add the broken-bot banner (shows only for a dead OWNED bot with no pool yet):

```tsx
{botStatus?.config && botStatus.ownedBotHealthy === false && !botStatus.pool && !migrating && (
  <div className="space-y-2 rounded-xl border-2 border-red-300 bg-red-50 p-4">
    <div className="flex items-center gap-2 text-red-700">
      <WifiOff className="size-4" />
      <p className="text-sm font-semibold">Bot cá nhân của bạn đang lỗi (token hết hạn)</p>
    </div>
    <p className="text-xs text-red-700/80">
      Chuyển sang bot dùng chung ổn định — toàn bộ dữ liệu chi tiêu của bạn được giữ nguyên.
    </p>
    <Button size="sm" onClick={handleMigrate}>Chuyển sang bot mới</Button>
  </div>
)}
```

Then, so the migrated user can finish linking (and to give pool users the full QR + code + open-link + auto-poll UI), render `StepConnectPool` whenever there is a non-LINKED pool assignment OR a migration was just triggered. Replace the existing pool `PENDING_LINK` (else) branch — the block that currently renders the static "Chưa liên kết bot / Quét QR và gửi mã liên kết..." message — with:

```tsx
<StepConnectPool onLinked={refetchStatus} />
```

(Keep the `pool.status === "LINKED"` branch — "Bot được cấp đang hoạt động" — unchanged.)

- [ ] **Step 4: Typecheck + lint + build**

Run: `cd frontend && npx tsc -b && npm run lint && npm run build`
Expected: no type errors, lint clean, build succeeds.

- [ ] **Step 5: Manual smoke test (document result)**

With backend running and a test user whose OWNED `BotConfig.botToken` is a dead token:
1. Open dashboard → Settings. Expect the red "Bot cá nhân của bạn đang lỗi" banner.
2. Click "Chuyển sang bot mới". Expect a pool bot to be assigned and the `StepConnectPool` view (QR + `PENNY-XXXX` + "Mở chat với bot") to appear.
3. From the test Zalo account, open the pool bot and send the link code. Expect the view to flip to "Bot được cấp đang hoạt động" within ~3s (polling).
4. Confirm prior transactions/budgets are still visible on the dashboard (data preserved).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/dashboard/settings.tsx
git commit -m "feat(dashboard): broken-bot banner + one-click switch to pool bot"
```

---

## Self-Review

**Spec coverage:**
- Detect broken bot → Task 1 (health service) + Task 2 (`ownedBotHealthy`). ✓
- `POST /api/bot/migrate-to-pool` with guard/capacity/deactivate → Task 3. ✓
- `botStatus` precedence (`migratedFromOwned`, pool wins) → Task 2. ✓
- Frontend banner + reuse pool-connect UI + poll to LINKED → Task 4. ✓
- Data preserved (keyed by userId; we only touch BotConfig/BotAssignment) → no task modifies user data. ✓
- Optional pre-map enhancement → explicitly out of baseline scope (spec §5); not planned. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full code. ✓

**Type consistency:** `getOwnedBotHealth(botConfigId, botToken)` defined in Task 1 and consumed identically in Task 2; `migrateToPool` response `pool.{botConfigId,label,botLink,qrImageUrl,linkCode,status}` matches the frontend `PoolStatus`/`StepConnectPool` `PoolInfo` shape (`status`, `linkCode`, `id`/`botConfigId`, `botLink`, `qrImageUrl`). Note: `StepConnectPool` reads `data.pool` from `/bot/status` (which uses `id`), independent of the migrate response. ✓
