# Free Tier (10 msg/day) + Upgrade & Expiry Nudges — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give non-paying users a free tier of 10 messages/day, nudge them to upgrade when they exceed it, and message users when their subscription expires.

**Architecture:** A single `DailyUsage` counter table (one row per user per VN day). A new `enforceFreeTier()` gate in `services/usage.service.ts` is called from the message handler right after onboarding and before any AI work: ACTIVE users pass through untouched; others get an atomic per-day increment, are blocked past 10, and receive exactly one persona-styled upgrade notice. The existing hourly expiry sweep sends a persona-styled "plan expired" notice before stopping the bot. Persona messaging + the deterministic upgrade-link suffix are factored into a shared `notice.service.ts` / `utils/upgrade-link.ts`.

**Tech Stack:** TypeScript, Express, Prisma 7 (Postgres), Vitest. VN time via existing `utils/vn-time.ts`. Mirrors patterns in `services/reminder.service.ts`.

---

## File Structure

- Create: `backend/prisma/migrations/20260609120000_daily_usage/migration.sql` — DailyUsage table.
- Modify: `backend/prisma/schema.prisma` — add `DailyUsage` model.
- Modify: `backend/src/config/constants.ts` — add `FREE_DAILY_MESSAGE_LIMIT`.
- Create: `backend/src/utils/upgrade-link.ts` — `upgradeUrl()`, `appendUpgradeLink()`.
- Create: `backend/src/utils/upgrade-link.test.ts`.
- Create: `backend/src/services/notice.service.ts` — `buildPersonaNotice()` (AI + fallback + link).
- Create: `backend/src/services/notice.service.test.ts`.
- Create: `backend/src/services/usage.service.ts` — `enforceFreeTier()`.
- Create: `backend/src/services/usage.service.test.ts`.
- Modify: `backend/src/services/message-handler/index.ts` — call the gate after onboarding.
- Modify: `backend/src/services/subscription-expiry.service.ts` — send expiry notice in the sweep.
- Modify: `backend/src/services/subscription-expiry.service.test.ts` — or create if absent.

All test commands run from `backend/`: `cd backend`. Test runner: `npx vitest run <file>`.

---

## Task 1: DailyUsage schema + migration + constant

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260609120000_daily_usage/migration.sql`
- Modify: `backend/src/config/constants.ts`

- [ ] **Step 1: Add the model to `schema.prisma`** (append after the `ReminderLog` model)

```prisma
model DailyUsage {
  id              String    @id @default(cuid())
  userId          String
  date            DateTime
  count           Int       @default(0)
  limitNotifiedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, date])
  @@index([date])
}
```

- [ ] **Step 2: Hand-author the migration SQL** at `backend/prisma/migrations/20260609120000_daily_usage/migration.sql`

```sql
-- CreateTable
CREATE TABLE "DailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "limitNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyUsage_date_idx" ON "DailyUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUsage_userId_date_key" ON "DailyUsage"("userId", "date");
```

- [ ] **Step 3: Add the constant** to `backend/src/config/constants.ts` (append at end)

```ts
// Free tier: non-ACTIVE users may send this many messages per VN day before
// being asked to upgrade (see services/usage.service.ts).
export const FREE_DAILY_MESSAGE_LIMIT = 10;
```

- [ ] **Step 4: Regenerate the Prisma client** so `prisma.dailyUsage` types exist

Run: `cd backend && npx prisma generate`
Expected: "Generated Prisma Client" with no errors. (No DB connection needed for generate.)

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260609120000_daily_usage backend/src/config/constants.ts
git commit -m "feat(free-tier): DailyUsage table + FREE_DAILY_MESSAGE_LIMIT constant"
```

---

## Task 2: Upgrade-link helper

**Files:**
- Create: `backend/src/utils/upgrade-link.ts`
- Create: `backend/src/utils/upgrade-link.test.ts`

