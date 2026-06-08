# Shared Bot Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép admin tạo sẵn pool bot Zalo, tự động phân phối đều cho user sau khi thanh toán (tối đa 5 user/bot), gán giao dịch đúng người qua bước liên kết QR + mã; giữ luồng tự tạo bot làm tuỳ chọn nâng cao.

**Architecture:** Hướng A — pool bot là `BotConfig kind=POOL` (không chủ, `userId=null`), gán user↔bot qua bảng `BotAssignment` (cap theo `capacity`). Gán giao dịch chuyển từ "theo chủ bot" sang "theo người gửi Zalo" (`ZaloUser(zaloUserId, botConfigId) → userId`); bước liên kết khớp `BotAssignment.linkCode`. Job quét hết hạn giải phóng chỗ.

**Tech Stack:** Backend Express + Prisma (PostgreSQL) + vitest; Frontend React + Vite + TS + axios + shadcn/ui + sonner.

**Spec:** `docs/superpowers/specs/2026-06-08-shared-bot-pool-design.md`

**Lệnh kiểm thử:**
- Backend: `cd backend && npm run typecheck && npm test`
- Frontend: `cd frontend && npm run build`

---

## Phase 1 — Data model

### Task 1: Prisma schema + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Generated: `backend/src/generated/prisma/*` (qua `prisma generate`)

- [ ] **Step 1: Sửa model `BotConfig`** — đổi `userId String` → `userId String? @unique`, thêm các cột; thêm enum + relation.

```prisma
model BotConfig {
  id          String    @id @default(cuid())
  userId      String?   @unique
  kind        BotKind   @default(OWNED)
  label       String?
  botToken    String
  botLink     String?
  qrImageUrl  String?
  capacity    Int       @default(5)
  isActive    Boolean   @default(false)
  connectedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User?           @relation(fields: [userId], references: [id])
  assignments BotAssignment[]

  @@index([kind, isActive])
}

enum BotKind {
  OWNED
  POOL
}

enum AssignmentStatus {
  PENDING_LINK
  LINKED
}

model BotAssignment {
  id               String           @id @default(cuid())
  botConfigId      String
  userId           String           @unique
  status           AssignmentStatus @default(PENDING_LINK)
  linkCode         String           @unique
  linkedZaloUserId String?
  createdAt        DateTime         @default(now())
  linkedAt         DateTime?

  botConfig BotConfig @relation(fields: [botConfigId], references: [id])
  user      User      @relation(fields: [userId], references: [id])

  @@index([botConfigId])
  @@index([status])
}
```

- [ ] **Step 2: Thêm relation vào `User`** — trong `model User { ... }` thêm dòng:

```prisma
  botAssignment BotAssignment?
```

- [ ] **Step 3: Thêm action vào enum `AdminAction`** — thêm 3 dòng:

```prisma
  BOT_CREATE
  BOT_UPDATE
  BOT_DELETE
```

- [ ] **Step 4: Tạo migration + generate client**

Run: `cd backend && npx prisma migrate dev --name shared_bot_pool`
Expected: migration mới tạo trong `prisma/migrations/`, client regen ở `src/generated/prisma`. (Cần DB dev chạy. Nếu không có, dùng `npx prisma migrate diff` để sinh SQL rồi `prisma generate` — xem ghi chú cuối plan.)

- [ ] **Step 5: typecheck**

Run: `cd backend && npm run typecheck`
Expected: PASS (chưa dùng model mới ở đâu nên không lỗi).

- [ ] **Step 6: Commit**

```bash
git add backend/prisma backend/src/generated
git commit -m "feat(db): add bot pool schema (BotConfig.kind/capacity, BotAssignment)"
```

---

## Phase 2 — Pool service (TDD)

### Task 2: `bot-pool.service.ts`

**Files:**
- Create: `backend/src/services/bot-pool.service.ts`
- Test: `backend/src/services/bot-pool.service.test.ts`

Mô tả hàm:
- `generateLinkCode()` → `"PENNY-" + 4 ký tự` từ alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (bỏ ký tự dễ nhầm). Lặp tới khi không trùng `BotAssignment.linkCode`.
- `poolHasCapacity()` → có ít nhất 1 pool bot `isActive` với số assignment < `capacity`.
- `getPoolLoad()` → mảng `{ botConfigId, label, used, capacity, isActive }`.
- `assignBotToUser(userId)` → trong `$transaction`: nếu user đã có assignment → trả về assignment đó (idempotent). Chọn pool bot `isActive`, `used < capacity`, ít `used` nhất, hoà → `createdAt` asc. Không có → `null`. Có → tạo `BotAssignment(PENDING_LINK, linkCode)`.
- `releaseAssignment(userId)` → tìm assignment; nếu có: xoá `ZaloUser` mapping `(linkedZaloUserId, botConfigId)` nếu có, rồi xoá assignment. Trả `boolean` (đã release hay chưa).

- [ ] **Step 1: Viết test (mock prisma)**

```ts
// backend/src/services/bot-pool.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const tx = {
  botConfig: { findMany: vi.fn() },
  botAssignment: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
  zaloUser: { deleteMany: vi.fn() },
};
const prismaMock = {
  $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  botAssignment: tx.botAssignment,
  botConfig: tx.botConfig,
  zaloUser: tx.zaloUser,
};
vi.mock("../config/prisma", () => ({ default: prismaMock }));

import { assignBotToUser, releaseAssignment, poolHasCapacity } from "./bot-pool.service";

beforeEach(() => {
  vi.clearAllMocks();
  tx.botAssignment.findUnique.mockResolvedValue(null);
  tx.botAssignment.findFirst.mockResolvedValue(null);
});

describe("assignBotToUser", () => {
  it("chọn pool bot tải ít nhất, tạo PENDING_LINK", async () => {
    tx.botConfig.findMany.mockResolvedValue([
      { id: "bot-a", label: "A", capacity: 5, createdAt: new Date("2026-01-01"), _count: { assignments: 4 } },
      { id: "bot-b", label: "B", capacity: 5, createdAt: new Date("2026-01-02"), _count: { assignments: 1 } },
    ]);
    tx.botAssignment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "as1", ...data }));
    const result = await assignBotToUser("u1");
    expect(result?.botConfigId).toBe("bot-b");
    expect(result?.status).toBe("PENDING_LINK");
    expect(result?.linkCode).toMatch(/^PENNY-[A-Z0-9]{4}$/);
  });

  it("trả null khi mọi bot đã đầy", async () => {
    tx.botConfig.findMany.mockResolvedValue([
      { id: "bot-a", capacity: 5, createdAt: new Date(), _count: { assignments: 5 } },
    ]);
    expect(await assignBotToUser("u1")).toBeNull();
  });

  it("idempotent: user đã có assignment thì trả lại", async () => {
    tx.botAssignment.findUnique.mockResolvedValue({ id: "as0", userId: "u1", botConfigId: "bot-a", status: "PENDING_LINK", linkCode: "PENNY-AAAA" });
    const r = await assignBotToUser("u1");
    expect(r?.id).toBe("as0");
    expect(tx.botAssignment.create).not.toHaveBeenCalled();
  });
});

describe("releaseAssignment", () => {
  it("xoá zalo mapping + assignment", async () => {
    tx.botAssignment.findUnique.mockResolvedValue({ id: "as1", userId: "u1", botConfigId: "bot-a", linkedZaloUserId: "z1" });
    const ok = await releaseAssignment("u1");
    expect(ok).toBe(true);
    expect(tx.zaloUser.deleteMany).toHaveBeenCalledWith({ where: { zaloUserId: "z1", botConfigId: "bot-a" } });
    expect(tx.botAssignment.delete).toHaveBeenCalledWith({ where: { id: "as1" } });
  });

  it("no-op khi không có assignment", async () => {
    tx.botAssignment.findUnique.mockResolvedValue(null);
    expect(await releaseAssignment("u1")).toBe(false);
  });
});

describe("poolHasCapacity", () => {
  it("true khi có bot còn chỗ", async () => {
    tx.botConfig.findMany.mockResolvedValue([{ id: "a", capacity: 5, _count: { assignments: 2 } }]);
    expect(await poolHasCapacity()).toBe(true);
  });
  it("false khi tất cả đầy", async () => {
    tx.botConfig.findMany.mockResolvedValue([{ id: "a", capacity: 5, _count: { assignments: 5 } }]);
    expect(await poolHasCapacity()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test → FAIL** (`cd backend && npm test bot-pool` — module chưa tồn tại).

- [ ] **Step 3: Viết `bot-pool.service.ts`**

```ts
import prisma from "../config/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `PENNY-${s}`;
}