- [ ] **Step 1: Write the failing test** at `backend/src/utils/upgrade-link.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../config/env", () => ({ env: { frontendUrl: "https://pennybot.vn" } }));

import { upgradeUrl, appendUpgradeLink } from "./upgrade-link";

describe("upgrade-link", () => {
  it("upgradeUrl points at the pricing page", () => {
    expect(upgradeUrl()).toBe("https://pennybot.vn/pricing");
  });

  it("appendUpgradeLink keeps the body and adds the pricing link", () => {
    const out = appendUpgradeLink("Xin chào");
    expect(out).toContain("Xin chào");
    expect(out).toContain("https://pennybot.vn/pricing");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run src/utils/upgrade-link.test.ts`
Expected: FAIL — `Cannot find module './upgrade-link'`.

- [ ] **Step 3: Implement** `backend/src/utils/upgrade-link.ts`

```ts
import { env } from "../config/env";

/** URL of the public pricing/upgrade page. */
export function upgradeUrl(): string {
  return `${env.frontendUrl}/pricing`;
}

/** Append a standard, model-proof upgrade call-to-action to a message body. */
export function appendUpgradeLink(text: string): string {
  return `${text}\n\n👉 Nâng cấp để dùng không giới hạn: ${upgradeUrl()}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run src/utils/upgrade-link.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/upgrade-link.ts backend/src/utils/upgrade-link.test.ts
git commit -m "feat(free-tier): upgrade-link helper"
```

---

## Task 3: Persona notice builder (`notice.service.ts`)

**Files:**
- Create: `backend/src/services/notice.service.ts`
- Create: `backend/src/services/notice.service.test.ts`

- [ ] **Step 1: Write the failing test** at `backend/src/services/notice.service.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { aiMock } = vi.hoisted(() => ({ aiMock: vi.fn() }));

vi.mock("./ai", () => ({ generateChatResponse: (...a: unknown[]) => aiMock(...a) }));
vi.mock("../utils/upgrade-link", () => ({
  appendUpgradeLink: (t: string) => `${t}\n\nLINK`,
}));

import { buildPersonaNotice } from "./notice.service";

describe("buildPersonaNotice", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses AI text when available, then appends the link", async () => {
    aiMock.mockResolvedValue("  Nâng cấp đi bạn ơi  ");
    const out = await buildPersonaNotice("PROMPT", "FALLBACK", "SYS");
    expect(out).toBe("Nâng cấp đi bạn ơi\n\nLINK");
    expect(aiMock).toHaveBeenCalledWith("PROMPT", "SYS");
  });

  it("falls back to the static body when AI throws, still appends the link", async () => {
    aiMock.mockRejectedValue(new Error("boom"));
    const out = await buildPersonaNotice("PROMPT", "FALLBACK", "SYS");
    expect(out).toBe("FALLBACK\n\nLINK");
  });

  it("falls back when AI returns empty", async () => {
    aiMock.mockResolvedValue("   ");
    const out = await buildPersonaNotice("PROMPT", "FALLBACK", "SYS");
    expect(out).toBe("FALLBACK\n\nLINK");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run src/services/notice.service.test.ts`
Expected: FAIL — `Cannot find module './notice.service'`.

- [ ] **Step 3: Implement** `backend/src/services/notice.service.ts`

```ts
import * as aiService from "./ai";
import { logger } from "../utils/logger";
import { appendUpgradeLink } from "../utils/upgrade-link";

/**
 * Build a persona-styled notice: ask the AI for a short body in the user's
 * persona voice, fall back to static text on any failure, then deterministically
 * append the upgrade link so it can never be dropped by the model.
 */
export async function buildPersonaNotice(
  prompt: string,
  fallback: string,
  systemPrompt: string
): Promise<string> {
  let body = fallback;
  try {
    const text = await aiService.generateChatResponse(prompt, systemPrompt);
    if (text && text.trim()) body = text.trim();
  } catch (err) {
    logger.warn({ err }, "Persona notice AI generation failed, using fallback");
  }
  return appendUpgradeLink(body);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run src/services/notice.service.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/notice.service.ts backend/src/services/notice.service.test.ts
git commit -m "feat(free-tier): persona notice builder with link suffix"
```

---

## Task 4: The free-tier gate (`usage.service.ts`)

**Files:**
- Create: `backend/src/services/usage.service.ts`
- Create: `backend/src/services/usage.service.test.ts`

- [ ] **Step 1: Write the failing test** at `backend/src/services/usage.service.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, noticeMock, sendMock } = vi.hoisted(() => {
  const prismaMock = {
    subscription: { findUnique: vi.fn() },
    dailyUsage: { upsert: vi.fn(), updateMany: vi.fn() },
  };
  return { prismaMock, noticeMock: vi.fn(), sendMock: vi.fn() };
});

vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("./notice.service", () => ({
  buildPersonaNotice: (...a: unknown[]) => noticeMock(...a),
}));
vi.mock("../utils/zalo-api", () => ({ sendMessage: (...a: unknown[]) => sendMock(...a) }));

import { enforceFreeTier } from "./usage.service";

const base = { userId: "u1", botToken: "T1", chatId: "z1", systemPrompt: "SYS" };

describe("enforceFreeTier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noticeMock.mockResolvedValue("NOTICE");
    prismaMock.dailyUsage.updateMany.mockResolvedValue({ count: 1 });
  });

  it("ACTIVE subscription → not blocked, no counting", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ status: "ACTIVE" });
    const res = await enforceFreeTier(base);
    expect(res).toEqual({ blocked: false });
    expect(prismaMock.dailyUsage.upsert).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("non-ACTIVE within limit → not blocked, increments", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ status: "EXPIRED" });
    prismaMock.dailyUsage.upsert.mockResolvedValue({ count: 5 });
    const res = await enforceFreeTier(base);
    expect(res).toEqual({ blocked: false });
    expect(prismaMock.dailyUsage.upsert).toHaveBeenCalledOnce();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("no subscription at all is treated as non-ACTIVE", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.dailyUsage.upsert.mockResolvedValue({ count: 1 });
    const res = await enforceFreeTier(base);
    expect(res).toEqual({ blocked: false });
    expect(prismaMock.dailyUsage.upsert).toHaveBeenCalledOnce();
  });

  it("11th message → blocked, claims notice once, sends it", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ status: "PENDING" });
    prismaMock.dailyUsage.upsert.mockResolvedValue({ count: 11 });
    prismaMock.dailyUsage.updateMany.mockResolvedValue({ count: 1 }); // won the claim
    const res = await enforceFreeTier(base);
    expect(res).toEqual({ blocked: true });
    expect(noticeMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledWith("T1", "z1", "NOTICE");
  });

  it("12th message same day → blocked, no second notice", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ status: "EXPIRED" });
    prismaMock.dailyUsage.upsert.mockResolvedValue({ count: 12 });
    prismaMock.dailyUsage.updateMany.mockResolvedValue({ count: 0 }); // already claimed
    const res = await enforceFreeTier(base);
    expect(res).toEqual({ blocked: true });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("a send failure still blocks (never throws)", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ status: "EXPIRED" });
    prismaMock.dailyUsage.upsert.mockResolvedValue({ count: 11 });
    prismaMock.dailyUsage.updateMany.mockResolvedValue({ count: 1 });
    sendMock.mockRejectedValue(new Error("zalo down"));
    const res = await enforceFreeTier(base);
    expect(res).toEqual({ blocked: true });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run src/services/usage.service.test.ts`
Expected: FAIL — `Cannot find module './usage.service'`.

- [ ] **Step 3: Implement** `backend/src/services/usage.service.ts`

```ts
import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import { FREE_DAILY_MESSAGE_LIMIT } from "../config/constants";
import { vnDateStr, startOfVnDay } from "../utils/vn-time";
import { buildPersonaNotice } from "./notice.service";