async function generateLinkCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = randomCode();
    const exists = await prisma.botAssignment.findUnique({ where: { linkCode: code } });
    if (!exists) return code;
  }
  throw new Error("Could not generate unique link code");
}

async function listPoolLoad() {
  const bots = await prisma.botConfig.findMany({
    where: { kind: "POOL", isActive: true },
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "asc" },
  });
  return bots;
}

export async function poolHasCapacity(): Promise<boolean> {
  const bots = await prisma.botConfig.findMany({
    where: { kind: "POOL", isActive: true },
    include: { _count: { select: { assignments: true } } },
  });
  return bots.some((b) => b._count.assignments < b.capacity);
}

export async function getPoolLoad() {
  const bots = await prisma.botConfig.findMany({
    where: { kind: "POOL" },
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "asc" },
  });
  return bots.map((b) => ({
    botConfigId: b.id,
    label: b.label,
    used: b._count.assignments,
    capacity: b.capacity,
    isActive: b.isActive,
  }));
}

export async function assignBotToUser(userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.botAssignment.findUnique({ where: { userId } });
    if (existing) return existing;

    const bots = await tx.botConfig.findMany({
      where: { kind: "POOL", isActive: true },
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "asc" },
    });
    const available = bots
      .filter((b) => b._count.assignments < b.capacity)
      .sort((a, b) =>
        a._count.assignments - b._count.assignments ||
        a.createdAt.getTime() - b.createdAt.getTime()
      );
    const target = available[0];
    if (!target) return null;

    const linkCode = await generateLinkCode();
    return tx.botAssignment.create({
      data: { botConfigId: target.id, userId, status: "PENDING_LINK", linkCode },
    });
  });
}

export async function releaseAssignment(userId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const a = await tx.botAssignment.findUnique({ where: { userId } });
    if (!a) return false;
    if (a.linkedZaloUserId) {
      await tx.zaloUser.deleteMany({
        where: { zaloUserId: a.linkedZaloUserId, botConfigId: a.botConfigId },
      });
    }
    await tx.botAssignment.delete({ where: { id: a.id } });
    return true;
  });
}
```
*Ghi chú:* `generateLinkCode` test gọi `prisma.botAssignment.findUnique` (mock trả null) — OK. Bỏ `listPoolLoad` nếu không dùng (đã có getPoolLoad). (Xoá hàm thừa trước commit.)

- [ ] **Step 4: Run test → PASS** (`cd backend && npm test bot-pool`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/bot-pool.service.ts backend/src/services/bot-pool.service.test.ts
git commit -m "feat(bot-pool): assignBotToUser (least-loaded), release, capacity"
```

---

## Phase 3 — Attribution refactor (core)

### Task 3: `bot-manager.service.ts` — key theo botConfigId, hỗ trợ pool

**Files:**
- Modify: `backend/src/services/bot-manager.service.ts`
- Modify: `backend/src/controllers/bot.controller.ts` (call sites `startBot`/`stopBot`)
- Modify: `backend/src/controllers/webhook.controller.ts` (gọi `handleMessage`)

- [ ] **Step 1:** Đổi `PollingInstance` + map key sang `botConfigId`; `startBot(botConfigId, botToken)`; `stopBot(botConfigId)`; `isBotRunning(botConfigId)`. `pollLoop` gọi `handleMessage(botConfig, message)` — nhưng polling chỉ có botConfigId/token, nên load `botConfig` 1 lần khi start và truyền vào loop.

```ts
import prisma from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import { handleMessage } from "./message-handler";
import type { BotConfig } from "../generated/prisma/client";

interface PollingInstance {
  botConfigId: string;
  botToken: string;
  running: boolean;
  seenIds: Set<string>;
}

const instances = new Map<string, PollingInstance>(); // key = botConfigId

function getWebhookUrl(botConfigId: string) {
  if (!env.zalo.webhookBaseUrl) return null;
  return `${env.zalo.webhookBaseUrl}/api/webhooks/zalo/${botConfigId}`;
}

function assertWebhookReady(botConfigId: string) {
  const webhookUrl = getWebhookUrl(botConfigId);
  if (!webhookUrl || !env.zalo.webhookSecret) {
    throw new Error("ZALO_BOT_MODE=webhook requires ZALO_WEBHOOK_BASE_URL and ZALO_WEBHOOK_SECRET");
  }
  return webhookUrl;
}

export async function startAllBots() {
  const configs = await prisma.botConfig.findMany({
    where: { isActive: true },
    include: { user: { include: { subscription: true } } },
  });

  let startedCount = 0;
  for (const config of configs) {
    const isPool = config.kind === "POOL";
    const ownerActive = config.user?.subscription?.status === "ACTIVE";
    if (isPool || ownerActive) {
      const started = await startBot(config.id, config.botToken);
      if (started) startedCount += 1;
    }
  }
  logger.info({ startedCount, mode: env.zalo.mode }, "Bot Manager started");
}

export async function startBot(botConfigId: string, botToken: string) {
  if (instances.has(botConfigId)) stopBot(botConfigId);
  try {
    await zaloApi.getMe(botToken);
    if (env.zalo.mode === "webhook") {
      const webhookUrl = assertWebhookReady(botConfigId);
      await zaloApi.setWebhook(botToken, webhookUrl, env.zalo.webhookSecret);
      logger.info({ botConfigId, webhookUrl }, "Bot started [webhook]");
      return true;
    }
    await zaloApi.deleteWebhook(botToken);
  } catch (err) {
    logger.error({ err, botConfigId }, "Failed to initialize bot");
    return false;
  }

  const instance: PollingInstance = { botConfigId, botToken, running: true, seenIds: new Set() };
  instances.set(botConfigId, instance);
  pollLoop(instance);
  logger.info({ botConfigId }, "Bot started [polling]");
  return true;
}

export function stopBot(botConfigId: string) {
  const instance = instances.get(botConfigId);
  if (instance) {
    instance.running = false;
    instances.delete(botConfigId);
    logger.info({ botConfigId }, "Bot stopped");
  }
}

export async function stopAllBots() {
  for (const id of [...instances.keys()]) stopBot(id);
}

export function isBotRunning(botConfigId: string): boolean {
  return instances.has(botConfigId);
}

export function getBotRuntimeMode() {
  return env.zalo.mode;
}

export function getBotWebhookUrl(botConfigId: string) {
  return getWebhookUrl(botConfigId);
}

const POLLED_EVENTS = new Set([
  "message.text.received",
  "message.image.received",
  "message.document.received",
]);

async function pollLoop(instance: PollingInstance) {
  while (instance.running) {
    try {
      const result = await zaloApi.getUpdates(instance.botToken, "30");
      if (result && POLLED_EVENTS.has(result.event_name) && result.message) {
        const msgId = result.message.message_id;
        if (!instance.seenIds.has(msgId)) {
          instance.seenIds.add(msgId);
          if (instance.seenIds.size > 10000) {
            instance.seenIds = new Set([...instance.seenIds].slice(-5000));
          }
          const botConfig = await prisma.botConfig.findUnique({ where: { id: instance.botConfigId } });
          if (botConfig) {
            handleMessage(botConfig as BotConfig, result.message).catch((err) =>
              logger.error({ err, botConfigId: instance.botConfigId }, "Message handling error")
            );
          }
        }
      }
    } catch (err) {
      logger.error({ err, botConfigId: instance.botConfigId }, "Polling error");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
```

- [ ] **Step 2:** `webhook.controller.ts` — select thêm `kind`; gọi `handleMessage(botConfig, event.message)`.

Đổi `select` (dòng ~53) thành `select: { id: true, userId: true, botToken: true, isActive: true, kind: true }` và đổi dòng 105:
```ts
handleMessage(botConfig, event.message).catch((err) => {
  logger.error({ err, reqId: req.id, botConfigId }, "Webhook message handling error");
});
```

- [ ] **Step 3:** `bot.controller.ts` — `connectBot` gọi `botManager.startBot(botConfig.id, botToken)`; `disconnectBot` gọi `botManager.stopBot(config.id)` (cần select `id`); `verifyBotOwnership` stop dùng `pending.botConfigId`; `botStatus.running` polling dùng `botManager.isBotRunning(config.id)`.

Chi tiết sửa:
- `connectBot`: `const started = await botManager.startBot(botConfig.id, botToken);`
- `disconnectBot`: đổi select `{ botToken: true }` → `{ id: true, botToken: true }`; đổi `botManager.stopBot(req.userId!)` → `if (config) botManager.stopBot(config.id);`
- `verifyBotOwnership` (dòng 82): `botManager.stopBot(pending.botConfigId);`
- `botStatus` (dòng 154-157): `mode === "webhook" ? !!config?.isActive : (config ? botManager.isBotRunning(config.id) : false)`

- [ ] **Step 4: typecheck**

Run: `cd backend && npm run typecheck`
Expected: chỉ còn lỗi ở `message-handler/index.ts` (chữ ký `handleMessage` đổi) — sẽ sửa ở Task 4. Nếu muốn xanh ngay, làm Task 4 liền trước khi typecheck.

- [ ] **Step 5: Commit** (gộp với Task 4 nếu typecheck chưa xanh)

```bash
git add backend/src/services/bot-manager.service.ts backend/src/controllers/webhook.controller.ts backend/src/controllers/bot.controller.ts
git commit -m "refactor(bot): key bot runtime by botConfigId (support owner-less pool bots)"
```

### Task 4: `message-handler` — gán theo người gửi + link flow

**Files:**
- Create: `backend/src/services/message-handler/link.ts`
- Create: `backend/src/services/message-handler/link.test.ts`
- Modify: `backend/src/services/message-handler/index.ts`

- [ ] **Step 1: Viết `link.ts`**

```ts
import prisma from "../../config/prisma";
import * as zaloApi from "../../utils/zalo-api";
import { logger } from "../../utils/logger";

/**
 * Cho pool bot: thử liên kết người gửi Zalo (chưa có ZaloUser) với app-user
 * dựa trên linkCode. Trả về userId nếu liên kết thành công, null nếu không.
 */
export async function tryLinkPoolUser(
  botConfigId: string,
  botToken: string,
  zaloUserId: string,
  displayName: string | undefined,
  text: string,
  chatId: string
): Promise<string | null> {
  const code = text.trim().toUpperCase();
  const assignment = await prisma.botAssignment.findFirst({
    where: { botConfigId, status: "PENDING_LINK", linkCode: code },
  });
  if (!assignment) {
    await zaloApi.sendMessage(
      botToken,
      chatId,
      "Chào bạn! Để bắt đầu, hãy gửi đúng MÃ LIÊN KẾT hiển thị trên web (dạng PENNY-XXXX) nhé."
    );
    return null;
  }

  // 1 Zalo = 1 app-user / bot
  const dupe = await prisma.zaloUser.findUnique({
    where: { zaloUserId_botConfigId: { zaloUserId, botConfigId } },
  });
  if (dupe) {
    await zaloApi.sendMessage(botToken, chatId, "Tài khoản Zalo này đã được liên kết rồi.");
    return null;
  }

  await prisma.$transaction([
    prisma.zaloUser.create({
      data: { zaloUserId, botConfigId, userId: assignment.userId, displayName },
    }),
    prisma.botAssignment.update({
      where: { id: assignment.id },
      data: { status: "LINKED", linkedZaloUserId: zaloUserId, linkedAt: new Date() },
    }),
  ]);

  logger.info({ botConfigId, userId: assignment.userId }, "Pool user linked");
  return assignment.userId;
}
```

- [ ] **Step 2: Viết test `link.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  botAssignment: { findFirst: vi.fn(), update: vi.fn() },
  zaloUser: { findUnique: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
};
vi.mock("../../config/prisma", () => ({ default: prismaMock }));
const send = vi.fn();
vi.mock("../../utils/zalo-api", () => ({ sendMessage: (...a: unknown[]) => send(...a) }));

import { tryLinkPoolUser } from "./link";

beforeEach(() => vi.clearAllMocks());

it("liên kết khi mã khớp", async () => {
  prismaMock.botAssignment.findFirst.mockResolvedValue({ id: "as1", userId: "u1", botConfigId: "b1" });
  prismaMock.zaloUser.findUnique.mockResolvedValue(null);
  const uid = await tryLinkPoolUser("b1", "tok", "z1", "Z", "penny-aaaa", "c1");
  expect(uid).toBe("u1");
  expect(prismaMock.$transaction).toHaveBeenCalled();
});

it("từ chối khi mã sai", async () => {
  prismaMock.botAssignment.findFirst.mockResolvedValue(null);
  const uid = await tryLinkPoolUser("b1", "tok", "z1", "Z", "xxx", "c1");
  expect(uid).toBeNull();
  expect(send).toHaveBeenCalled();
});

it("từ chối khi Zalo đã liên kết", async () => {
  prismaMock.botAssignment.findFirst.mockResolvedValue({ id: "as1", userId: "u1", botConfigId: "b1" });
  prismaMock.zaloUser.findUnique.mockResolvedValue({ id: "existing" });
  const uid = await tryLinkPoolUser("b1", "tok", "z1", "Z", "penny-aaaa", "c1");
  expect(uid).toBeNull();
});
```