const FREE_LIMIT_PROMPT =
  "Viết MỘT tin nhắn ngắn (1-2 câu) báo nhẹ nhàng rằng người dùng đã dùng hết số tin nhắn miễn phí trong ngày hôm nay và mời họ nâng cấp gói để nhắn không giới hạn. Đúng giọng persona, thân thiện. KHÔNG bịa số liệu/số tiền, KHÔNG tự chèn đường link. Chỉ trả về nội dung tin nhắn.";

export const FREE_LIMIT_FALLBACK =
  "Bạn đã dùng hết số tin nhắn miễn phí trong hôm nay rồi 😊 Mai quay lại nhé!";

/**
 * Free-tier gate. ACTIVE subscribers are unlimited. Everyone else gets
 * FREE_DAILY_MESSAGE_LIMIT messages per VN day; the first message over the limit
 * receives exactly one persona-styled upgrade notice (claimed atomically so
 * concurrent messages can't double-send), and all over-limit messages are blocked.
 */
export async function enforceFreeTier(opts: {
  userId: string;
  botToken: string;
  chatId: string;
  systemPrompt: string;
  now?: Date;
}): Promise<{ blocked: boolean }> {
  const { userId, botToken, chatId, systemPrompt, now = new Date() } = opts;

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (sub?.status === "ACTIVE") return { blocked: false };

  const date = startOfVnDay(vnDateStr(now));
  const usage = await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (usage.count <= FREE_DAILY_MESSAGE_LIMIT) return { blocked: false };

  // Over the limit. Claim the once-per-day notice atomically: a single
  // conditional UPDATE means exactly one concurrent caller wins and sends.
  const claim = await prisma.dailyUsage.updateMany({
    where: { userId, date, limitNotifiedAt: null },
    data: { limitNotifiedAt: now },
  });
  if (claim.count === 1) {
    try {
      const text = await buildPersonaNotice(
        FREE_LIMIT_PROMPT,
        FREE_LIMIT_FALLBACK,
        systemPrompt
      );
      await zaloApi.sendMessage(botToken, chatId, text);
    } catch (err) {
      logger.warn({ err, userId }, "Free-tier limit notice send failed");
    }
  }
  return { blocked: true };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run src/services/usage.service.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/usage.service.ts backend/src/services/usage.service.test.ts
git commit -m "feat(free-tier): enforceFreeTier daily-limit gate"
```

---

## Task 5: Wire the gate into the message handler

**Files:**
- Modify: `backend/src/services/message-handler/index.ts`

- [ ] **Step 1: Add the import** near the other handler imports (after line 31, `import { looksLikeExpense } from "./parsers";`)

```ts
import { enforceFreeTier } from "../usage.service";
```

- [ ] **Step 2: Insert the gate** immediately after the onboarding early-return block (after the closing `}` of `if (!zaloUser.isOnboarded) { … }`, currently line 196) and before the `// Photo / PDF receipt` comment (line 198)

```ts
    // Free-tier gate: non-ACTIVE users get FREE_DAILY_MESSAGE_LIMIT msgs/day.
    // Placed after onboarding (so onboarding/commands don't count) and before
    // any AI call (so blocked messages cost nothing).
    if (
      (await enforceFreeTier({ userId, botToken, chatId, systemPrompt })).blocked
    ) {
      await rememberProcessedMessage(conversation, message.message_id);
      await completeMessageProcessing(processingKey);
      return;
    }

```

- [ ] **Step 3: Typecheck the build**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the message-handler test suite (if present) + the new unit tests**

Run: `cd backend && npx vitest run src/services/usage.service.test.ts src/services/notice.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/message-handler/index.ts
git commit -m "feat(free-tier): enforce daily limit in message handler"
```

---

## Task 6: Expiry notice in the expiry sweep

**Files:**
- Modify: `backend/src/services/subscription-expiry.service.ts`
- Create: `backend/src/services/subscription-expiry.service.test.ts`