- [ ] **Step 3: Run test → FAIL → implement đã có → PASS** (`cd backend && npm test link`).

- [ ] **Step 4: Sửa `index.ts`** — chữ ký `handleMessage(botConfig, message)`, phân giải `appUserId` theo `kind`.

Thay phần đầu `handleMessage` (dòng 31-97). `botConfig` type: dùng select tối thiểu `{ id, userId, botToken, kind, isActive }`.

```ts
import type { BotConfig } from "../../generated/prisma/client";
import { tryLinkPoolUser } from "./link";
// ... giữ các import khác

type BotConfigLite = Pick<BotConfig, "id" | "userId" | "botToken" | "kind" | "isActive">;

export async function handleMessage(botConfig: BotConfigLite, message: ZaloMessage) {
  const botToken = botConfig.botToken;
  const chatId = message.chat.id;
  const text = (message.text || message.caption || "").trim();
  const hasMedia = messageHasMedia(message);
  if (!text && !hasMedia) {
    logger.info({ messageId: message.message_id, keys: Object.keys(message) }, "Ignored empty message");
    return;
  }

  // OWNED bot: giữ luồng xác minh sở hữu (verify code) như cũ.
  if (botConfig.kind === "OWNED") {
    const matched = matchAndMarkVerified({ botToken, code: text });
    if (matched) {
      logger.info({ verifyId: matched.verifyId }, "Bot verification matched");
      try {
        await zaloApi.sendMessage(botToken, chatId, "Xác minh thành công! ✅ Quay lại trang web để hoàn tất kết nối.");
      } catch (err) {
        logger.warn({ err }, "Failed to send verification confirmation");
      }
      return;
    }
    if (!botConfig.isActive) {
      logger.debug({ text: text.slice(0, 50) }, "Owned bot not active yet, ignoring");
      return;
    }
  }

  // Phân giải app-user theo người gửi.
  let appUserId: string | null = null;
  if (botConfig.kind === "OWNED") {
    appUserId = botConfig.userId; // chủ bot
  } else {
    const zaloUser = await prisma.zaloUser.findUnique({
      where: { zaloUserId_botConfigId: { zaloUserId: message.from.id, botConfigId: botConfig.id } },
    });
    if (zaloUser) {
      appUserId = zaloUser.userId;
    } else {
      // Chưa liên kết → thử link bằng mã. Không xử lý chi tiêu.
      if (text) {
        await tryLinkPoolUser(botConfig.id, botToken, message.from.id, message.from.display_name, text, chatId);
      }
      return;
    }
  }
  if (!appUserId) return;
  const userId = appUserId;

  const processingKey = `${botConfig.id}:${message.message_id}`;
  if (!(await claimMessageProcessing(processingKey))) {
    logger.debug({ botConfigId: botConfig.id, messageId: message.message_id }, "Duplicate ignored");
    return;
  }

  try {
    const zaloUser = await getOrCreateZaloUser(message.from.id, userId, botConfig.id, message.from.display_name);
    const conversation = await loadConversationSession(botConfig.id, message.from.id);
    // ... GIỮ NGUYÊN phần còn lại từ dòng 100 trở đi (dùng biến `userId` đã có).
```

Phần còn lại của hàm (`hasProcessedMessage` → switch intent) **giữ nguyên** vì đã dùng biến `userId`, `botConfig.id`, `botToken`, `conversation`. Xoá đoạn `botConfigCheck`/`findFirst({botToken,userId})` cũ (dòng 67-80) — đã thay bằng logic trên.

- [ ] **Step 5: typecheck + test**

Run: `cd backend && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/message-handler
git commit -m "feat(attribution): per-sender app-user resolution + pool linking"
```

---

## Phase 4 — Activation + checkout gate

### Task 5: Checkout gate + dev assign — `subscription.controller.ts`

**Files:**
- Modify: `backend/src/validators/subscription.schema.ts`
- Modify: `backend/src/controllers/subscription.controller.ts`

- [ ] **Step 1:** `subscription.schema.ts` thêm `botMode`:
```ts
export const createSubscriptionBody = z.object({
  planSlug: z.string().min(1).max(60),
  botMode: z.enum(["pool", "self"]).optional().default("pool"),
});
```

- [ ] **Step 2:** `subscription.controller.ts` `createSubscription`:
  - import `{ poolHasCapacity, assignBotToUser, releaseAssignment } from "../services/bot-pool.service"` và `logger`.
  - Sau khi tìm `plan` (sau dòng 24), nếu `botMode !== "self"`: `if (!(await poolHasCapacity())) { logger.warn({ userId: req.userId }, "POOL_FULL at checkout"); throw new HttpError(409, "Hệ thống tạm hết chỗ bot. Vui lòng thử lại sau ít phút.", { code: "POOL_FULL" }); }`
  - Lấy `botMode` từ `req.body`.
  - Khi archive existing (dòng 38): thêm `await releaseAssignment(req.userId!);` sau archive.
  - Trong nhánh `env.isDev` sau `$transaction` (sau dòng 75): `if (botMode !== "self") { await assignBotToUser(req.userId!); }`

*Kiểm tra:* `HttpError` constructor có nhận `details` (đã thấy ở bot.controller). Dùng `{ code: "POOL_FULL" }` như details để FE đọc. (Nếu `HttpError` không serialize `code`, FE fallback theo status 409 + message.)

- [ ] **Step 3: typecheck**, rồi **Commit**:
```bash
git add backend/src/validators/subscription.schema.ts backend/src/controllers/subscription.controller.ts
git commit -m "feat(checkout): block when pool full + auto-assign in dev"
```

### Task 6: IPN activate → assign — `payment.service.ts`

**Files:** Modify `backend/src/services/payment.service.ts`

- [ ] **Step 1:** import `{ assignBotToUser } from "./bot-pool.service"`. Sau `prisma.$transaction([...])` (sau dòng 110), trước `logger.info`:
```ts
try {
  await assignBotToUser(subscription.userId);
} catch (err) {
  logger.error({ err, userId: subscription.userId }, "Bot auto-assign failed (awaiting bot)");
}
```
*Lưu ý:* không ném lỗi để IPN vẫn 200. Nếu `assignBotToUser` trả null (hết chỗ do race) → user "awaiting bot", admin thấy ở `/admin/bots`.

- [ ] **Step 2: typecheck + test**, **Commit**:
```bash
git add backend/src/services/payment.service.ts
git commit -m "feat(payment): auto-assign pool bot on IPN activation"
```

### Task 7: Manual upgrade → release + assign — `admin/subscriptions.controller.ts`

**Files:** Modify `backend/src/controllers/admin/subscriptions.controller.ts`

- [ ] **Step 1:** import `{ assignBotToUser, releaseAssignment } from "../../services/bot-pool.service"`. Sau khi archive existing (sau dòng 37): `await releaseAssignment(userId);`. Sau `prisma.payment.create` (sau dòng 66): `await assignBotToUser(userId);`

- [ ] **Step 2: typecheck**, **Commit**:
```bash
git add backend/src/controllers/admin/subscriptions.controller.ts
git commit -m "feat(admin): assign pool bot on manual upgrade"
```

---

## Phase 5 — Expiry sweep

### Task 8: `subscription-expiry.service.ts`

**Files:**
- Create: `backend/src/services/subscription-expiry.service.ts`
- Create: `backend/src/services/subscription-expiry.service.test.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Viết test**
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
const prismaMock = {
  subscription: { findMany: vi.fn(), update: vi.fn() },
};
vi.mock("../config/prisma", () => ({ default: prismaMock }));
const release = vi.fn();
vi.mock("./bot-pool.service", () => ({ releaseAssignment: (...a: unknown[]) => release(...a) }));
vi.mock("./bot-manager.service", () => ({ stopBot: vi.fn() }));

import { sweepExpiredSubscriptions } from "./subscription-expiry.service";

beforeEach(() => vi.clearAllMocks());

it("EXPIRED + release các sub quá hạn", async () => {
  prismaMock.subscription.findMany.mockResolvedValue([
    { id: "s1", userId: "u1", botConfig: null },
  ]);
  await sweepExpiredSubscriptions();
  expect(prismaMock.subscription.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "s1" }, data: { status: "EXPIRED" } })
  );
  expect(release).toHaveBeenCalledWith("u1");
});
```

- [ ] **Step 2: Viết service**
```ts
import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import { releaseAssignment } from "./bot-pool.service";
import { stopBot } from "./bot-manager.service";

export async function sweepExpiredSubscriptions() {
  const now = new Date();
  const expired = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    include: { user: { include: { botConfig: true } } },
  });
  for (const sub of expired) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
    await releaseAssignment(sub.userId);
    const owned = sub.user?.botConfig;
    if (owned) stopBot(owned.id);
    logger.info({ subscriptionId: sub.id, userId: sub.userId }, "Subscription expired + released");
  }
  if (expired.length) logger.info({ count: expired.length }, "Expiry sweep done");
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startExpirySweep(intervalMs = 60 * 60 * 1000) {
  if (timer) return;
  timer = setInterval(() => {
    sweepExpiredSubscriptions().catch((err) => logger.error({ err }, "Expiry sweep failed"));
  }, intervalMs);
  timer.unref();
}
```
*Note:* test mock `findMany` trả `botConfig: null` qua `sub.user?.botConfig` — chỉnh test mock thành `{ id:"s1", userId:"u1", user: { botConfig: null } }`. (Sửa test cho khớp `include`.)

- [ ] **Step 3:** Sửa test mock cho khớp `include` (user.botConfig), run → PASS.

- [ ] **Step 4:** `server.ts` — import `{ startExpirySweep } from "./services/subscription-expiry.service"`; trong `server.listen` callback sau `startAllBots()`:
```ts
startExpirySweep();
```

- [ ] **Step 5: typecheck + test**, **Commit**:
```bash
git add backend/src/services/subscription-expiry.service.ts backend/src/services/subscription-expiry.service.test.ts backend/src/server.ts
git commit -m "feat(expiry): hourly sweep marks EXPIRED + releases bot slot"
```

---

## Phase 6 — Admin bot CRUD (backend)

### Task 9: validators + controller + route

**Files:**
- Modify: `backend/src/validators/admin.schema.ts`
- Create: `backend/src/controllers/admin/bots.controller.ts`
- Create: `backend/src/routes/admin/bots.route.ts`
- Modify: `backend/src/routes/admin/index.ts`

- [ ] **Step 1:** `admin.schema.ts` thêm:
```ts
export const botCreateBody = z.object({
  label: z.string().min(1).max(80),
  botToken: z.string().min(10).max(500).trim(),
  capacity: z.number().int().positive().max(50).optional().default(5),
  botLink: z.string().max(300).optional(),
  qrImageUrl: z.string().max(2_000_000).optional(), // data URL
  isActive: z.boolean().optional().default(true),
});
export const botUpdateBody = botCreateBody.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Cần ít nhất một trường để cập nhật" }
);
export const botIdParams = z.object({ id: z.string().min(1).max(64) });
```

- [ ] **Step 2:** `bots.controller.ts`:
```ts
import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../middlewares/error.middleware";
import { logAdminAction } from "../../services/admin-audit.service";
import * as botManager from "../../services/bot-manager.service";
import * as zaloApi from "../../utils/zalo-api";

export const list = async (_req: AuthRequest, res: Response) => {
  const bots = await prisma.botConfig.findMany({
    where: { kind: "POOL" },
    include: {
      _count: { select: { assignments: true } },
      assignments: { include: { user: { select: { id: true, name: true, phone: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  const awaiting = await prisma.subscription.count({
    where: { status: "ACTIVE", user: { botAssignment: null, botConfig: null } },
  });
  res.json({ bots, awaiting });
};

export const create = async (req: AuthRequest, res: Response) => {
  const { label, botToken, capacity, botLink, qrImageUrl, isActive } = req.body;
  try {
    await zaloApi.getMe(botToken.trim());
  } catch (err) {
    throw new HttpError(400, "Bot token không hợp lệ", { details: err instanceof Error ? err.message : String(err) });
  }
  const bot = await prisma.botConfig.create({
    data: { kind: "POOL", label, botToken: botToken.trim(), capacity, botLink, qrImageUrl, isActive, connectedAt: new Date() },
  });
  if (bot.isActive) await botManager.startBot(bot.id, bot.botToken);
  await logAdminAction({ adminId: req.userId!, action: "BOT_CREATE", payload: { botConfigId: bot.id, label }, summary: `Created pool bot ${label}` });
  res.status(201).json(bot);
};

export const update = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const before = await prisma.botConfig.findUnique({ where: { id } });
  if (!before || before.kind !== "POOL") throw new HttpError(404, "Không tìm thấy bot");
  const input = req.body;
  if (input.botToken) {
    try { await zaloApi.getMe(input.botToken.trim()); }
    catch (err) { throw new HttpError(400, "Bot token không hợp lệ", { details: err instanceof Error ? err.message : String(err) }); }
    input.botToken = input.botToken.trim();
  }
  const bot = await prisma.botConfig.update({ where: { id }, data: input });
  if (bot.isActive) await botManager.startBot(bot.id, bot.botToken);
  else botManager.stopBot(bot.id);
  await logAdminAction({ adminId: req.userId!, action: "BOT_UPDATE", payload: { botConfigId: id, before: { label: before.label, capacity: before.capacity, isActive: before.isActive }, after: input }, summary: `Updated pool bot ${bot.label}` });
  res.json(bot);
};

export const remove = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const bot = await prisma.botConfig.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
  if (!bot || bot.kind !== "POOL") throw new HttpError(404, "Không tìm thấy bot");
  if (bot._count.assignments > 0) throw new HttpError(409, `Bot còn ${bot._count.assignments} user. Hãy chuyển/giải phóng trước khi xoá.`);
  botManager.stopBot(id);
  await prisma.botConfig.delete({ where: { id } });
  await logAdminAction({ adminId: req.userId!, action: "BOT_DELETE", payload: { botConfigId: id }, summary: `Deleted pool bot ${bot.label}` });
  res.json({ ok: true });
};
```