- [ ] **Step 1: Write the failing test** at `backend/src/services/subscription-expiry.service.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sendMock, noticeMock, stopBotMock, releaseMock } = vi.hoisted(() => {
  const prismaMock = {
    subscription: { findMany: vi.fn(), update: vi.fn() },
    zaloUser: { findMany: vi.fn() },
    botConfig: { findMany: vi.fn() },
    persona: { findUnique: vi.fn() },
  };
  return {
    prismaMock,
    sendMock: vi.fn(),
    noticeMock: vi.fn(),
    stopBotMock: vi.fn(),
    releaseMock: vi.fn(),
  };
});

vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("../utils/zalo-api", () => ({ sendMessage: (...a: unknown[]) => sendMock(...a) }));
vi.mock("./notice.service", () => ({
  buildPersonaNotice: (...a: unknown[]) => noticeMock(...a),
}));
vi.mock("./persona.service", () => ({ buildSystemPrompt: () => "SYS" }));
vi.mock("./bot-manager.service", () => ({ stopBot: (...a: unknown[]) => stopBotMock(...a) }));
vi.mock("./bot-pool.service", () => ({ releaseAssignment: (...a: unknown[]) => releaseMock(...a) }));

import { sweepExpiredSubscriptions } from "./subscription-expiry.service";

beforeEach(() => {
  vi.clearAllMocks();
  noticeMock.mockResolvedValue("EXPIRY NOTICE");
  prismaMock.subscription.update.mockResolvedValue({});
  prismaMock.persona.findUnique.mockResolvedValue(null);
  releaseMock.mockResolvedValue(undefined);
});

it("messages each onboarded ZaloUser when a subscription expires", async () => {
  prismaMock.subscription.findMany.mockResolvedValue([
    { id: "s1", userId: "u1", user: { botConfig: null } },
  ]);
  prismaMock.zaloUser.findMany.mockResolvedValue([
    { zaloUserId: "z1", botConfigId: "bc1" },
  ]);
  prismaMock.botConfig.findMany.mockResolvedValue([{ id: "bc1", botToken: "T1" }]);

  await sweepExpiredSubscriptions();

  expect(sendMock).toHaveBeenCalledWith("T1", "z1", "EXPIRY NOTICE");
  expect(prismaMock.subscription.update).toHaveBeenCalledWith({
    where: { id: "s1" },
    data: { status: "EXPIRED" },
  });
});

it("sends the notice before stopping an OWNED owner's bot", async () => {
  const order: string[] = [];
  sendMock.mockImplementation(() => order.push("send"));
  stopBotMock.mockImplementation(() => order.push("stop"));
  prismaMock.subscription.findMany.mockResolvedValue([
    { id: "s1", userId: "u1", user: { botConfig: { id: "own1" } } },
  ]);
  prismaMock.zaloUser.findMany.mockResolvedValue([
    { zaloUserId: "z1", botConfigId: "own1" },
  ]);
  prismaMock.botConfig.findMany.mockResolvedValue([{ id: "own1", botToken: "T1" }]);

  await sweepExpiredSubscriptions();

  expect(order).toEqual(["send", "stop"]);
});

it("a send failure does not block the status update / stop / release", async () => {
  sendMock.mockRejectedValue(new Error("zalo down"));
  prismaMock.subscription.findMany.mockResolvedValue([
    { id: "s1", userId: "u1", user: { botConfig: { id: "own1" } } },
  ]);
  prismaMock.zaloUser.findMany.mockResolvedValue([
    { zaloUserId: "z1", botConfigId: "own1" },
  ]);
  prismaMock.botConfig.findMany.mockResolvedValue([{ id: "own1", botToken: "T1" }]);

  await sweepExpiredSubscriptions();

  expect(prismaMock.subscription.update).toHaveBeenCalled();
  expect(releaseMock).toHaveBeenCalledWith("u1");
  expect(stopBotMock).toHaveBeenCalledWith("own1");
});

it("no onboarded ZaloUser → no send, still expires", async () => {
  prismaMock.subscription.findMany.mockResolvedValue([
    { id: "s1", userId: "u1", user: { botConfig: null } },
  ]);
  prismaMock.zaloUser.findMany.mockResolvedValue([]);
  prismaMock.botConfig.findMany.mockResolvedValue([]);

  await sweepExpiredSubscriptions();

  expect(sendMock).not.toHaveBeenCalled();
  expect(prismaMock.subscription.update).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run src/services/subscription-expiry.service.test.ts`
Expected: FAIL — the notice is not sent yet (`sendMock` not called) and/or `sendExpiryNotice` ordering not satisfied.

- [ ] **Step 3: Implement** — replace the contents of `backend/src/services/subscription-expiry.service.ts` with:

```ts
import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import { releaseAssignment } from "./bot-pool.service";
import { stopBot } from "./bot-manager.service";
import { buildSystemPrompt } from "./persona.service";
import { buildPersonaNotice } from "./notice.service";

const EXPIRY_PROMPT =
  "Viết MỘT tin nhắn ngắn (1-2 câu) báo nhẹ nhàng rằng gói đăng ký của người dùng vừa hết hạn và mời họ gia hạn để tiếp tục sử dụng đầy đủ. Đúng giọng persona. KHÔNG bịa số liệu/số tiền, KHÔNG tự chèn đường link. Chỉ trả về nội dung tin nhắn.";

export const EXPIRY_FALLBACK =
  "Gói của bạn vừa hết hạn rồi 😔 Gia hạn để tiếp tục sử dụng đầy đủ nhé!";

/**
 * Best-effort proactive message to a user whose subscription just expired.
 * Sent to every onboarded ZaloUser of that app-user, via that user's serving
 * bot. Never throws — failures are logged so the sweep continues.
 */
export async function sendExpiryNotice(userId: string): Promise<void> {
  const recipients = await prisma.zaloUser.findMany({
    where: { userId, isOnboarded: true },
    select: { zaloUserId: true, botConfigId: true },
  });
  if (recipients.length === 0) return;

  const configIds = [...new Set(recipients.map((r) => r.botConfigId))];
  const configs = await prisma.botConfig.findMany({
    where: { id: { in: configIds } },
    select: { id: true, botToken: true },
  });
  const tokenById = new Map(configs.map((c) => [c.id, c.botToken]));

  const persona = await prisma.persona.findUnique({ where: { userId } });
  const systemPrompt = buildSystemPrompt(
    persona || { style: "FRIEND", tease: 3, serious: 3, frugal: 3, emoji: 3, displayName: null }
  );
  const text = await buildPersonaNotice(EXPIRY_PROMPT, EXPIRY_FALLBACK, systemPrompt);

  for (const r of recipients) {
    const token = tokenById.get(r.botConfigId);
    if (!token) continue;
    try {
      await zaloApi.sendMessage(token, r.zaloUserId, text);
    } catch (err) {
      logger.warn({ err, userId, zaloUserId: r.zaloUserId }, "Expiry notice send failed");
    }
  }
}

/**
 * Transition ACTIVE subscriptions past their endDate to EXPIRED and free the
 * bot slot so the pool can be reused. Notifies the user (best-effort) BEFORE
 * stopping an OWNED bot so the message can still be delivered.
 */
export async function sweepExpiredSubscriptions() {
  const now = new Date();
  const expired = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    include: { user: { include: { botConfig: true } } },
  });

  for (const sub of expired) {
    await sendExpiryNotice(sub.userId).catch((err) =>
      logger.warn({ err, userId: sub.userId }, "Expiry notice failed")
    );
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });
    await releaseAssignment(sub.userId);
    const owned = sub.user?.botConfig;
    if (owned) stopBot(owned.id);
    logger.info(
      { subscriptionId: sub.id, userId: sub.userId },
      "Subscription expired + bot slot released"
    );
  }

  if (expired.length) {
    logger.info({ count: expired.length }, "Expiry sweep done");
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startExpirySweep(intervalMs = 60 * 60 * 1000) {
  if (timer) return;
  timer = setInterval(() => {
    sweepExpiredSubscriptions().catch((err) =>
      logger.error({ err }, "Expiry sweep failed")
    );
  }, intervalMs);
  timer.unref();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run src/services/subscription-expiry.service.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/subscription-expiry.service.ts backend/src/services/subscription-expiry.service.test.ts
git commit -m "feat(free-tier): notify users when their subscription expires"
```