- [ ] **Step 3:** `bots.route.ts`:
```ts
import { Router } from "express";
import * as ctrl from "../../controllers/admin/bots.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import { botCreateBody, botUpdateBody, botIdParams } from "../../validators/admin.schema";

const router = Router();
router.get("/", asyncHandler(ctrl.list));
router.post("/", validate({ body: botCreateBody }), asyncHandler(ctrl.create));
router.patch("/:id", validate({ params: botIdParams, body: botUpdateBody }), asyncHandler(ctrl.update));
router.delete("/:id", validate({ params: botIdParams }), asyncHandler(ctrl.remove));
export default router;
```

- [ ] **Step 4:** `admin/index.ts` — import `botsRoute from "./bots.route"`; `router.use("/bots", botsRoute);`

- [ ] **Step 5: typecheck**, **Commit**:
```bash
git add backend/src/validators/admin.schema.ts backend/src/controllers/admin/bots.controller.ts backend/src/routes/admin/bots.route.ts backend/src/routes/admin/index.ts
git commit -m "feat(admin): bot pool CRUD endpoints"
```

---

## Phase 7 — Auth/me + bot status (pool-aware)

### Task 10: `auth.controller.me` + `bot.controller.botStatus`

**Files:**
- Modify: `backend/src/controllers/auth.controller.ts`
- Modify: `backend/src/controllers/bot.controller.ts`

- [ ] **Step 1:** `me` — thêm `botAssignment` vào select và trả `botConnection`. Trong `select` thêm:
```ts
      botAssignment: {
        select: {
          status: true,
          linkCode: true,
          botConfig: { select: { id: true, qrImageUrl: true, botLink: true, label: true } },
        },
      },
```
Sau khi lấy `user`, build response:
```ts
  const botConnection = user.botConfig
    ? { kind: "OWNED" as const, status: user.botConfig.isActive ? "LINKED" : "PENDING_LINK", isActive: user.botConfig.isActive }
    : user.botAssignment
      ? { kind: "POOL" as const, status: user.botAssignment.status, isActive: user.botAssignment.status === "LINKED" }
      : null;
  res.json({ ...user, botConnection });
```

- [ ] **Step 2:** `botStatus` — trả thêm thông tin pool để onboarding hiển thị QR + mã:
```ts
export const botStatus = async (req: AuthRequest, res: Response) => {
  const config = await prisma.botConfig.findUnique({
    where: { userId: req.userId! },
    select: { id: true, isActive: true, connectedAt: true, createdAt: true },
  });
  const assignment = await prisma.botAssignment.findUnique({
    where: { userId: req.userId! },
    select: { status: true, linkCode: true, botConfig: { select: { id: true, label: true, qrImageUrl: true, botLink: true } } },
  });
  const mode = botManager.getBotRuntimeMode();
  const running = config ? (mode === "webhook" ? !!config.isActive : botManager.isBotRunning(config.id)) : false;
  res.json({
    config, running, polling: running, mode,
    webhookUrl: config && mode === "webhook" ? botManager.getBotWebhookUrl(config.id) : null,
    pool: assignment ? { status: assignment.status, linkCode: assignment.linkCode, ...assignment.botConfig } : null,
  });
};
```

- [ ] **Step 3: typecheck**, **Commit**:
```bash
git add backend/src/controllers/auth.controller.ts backend/src/controllers/bot.controller.ts
git commit -m "feat(api): expose pool bot connection state in /auth/me and /bot/status"
```

---

## Phase 8 — Frontend admin bot pool

### Task 11: bot-form-dialog + admin/bots page + sidebar + route + api

**Files:**
- Create: `frontend/src/components/admin/bot-form-dialog.tsx`
- Create: `frontend/src/pages/admin/bots.tsx`
- Modify: `frontend/src/components/admin/admin-sidebar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1:** `bot-form-dialog.tsx` — theo khuôn `plan-form-dialog.tsx`, thêm field `label, botToken, capacity, botLink, isActive` và upload QR (file→dataURL). Token disabled khi edit (an toàn) — không, cho phép đổi token. Code:

```tsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface BotRow {
  id?: string;
  label: string;
  botToken?: string;
  capacity: number;
  botLink?: string | null;
  qrImageUrl?: string | null;
  isActive?: boolean;
}

interface Props { initial: BotRow | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void; }

export function BotFormDialog({ initial, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<BotRow>({ label: "", botToken: "", capacity: 5, botLink: "", qrImageUrl: "", isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setForm({ ...initial, botToken: "", botLink: initial.botLink ?? "", qrImageUrl: initial.qrImageUrl ?? "" });
    else setForm({ label: "", botToken: "", capacity: 5, botLink: "", qrImageUrl: "", isActive: true });
  }, [initial, open]);

  const onPickQr = (file?: File) => {
    if (!file) return;
    if (file.size > 300_000) { toast.error("Ảnh QR quá lớn (tối đa ~300KB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, qrImageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        label: form.label.trim(),
        capacity: Number(form.capacity),
        botLink: form.botLink?.trim() || undefined,
        qrImageUrl: form.qrImageUrl || undefined,
        isActive: form.isActive,
      };
      if (form.botToken?.trim()) body.botToken = form.botToken.trim();
      if (initial?.id) { await api.patch(`/admin/bots/${initial.id}`, body); toast.success("Đã cập nhật bot"); }
      else {
        if (!body.botToken) { toast.error("Cần bot token"); setSaving(false); return; }
        await api.post("/admin/bots", body); toast.success("Đã tạo bot");
      }
      onOpenChange(false); onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Lưu thất bại");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Sửa bot" : "Thêm bot vào pool"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Tên gợi nhớ</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Bot 01" /></div>
          <div className="space-y-1.5"><Label>Bot token {initial && "(để trống nếu không đổi)"}</Label>
            <Input value={form.botToken} onChange={(e) => setForm({ ...form, botToken: e.target.value })} placeholder="paste token..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Sức chứa</Label>
              <Input type="number" inputMode="numeric" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value || "5", 10) })} /></div>
            <div className="flex items-end gap-2 pb-2">
              <input id="bactive" type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              <Label htmlFor="bactive">Đang hoạt động</Label></div>
          </div>
          <div className="space-y-1.5"><Label>Link chat bot (tuỳ chọn)</Label>
            <Input value={form.botLink ?? ""} onChange={(e) => setForm({ ...form, botLink: e.target.value })} placeholder="https://zalo.me/..." /></div>
          <div className="space-y-1.5"><Label>Ảnh QR</Label>
            <input type="file" accept="image/*" onChange={(e) => onPickQr(e.target.files?.[0])} className="text-sm" />
            {form.qrImageUrl && <img src={form.qrImageUrl} alt="QR" className="mt-2 size-28 rounded border object-contain" />}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Huỷ</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2:** `pages/admin/bots.tsx` — list theo khuôn `plans.tsx`, hiển thị tải `used/capacity`, cảnh báo awaiting, nút thêm/sửa/xoá.