---

## Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `cd backend && npx vitest run`
Expected: all suites PASS (previous 118 + new ~15).

- [ ] **Step 3: Production build**

Run: `cd backend && npm run build`
Expected: build succeeds, `dist/` emitted.

- [ ] **Step 4: Push the branch**

```bash
git push -u origin feat/free-tier-limits
```

---

## Task 8: Deploy to production (160.22.123.174)

**Files:** none (deploy only). SSH key already configured. App at `/www/wwwroot/pennybot.vn/app`, backend PM2 process `penny-backend` (port 3020), Postgres `pennybot` on 127.0.0.1:5433.

- [ ] **Step 1: Merge to main locally and push**

```bash
git checkout main && git merge --no-ff feat/free-tier-limits -m "Merge feat/free-tier-limits: 10/day free tier + upgrade & expiry nudges" && git push origin main
```

- [ ] **Step 2: On the server — pull, install, migrate, build, restart**

```bash
ssh root@160.22.123.174 'cd /www/wwwroot/pennybot.vn/app && git pull origin main && cd backend && npm ci && npx prisma migrate deploy && npx prisma generate && npm run build && pm2 restart penny-backend --update-env'
```
Expected: `migrate deploy` applies `20260609120000_daily_usage`; build succeeds; PM2 shows `penny-backend` online.

- [ ] **Step 3: Verify FRONTEND_URL on the server** (the upgrade link depends on it)

```bash
ssh root@160.22.123.174 'cd /www/wwwroot/pennybot.vn/app/backend && grep -E "^FRONTEND_URL=" .env || echo "FRONTEND_URL NOT SET"'
```
Expected: `FRONTEND_URL=https://pennybot.vn`. If missing/wrong, set it and `pm2 restart penny-backend --update-env` so the link reads `https://pennybot.vn/pricing` (not localhost).

- [ ] **Step 4: Verify the table and logs**

```bash
ssh root@160.22.123.174 'PGPASSWORD=$(grep -oP "(?<=:)[^:@]+(?=@)" /www/wwwroot/pennybot.vn/app/backend/.env | head -1) psql -h 127.0.0.1 -p 5433 -U pennyuser -d pennybot -c "\d \"DailyUsage\"" 2>&1 | head -20; pm2 logs penny-backend --lines 30 --nostream'
```
Expected: `DailyUsage` table exists; no startup errors. (Adjust psql user/creds to match `.env` `DATABASE_URL`.)

- [ ] **Step 5: Smoke check** — from a non-subscribed Zalo account, send 11 messages and confirm the 11th returns the upgrade notice with `https://pennybot.vn/pricing`, and that subsequent messages that day are silent. (Manual; user-driven.)

---

## Self-Review

**Spec coverage:**
- "free without registering a plan" → Task 4 (ACTIVE-only bypass; everyone else free up to limit). ✓
- "10 messages/day" → Task 1 constant + Task 4 gate, VN-day bucket. ✓
- "notify with upgrade link when exceeded" → Task 2 (link) + Task 3 (notice) + Task 4 (send once). ✓
- "remind when subscription expires" → Task 6. ✓
- OWNED-bot assumption (notify before stop) → Task 6 ordering test. ✓

**Placeholder scan:** none — every step has full code/commands.

**Type consistency:** `enforceFreeTier(opts)` signature identical in plan + call site (Task 4/5). `buildPersonaNotice(prompt, fallback, systemPrompt)` identical across Tasks 3/4/6. `sendExpiryNotice(userId)` matches its call in the sweep. Prisma compound key `userId_date` matches `@@unique([userId, date])`. `DailyUsage` columns in migration match the model.