```tsx
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash, AlertTriangle } from "lucide-react";
import { BotFormDialog, type BotRow } from "@/components/admin/bot-form-dialog";

interface BotItem extends BotRow {
  id: string;
  _count: { assignments: number };
  assignments: { user: { id: string; name: string; phone: string } }[];
}

export default function AdminBotsPage() {
  const [bots, setBots] = useState<BotItem[]>([]);
  const [awaiting, setAwaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BotRow | null>(null);
  const [open, setOpen] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get<{ bots: BotItem[]; awaiting: number }>("/admin/bots")
      .then(({ data }) => { setBots(data.bots); setAwaiting(data.awaiting); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const remove = async (id: string) => {
    if (!confirm("Xoá bot này khỏi pool?")) return;
    try { await api.delete(`/admin/bots/${id}`); toast.success("Đã xoá"); fetch(); }
    catch (err: unknown) { const e = err as { response?: { data?: { error?: string } } }; toast.error(e.response?.data?.error || "Xoá thất bại"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Bot Pool</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-1 size-4" /> Thêm bot</Button>
      </div>

      {awaiting > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="size-4" /> Có {awaiting} user đã thanh toán nhưng chưa được cấp bot (pool đầy). Hãy thêm bot.
        </div>
      )}

      <Card><CardContent className="p-0">
        {loading ? <Skeleton className="m-3 h-48" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr>
              <th className="px-4 py-2 text-left">Tên</th><th className="px-4 py-2 text-left">Tải</th>
              <th className="px-4 py-2 text-left">User</th><th className="px-4 py-2">Trạng thái</th><th className="px-4 py-2"></th>
            </tr></thead>
            <tbody className="divide-y">
              {bots.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30 align-top">
                  <td className="px-4 py-2 font-medium">{b.label}</td>
                  <td className="px-4 py-2">{b._count.assignments}/{b.capacity}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{b.assignments.map((a) => a.user.name).join(", ") || "—"}</td>
                  <td className="px-4 py-2">{b.isActive ? <Badge variant="secondary">Bật</Badge> : <Badge variant="outline">Tắt</Badge>}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditing({ id: b.id, label: b.label, capacity: b.capacity, botLink: b.botLink, qrImageUrl: b.qrImageUrl, isActive: b.isActive }); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => remove(b.id)}><Trash className="size-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </CardContent></Card>

      <BotFormDialog initial={editing} open={open} onOpenChange={setOpen} onSaved={fetch} />
    </div>
  );
}
```

- [ ] **Step 3:** `admin-sidebar.tsx` — import `Bot` icon từ lucide; thêm item `{ to: "/admin/bots", label: "Bot Pool", icon: Bot }` (sau Gói cước).

- [ ] **Step 4:** `App.tsx` — import `AdminBotsPage from "@/pages/admin/bots"`; thêm `<Route path="bots" element={<AdminBotsPage />} />` trong nhánh `/admin`.

- [ ] **Step 5: build**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**:
```bash
git add frontend/src/components/admin/bot-form-dialog.tsx frontend/src/pages/admin/bots.tsx frontend/src/components/admin/admin-sidebar.tsx frontend/src/App.tsx
git commit -m "feat(admin-ui): bot pool management page"
```

---

## Phase 9 — Frontend onboarding rework + guard

### Task 12: auth types + guard + onboarding branch + step-connect-pool

**Files:**
- Modify: `frontend/src/hooks/use-auth.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/onboarding/step-connect-pool.tsx`
- Modify: `frontend/src/pages/onboarding.tsx`
- Modify: `frontend/src/components/onboarding/progress-bar.tsx` (labels linh hoạt — đã hỗ trợ `labels` prop; chỉ cần truyền)

- [ ] **Step 1:** `use-auth.tsx` — thêm `botConnection` vào interface `User`:
```ts
  botConnection?: {
    kind: "OWNED" | "POOL";
    status: "PENDING_LINK" | "LINKED";
    isActive: boolean;
  } | null;
```

- [ ] **Step 2:** `App.tsx` `ProtectedRoute` — đổi `needsOnboarding`:
```ts
  const conn = user.botConnection;
  const connected = conn ? conn.isActive || conn.status === "LINKED" : false;
  const needsOnboarding = user.subscription?.status === "ACTIVE" && !connected;
```

- [ ] **Step 3:** `step-connect-pool.tsx` — hiện QR + mã liên kết, poll `/bot/status` tới khi `pool.status === "LINKED"`.

```tsx
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { isMobile } from "@/lib/is-mobile";

interface PoolInfo { status: string; linkCode: string; id: string; label?: string | null; qrImageUrl?: string | null; botLink?: string | null; }
interface Props { onLinked: () => void; }

export function StepConnectPool({ onLinked }: Props) {
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const { data } = await api.get("/bot/status");
        if (data.pool) {
          setPool(data.pool);
          if (data.pool.status === "LINKED") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            onLinked();
          }
        }
      } catch { /* keep polling */ }
    };
    tick();
    pollingRef.current = setInterval(tick, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [onLinked]);

  const copy = async () => {
    if (!pool) return;
    try { await navigator.clipboard.writeText(pool.linkCode); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Đã chép mã"); }
    catch { toast.error("Không sao chép được, hãy chọn mã thủ công"); }
  };

  if (!pool) {
    return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
      <RefreshCw className="mx-auto mb-2 size-4 animate-spin" /> Đang chuẩn bị bot cho bạn...
    </CardContent></Card>;
  }

  return (
    <Card><CardContent className="space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-bold">Kết nối bot của bạn</h2>
        <p className="text-sm text-muted-foreground">Quét QR để mở chat với bot, rồi gửi MÃ LIÊN KẾT bên dưới cho bot.</p>
      </div>
      {pool.qrImageUrl && <img src={pool.qrImageUrl} alt="QR bot" className="mx-auto size-48 rounded-xl border object-contain" />}
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
        <p className="text-xs text-emerald-700">Mã liên kết</p>
        <p className="font-mono text-2xl font-bold tracking-[0.2em] text-emerald-900">{pool.linkCode}</p>
      </div>
      <Button onClick={copy} variant="outline" className="w-full" size="lg">
        {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}{copied ? "Đã chép" : "Chép mã liên kết"}
      </Button>
      {pool.botLink && isMobile() && (
        <Button asChild className="w-full" size="lg"><a href={pool.botLink} target="_blank" rel="noopener noreferrer">Mở chat với bot<ExternalLink className="ml-1.5 size-3.5" /></a></Button>
      )}
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground">
        <RefreshCw className="size-3 animate-spin" /><span>Đang chờ bạn gửi mã trên Zalo...</span>
      </div>
    </CardContent></Card>
  );
}
```

- [ ] **Step 4:** `onboarding.tsx` — rẽ nhánh theo `botConnection.kind`. Mặc định POOL: 2 bước (connect-pool → personalize). Có link "Tự kết nối bot riêng (nâng cao)" để chuyển sang luồng self 4 bước. Viết lại component:

```tsx
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { PageHead } from "@/components/page-head";
import { OnboardingProgressBar } from "@/components/onboarding/progress-bar";
import { StepCreateBot } from "@/components/onboarding/step-create-bot";
import { StepPasteToken } from "@/components/onboarding/step-paste-token";
import { StepVerify } from "@/components/onboarding/step-verify";
import { StepPersonalize } from "@/components/onboarding/step-personalize";
import { StepConnectPool } from "@/components/onboarding/step-connect-pool";

interface BotInfo { id?: string; username?: string; display_name?: string; }

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // POOL trừ khi user đã có owned bot, hoặc chủ động chọn self.
  const isOwned = user?.botConnection?.kind === "OWNED";
  const [mode, setMode] = useState<"pool" | "self">(isOwned ? "self" : "pool");

  // self flow state
  const [selfStep, setSelfStep] = useState<1 | 2 | 3 | 4>(1);
  const [verifyId, setVerifyId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  // pool flow state
  const [poolDone, setPoolDone] = useState(false);

  const firstName = user?.name?.trim().split(/\s+/).pop() ?? "Bạn";
  const suggestedName = `Bot Penny ${firstName}`;

  const finish = useCallback(async () => {
    await refreshUser();
    navigate("/dashboard");
  }, [refreshUser, navigate]);

  const poolLabels = useMemo(() => ["Kết nối", "Cá nhân hoá"], []);
  const poolCurrent = (poolDone ? 2 : 1) as 1 | 2;

  return (
    <div className="min-h-svh bg-gradient-to-b from-emerald-50/50 to-background px-4 py-6 sm:py-10">
      <PageHead title="Thiết lập Penny" description="Kết nối Zalo Bot trong vài bước" />
      <div className="mx-auto max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-2xl font-bold">Thiết lập Penny</h1>
          <p className="text-sm text-muted-foreground">Chỉ vài bước để bot bắt đầu giúp bạn ghi chi tiêu</p>
        </div>

        {mode === "pool" ? (
          <>
            <OnboardingProgressBar current={poolCurrent as 1 | 2 | 3 | 4} labels={poolLabels} />
            {!poolDone ? (
              <StepConnectPool onLinked={() => setPoolDone(true)} />
            ) : (
              <StepPersonalize onFinish={finish} />
            )}
            <div className="text-center">
              <button onClick={() => setMode("self")} className="text-xs text-muted-foreground hover:text-primary hover:underline">
                Tự kết nối bot riêng (nâng cao)
              </button>
            </div>
          </>
        ) : (
          <>
            <OnboardingProgressBar current={selfStep} />
            {selfStep === 1 && <StepCreateBot suggestedName={suggestedName} onNext={() => setSelfStep(2)} />}
            {selfStep === 2 && (
              <StepPasteToken onBack={() => setSelfStep(1)} onConnected={({ verifyId: vid, verifyCode: vc, botInfo: bi }) => { setVerifyId(vid); setVerifyCode(vc); setBotInfo(bi); setSelfStep(3); }} />
            )}
            {selfStep === 3 && (
              <StepVerify verifyId={verifyId} verifyCode={verifyCode} botInfo={botInfo} onVerified={async () => { await refreshUser(); setSelfStep(4); }} onReset={() => { setVerifyId(""); setVerifyCode(""); setBotInfo(null); setSelfStep(2); }} />
            )}
            {selfStep === 4 && <StepPersonalize onFinish={finish} />}
            {!isOwned && (
              <div className="text-center">
                <button onClick={() => setMode("pool")} className="text-xs text-muted-foreground hover:text-primary hover:underline">
                  Dùng bot được cấp sẵn (khuyên dùng)
                </button>
              </div>
            )}
          </>
        )}

        <div className="text-center">
          <button onClick={() => navigate("/dashboard")} className="text-xs text-muted-foreground hover:text-primary hover:underline">
            Bỏ qua, làm sau ở Cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
```
*Note:* bỏ persistence localStorage cũ để đơn giản (state pool tự khôi phục qua poll `/bot/status`; self flow ngắn). Nếu muốn giữ, thêm sau.

- [ ] **Step 5: build**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**:
```bash
git add frontend/src/hooks/use-auth.tsx frontend/src/App.tsx frontend/src/components/onboarding/step-connect-pool.tsx frontend/src/pages/onboarding.tsx
git commit -m "feat(onboarding): pool connect flow (QR + link code) with self-bot advanced option"
```

---

## Phase 10 — Settings hiển thị trạng thái (nhẹ)

### Task 13: `settings.tsx` — hiện bot được cấp (pool) hoặc bot riêng

**Files:** Modify `frontend/src/pages/dashboard/settings.tsx`

- [ ] **Step 1:** Đọc `botConnection` từ `useAuth`. Nếu `kind === "POOL"`: hiện thẻ "Bạn đang dùng bot được cấp sẵn — trạng thái: Đã kết nối/Chờ liên kết", và nếu `PENDING_LINK` thêm nút "Hoàn tất kết nối" → điều hướng `/onboarding`. Giữ nguyên phần self-bot connect card cho `kind !== "POOL"`. (Chi tiết tuỳ layout hiện có — chỉ thêm 1 nhánh điều kiện, không phá phần cũ.)

- [ ] **Step 2: build**, **Commit**:
```bash
git add frontend/src/pages/dashboard/settings.tsx
git commit -m "feat(settings): show pool bot connection state"
```

---

## Phase 11 — Verification toàn cục

### Task 14: Full check

- [ ] **Step 1:** `cd backend && npm run typecheck && npm test` → tất cả PASS.
- [ ] **Step 2:** `cd frontend && npm run build` → PASS.
- [ ] **Step 3:** Manual smoke (dev mode, polling): tạo pool bot ở `/admin/bots`; user dev mua gói (`botMode` mặc định pool) → auto-assign → `/onboarding` hiện QR + mã → (gửi mã từ Zalo) → LINKED → nhắn chi tiêu → ghi đúng user. User thứ 2 (Zalo khác) cùng bot → ghi đúng user 2.
- [ ] **Step 4:** Cập nhật checklist trong spec/plan; commit nếu có chỉnh.

---

## Ghi chú thực thi

- **Migration không có DB dev:** nếu `prisma migrate dev` không chạy được (thiếu DATABASE_URL), tạo SQL thủ công bằng `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` rồi đặt vào thư mục migration mới, và chạy `npx prisma generate` để cập nhật client cho typecheck. Trên server prod dùng `npx prisma migrate deploy`.
- **`HttpError` details/code:** kiểm tra chữ ký `HttpError(status, message, details?)` ở `error.middleware.ts`; FE đọc `error` (message) và status 409 cho POOL_FULL. Nếu cần mã máy, thêm field vào error payload.
- **Pool bot polling vs webhook:** ở webhook mode, pool bot đăng ký webhook `/api/webhooks/zalo/:botConfigId` như owned bot — không cần đổi route. Ở polling mode, mỗi pool bot có 1 vòng poll riêng (key theo botConfigId).
- **DRY/YAGNI:** không thêm field/endpoint ngoài spec. `getPoolLoad` chỉ dùng nếu cần dashboard; nếu không, bỏ.
