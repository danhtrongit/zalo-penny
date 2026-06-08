# Daily Persona Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gửi lời nhắc ghi hoá đơn cá nhân hoá theo persona 2 lần/ngày (08:00 & 17:00 giờ VN) cho user "1 ngày chưa ghi".

**Architecture:** Một service `reminder.service.ts` gồm: (1) helper thời gian VN thuần (testable), (2) `runReminderSweep(kind)` phát hiện user đủ điều kiện & chưa ghi rồi gửi tin theo persona (tái dùng `buildSystemPrompt` + `aiService.generateChatResponse`, có fallback tĩnh), (3) bộ lập lịch `setInterval` 60s tự kích hoạt theo giờ VN. Chống gửi trùng bằng bảng `ReminderLog` (`@@unique([userId, kind, sentOn])`).

**Tech Stack:** TypeScript, Express, Prisma (provider `prisma-client`), Postgres, Gemini (qua `services/ai`), Zalo Bot API (`utils/zalo-api`), Vitest.

**Tham chiếu spec:** `docs/superpowers/specs/2026-06-08-daily-persona-reminders-design.md`

---

### Task 1: Schema — `ReminderKind` enum + `ReminderLog` model

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Thêm enum + model vào cuối `schema.prisma`**

```prisma
enum ReminderKind {
  MORNING
  EVENING
}

model ReminderLog {
  id        String       @id @default(cuid())
  userId    String
  kind      ReminderKind
  sentOn    DateTime
  createdAt DateTime     @default(now())

  @@unique([userId, kind, sentOn])
  @@index([sentOn])
}
```

- [ ] **Step 2: Tạo migration + regenerate client**

Run (nếu DB reachable): `cd backend && npx prisma migrate dev --name reminder_log`
Nếu DB không reachable: `cd backend && npx prisma migrate dev --name reminder_log --create-only` rồi chạy `npx prisma generate`.
Expected: thư mục migration mới dưới `backend/prisma/migrations/*reminder_log/`, và `backend/src/generated/prisma/` được cập nhật (có `ReminderKind`, model `ReminderLog`).

- [ ] **Step 3: Xác nhận client đã sinh enum**

Run: `cd backend && grep -n "ReminderKind" src/generated/prisma/enums.ts`
Expected: in ra dòng `export const ReminderKind = {` ... `MORNING`/`EVENING`.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/src/generated/prisma
git commit -m "feat(reminders): add ReminderLog model + ReminderKind enum"
```

---

### Task 2: Constants cho reminder

**Files:**
- Modify: `backend/src/config/constants.ts`

- [ ] **Step 1: Thêm hằng số vào cuối `constants.ts`**

```ts
export const REMINDER_TZ = "Asia/Ho_Chi_Minh";
export const REMINDER_TICK_MS = 60 * 1000;
export const REMINDER_MORNING_HOUR = 8;
export const REMINDER_EVENING_HOUR = 17;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/config/constants.ts
git commit -m "feat(reminders): add reminder scheduling constants"
```

---

### Task 3: Time helpers thuần (`vnNow`, `startOfVnDay`, `windowFor`, `nextRuns`) — TDD

**Files:**
- Create: `backend/src/services/reminder.service.ts`
- Test: `backend/src/services/reminder.service.test.ts`

- [ ] **Step 1: Viết test thất bại (chỉ phần helper thời gian)**

Tạo `backend/src/services/reminder.service.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

// Mock các phụ thuộc side-effect để import service không chạm DB/AI/Zalo.
vi.mock("../config/prisma", () => ({ default: {} }));
vi.mock("./ai", () => ({ generateChatResponse: vi.fn() }));
vi.mock("../utils/zalo-api", () => ({ sendMessage: vi.fn() }));
vi.mock("./persona.service", () => ({ buildSystemPrompt: () => "SYS" }));

import { vnNow, startOfVnDay, windowFor, nextRuns } from "./reminder.service";

describe("vnNow", () => {
  it("đổi UTC sang giờ VN (UTC+7)", () => {
    // 2026-06-08T01:30:00Z = 08:30 giờ VN
    const c = vnNow(new Date("2026-06-08T01:30:00Z"));
    expect(c).toEqual({ dateStr: "2026-06-08", hour: 8, minute: 30 });
  });

  it("qua mốc nửa đêm UTC vẫn đúng ngày VN", () => {
    // 2026-06-07T18:00:00Z = 2026-06-08 01:00 giờ VN
    const c = vnNow(new Date("2026-06-07T18:00:00Z"));
    expect(c.dateStr).toBe("2026-06-08");
    expect(c.hour).toBe(1);
  });
});

describe("startOfVnDay", () => {
  it("00:00 giờ VN = 17:00 UTC hôm trước", () => {
    expect(startOfVnDay("2026-06-08").toISOString()).toBe("2026-06-07T17:00:00.000Z");
  });
});

describe("windowFor", () => {
  const now = new Date("2026-06-08T10:00:00Z"); // 17:00 VN

  it("MORNING = hôm qua [yesterday 00:00, today 00:00)", () => {
    const w = windowFor("MORNING", now);
    expect(w.gte.toISOString()).toBe("2026-06-06T17:00:00.000Z");
    expect(w.lt.toISOString()).toBe("2026-06-07T17:00:00.000Z");
    expect(w.sentOn.toISOString()).toBe("2026-06-07T17:00:00.000Z");
  });

  it("EVENING = hôm nay [today 00:00, now]", () => {
    const w = windowFor("EVENING", now);
    expect(w.gte.toISOString()).toBe("2026-06-07T17:00:00.000Z");
    expect(w.lt).toEqual(now);
  });
});

describe("nextRuns", () => {
  it("8h chạy MORNING một lần", () => {
    const s0 = { lastMorning: null, lastEvening: null };
    const r1 = nextRuns({ dateStr: "2026-06-08", hour: 8, minute: 0 }, s0);
    expect(r1.runs).toEqual(["MORNING"]);
    const r2 = nextRuns({ dateStr: "2026-06-08", hour: 8, minute: 1 }, r1.state);
    expect(r2.runs).toEqual([]);
  });

  it("17h chạy EVENING; ngày mới reset MORNING", () => {
    const s = { lastMorning: "2026-06-08", lastEvening: null };
    const r = nextRuns({ dateStr: "2026-06-08", hour: 17, minute: 0 }, s);
    expect(r.runs).toEqual(["EVENING"]);
    const r2 = nextRuns({ dateStr: "2026-06-09", hour: 8, minute: 0 }, r.state);
    expect(r2.runs).toEqual(["MORNING"]);
  });

  it("giờ khác → không chạy", () => {
    const r = nextRuns({ dateStr: "2026-06-08", hour: 12, minute: 0 }, { lastMorning: null, lastEvening: null });
    expect(r.runs).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend && npx vitest run src/services/reminder.service.test.ts`
Expected: FAIL — `reminder.service.ts` chưa export các hàm này (module not found / undefined).

- [ ] **Step 3: Tạo `reminder.service.ts` với helper thời gian**

```ts
import {
  REMINDER_TZ,
  REMINDER_MORNING_HOUR,
  REMINDER_EVENING_HOUR,
} from "../config/constants";
import { ReminderKind } from "../generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface VnClock {
  dateStr: string;
  hour: number;
  minute: number;
}

export function vnNow(now: Date = new Date()): VnClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0; // en-CA dùng "24" cho nửa đêm
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute: parseInt(get("minute"), 10),
  };
}

export function startOfVnDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+07:00`);
}

export interface ReminderWindow {
  gte: Date;
  lt: Date;
  sentOn: Date;
}

export function windowFor(kind: ReminderKind, now: Date = new Date()): ReminderWindow {
  const startToday = startOfVnDay(vnNow(now).dateStr);
  if (kind === "MORNING") {
    const startYesterday = new Date(startToday.getTime() - DAY_MS);
    return { gte: startYesterday, lt: startToday, sentOn: startToday };
  }
  return { gte: startToday, lt: now, sentOn: startToday };
}

export interface SchedulerState {
  lastMorning: string | null;
  lastEvening: string | null;
}

export function nextRuns(
  clock: VnClock,
  state: SchedulerState
): { runs: ReminderKind[]; state: SchedulerState } {
  const runs: ReminderKind[] = [];
  let { lastMorning, lastEvening } = state;
  if (clock.hour === REMINDER_MORNING_HOUR && lastMorning !== clock.dateStr) {
    runs.push("MORNING");
    lastMorning = clock.dateStr;
  }
  if (clock.hour === REMINDER_EVENING_HOUR && lastEvening !== clock.dateStr) {
    runs.push("EVENING");
    lastEvening = clock.dateStr;
  }
  return { runs, state: { lastMorning, lastEvening } };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd backend && npx vitest run src/services/reminder.service.test.ts`
Expected: PASS (các describe vnNow/startOfVnDay/windowFor/nextRuns).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/reminder.service.ts backend/src/services/reminder.service.test.ts
git commit -m "feat(reminders): VN time + window + scheduler-decision helpers (TDD)"
```

---

### Task 4: `runReminderSweep` — eligibility, due-detection, idempotency, persona text + send — TDD

**Files:**
- Modify: `backend/src/services/reminder.service.ts`
- Modify: `backend/src/services/reminder.service.test.ts`

- [ ] **Step 1: Thêm test sweep (append vào test file)**

Thêm vào `reminder.service.test.ts`:

```ts
import {
  runReminderSweep,
  buildReminderPrompt,
  REMINDER_FALLBACK,
} from "./reminder.service";
import prisma from "../config/prisma";
import * as ai from "./ai";
import * as zalo from "../utils/zalo-api";

const prismaMock = prisma as unknown as {
  botConfig: { findMany: ReturnType<typeof vi.fn> };
  zaloUser: { findMany: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
  transaction: { findMany: ReturnType<typeof vi.fn> };
  reminderLog: { create: ReturnType<typeof vi.fn> };
};

// Gắn các bảng còn thiếu lên object mock (vi.mock ở đầu file trả về {} cho prisma).
Object.assign(prisma as object, {
  botConfig: { findMany: vi.fn() },
  zaloUser: { findMany: vi.fn() },
  user: { findUnique: vi.fn() },
  transaction: { findMany: vi.fn() },
  reminderLog: { create: vi.fn() },
});

const persona = {
  style: "FRIEND",
  tease: 3,
  serious: 3,
  frugal: 3,
  emoji: 3,
  displayName: "Bạn",
};

function seedOneEligibleUser(opts: { createdAt: Date }) {
  prismaMock.botConfig.findMany.mockResolvedValue([{ id: "bc1", botToken: "T1" }]);
  prismaMock.zaloUser.findMany.mockResolvedValue([{ zaloUserId: "z1", userId: "u1" }]);
  prismaMock.user.findUnique.mockResolvedValue({
    createdAt: opts.createdAt,
    subscription: { status: "ACTIVE" },
    persona,
  });
}

describe("runReminderSweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.reminderLog.create.mockResolvedValue({});
  });

  const now = new Date("2026-06-08T10:00:00Z"); // 17:00 VN

  it("gửi cho user ACTIVE/onboarded chưa ghi hôm nay (EVENING)", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-01-01T00:00:00Z") });
    prismaMock.transaction.findMany.mockResolvedValue([]); // không ai ghi trong khung
    (ai.generateChatResponse as ReturnType<typeof vi.fn>).mockResolvedValue("Nhắc nha!");

    const res = await runReminderSweep("EVENING", now);

    expect(prismaMock.reminderLog.create).toHaveBeenCalledWith({
      data: { userId: "u1", kind: "EVENING", sentOn: new Date("2026-06-07T17:00:00.000Z") },
    });
    expect(zalo.sendMessage).toHaveBeenCalledWith("T1", "z1", "Nhắc nha!");
    expect(res).toEqual({ sent: 1, failed: 0, skipped: 0 });
  });

  it("KHÔNG gửi nếu user đã ghi trong khung", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-01-01T00:00:00Z") });
    prismaMock.transaction.findMany.mockResolvedValue([{ userId: "u1" }]);

    const res = await runReminderSweep("EVENING", now);
    expect(zalo.sendMessage).not.toHaveBeenCalled();
    expect(res.sent).toBe(0);
  });

  it("MORNING bỏ qua user tạo trong hôm nay", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-06-08T02:00:00Z") }); // 09:00 VN hôm nay
    prismaMock.transaction.findMany.mockResolvedValue([]);

    const res = await runReminderSweep("MORNING", now);
    expect(zalo.sendMessage).not.toHaveBeenCalled();
    expect(res.sent).toBe(0);
  });

  it("idempotency: P2002 → skip, không gửi", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-01-01T00:00:00Z") });
    prismaMock.transaction.findMany.mockResolvedValue([]);
    prismaMock.reminderLog.create.mockRejectedValue({ code: "P2002" });

    const res = await runReminderSweep("EVENING", now);
    expect(zalo.sendMessage).not.toHaveBeenCalled();
    expect(res).toEqual({ sent: 0, failed: 0, skipped: 1 });
  });

  it("AI lỗi → dùng fallback theo kind", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-01-01T00:00:00Z") });
    prismaMock.transaction.findMany.mockResolvedValue([]);
    (ai.generateChatResponse as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));

    await runReminderSweep("EVENING", now);
    expect(zalo.sendMessage).toHaveBeenCalledWith("T1", "z1", REMINDER_FALLBACK.EVENING);
  });

  it("user không ACTIVE → bỏ qua", async () => {
    prismaMock.botConfig.findMany.mockResolvedValue([{ id: "bc1", botToken: "T1" }]);
    prismaMock.zaloUser.findMany.mockResolvedValue([{ zaloUserId: "z1", userId: "u1" }]);
    prismaMock.user.findUnique.mockResolvedValue({
      createdAt: new Date("2026-01-01T00:00:00Z"),
      subscription: { status: "EXPIRED" },
      persona,
    });
    prismaMock.transaction.findMany.mockResolvedValue([]);

    const res = await runReminderSweep("EVENING", now);
    expect(zalo.sendMessage).not.toHaveBeenCalled();
    expect(res.sent).toBe(0);
  });
});

describe("buildReminderPrompt / fallback", () => {
  it("có prompt + fallback cho cả 2 kind", () => {
    expect(buildReminderPrompt("MORNING")).toMatch(/buổi sáng/i);
    expect(buildReminderPrompt("EVENING")).toMatch(/cuối ngày/i);
    expect(REMINDER_FALLBACK.MORNING).toBeTruthy();
    expect(REMINDER_FALLBACK.EVENING).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend && npx vitest run src/services/reminder.service.test.ts`
Expected: FAIL — `runReminderSweep`/`buildReminderPrompt`/`REMINDER_FALLBACK` chưa tồn tại.

- [ ] **Step 3: Bổ sung logic sweep vào `reminder.service.ts`**

Thêm imports ở đầu file (gộp cùng import hiện có) + phần dưới đây vào cuối file:

```ts
// thêm vào nhóm import đầu file:
import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import * as aiService from "./ai";
import { buildSystemPrompt } from "./persona.service";
```

```ts
const REMINDER_PROMPTS: Record<ReminderKind, string> = {
  MORNING:
    "Viết MỘT tin nhắn ngắn (1-2 câu) chào buổi sáng, nhắc nhẹ rằng hôm qua người dùng chưa ghi khoản chi nào và khuyến khích hôm nay ghi chép đều. Đúng giọng persona. KHÔNG nêu hay bịa số liệu/số tiền. Chỉ trả về nội dung tin nhắn.",
  EVENING:
    "Viết MỘT tin nhắn ngắn (1-2 câu) vào cuối ngày, nhắc rằng cả ngày hôm nay người dùng chưa ghi khoản chi nào và gợi ý ngồi tổng kết/ghi lại. Đúng giọng persona. KHÔNG nêu hay bịa số liệu/số tiền. Chỉ trả về nội dung tin nhắn.",
};

export const REMINDER_FALLBACK: Record<ReminderKind, string> = {
  MORNING:
    "Chào buổi sáng! Hôm qua mình chưa thấy bạn ghi khoản chi nào. Hôm nay nhớ ghi lại nhé 📝",
  EVENING:
    "Cuối ngày rồi, hôm nay bạn chưa ghi khoản chi nào. Dành chút thời gian ghi lại nha!",
};

export function buildReminderPrompt(kind: ReminderKind): string {
  return REMINDER_PROMPTS[kind];
}

type PersonaInput = Parameters<typeof buildSystemPrompt>[0];

interface Recipient {
  userId: string;
  botToken: string;
  zaloUserId: string;
  persona: PersonaInput | null;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

async function collectRecipients(
  kind: ReminderKind,
  sentOn: Date
): Promise<Recipient[]> {
  const configs = await prisma.botConfig.findMany({
    where: { isActive: true },
    select: { id: true, botToken: true },
  });

  const seen = new Set<string>();
  const userCache = new Map<
    string,
    { createdAt: Date; subscription: { status: string } | null; persona: PersonaInput | null } | null
  >();
  const recipients: Recipient[] = [];

  async function getUser(userId: string) {
    if (userCache.has(userId)) return userCache.get(userId)!;
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, subscription: { select: { status: true } }, persona: true },
    });
    userCache.set(userId, u as never);
    return u as never;
  }

  for (const config of configs) {
    const zaloUsers = await prisma.zaloUser.findMany({
      where: { botConfigId: config.id, isOnboarded: true },
      select: { zaloUserId: true, userId: true },
    });
    for (const zu of zaloUsers) {
      if (seen.has(zu.userId)) continue;
      const u = await getUser(zu.userId);
      if (!u || u.subscription?.status !== "ACTIVE") continue;
      if (kind === "MORNING" && u.createdAt >= sentOn) continue; // user mới tạo hôm nay
      seen.add(zu.userId);
      recipients.push({
        userId: zu.userId,
        botToken: config.botToken,
        zaloUserId: zu.zaloUserId,
        persona: u.persona,
      });
    }
  }
  return recipients;
}

async function buildReminderText(
  kind: ReminderKind,
  persona: PersonaInput | null
): Promise<string> {
  if (persona) {
    try {
      const text = await aiService.generateChatResponse(
        buildReminderPrompt(kind),
        buildSystemPrompt(persona)
      );
      if (text && text.trim()) return text.trim();
    } catch (err) {
      logger.warn({ err, kind }, "Reminder AI generation failed, using fallback");
    }
  }
  return REMINDER_FALLBACK[kind];
}

export async function runReminderSweep(
  kind: ReminderKind,
  now: Date = new Date()
): Promise<{ sent: number; failed: number; skipped: number }> {
  const { gte, lt, sentOn } = windowFor(kind, now);

  const recipients = await collectRecipients(kind, sentOn);
  if (recipients.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const active = await prisma.transaction.findMany({
    where: { createdAt: { gte, lt } },
    distinct: ["userId"],
    select: { userId: true },
  });
  const activeUserIds = new Set(active.map((t: { userId: string }) => t.userId));

  const due = recipients.filter((r) => !activeUserIds.has(r.userId));

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of due) {
    try {
      await prisma.reminderLog.create({
        data: { userId: r.userId, kind, sentOn },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        skipped++;
        continue;
      }
      logger.warn({ err, userId: r.userId, kind }, "ReminderLog create failed");
      failed++;
      continue;
    }

    const text = await buildReminderText(kind, r.persona);
    try {
      await zaloApi.sendMessage(r.botToken, r.zaloUserId, text);
      sent++;
    } catch (err) {
      logger.warn({ err, userId: r.userId, kind }, "Reminder send failed");
      failed++;
    }
  }

  logger.info({ kind, due: due.length, sent, failed, skipped }, "Reminder sweep done");
  return { sent, failed, skipped };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd backend && npx vitest run src/services/reminder.service.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/reminder.service.ts backend/src/services/reminder.service.test.ts
git commit -m "feat(reminders): runReminderSweep with eligibility, idempotency, persona text + fallback (TDD)"
```

---

### Task 5: Scheduler (`startReminderScheduler` / `stopReminderScheduler`)

**Files:**
- Modify: `backend/src/services/reminder.service.ts`

- [ ] **Step 1: Thêm scheduler vào cuối `reminder.service.ts`**

```ts
import { REMINDER_TICK_MS } from "../config/constants";

let timer: ReturnType<typeof setInterval> | null = null;
let schedulerState: SchedulerState = { lastMorning: null, lastEvening: null };

async function tick(): Promise<void> {
  const { runs, state } = nextRuns(vnNow(), schedulerState);
  schedulerState = state; // cập nhật trước await để tránh chạy chồng
  for (const kind of runs) {
    try {
      await runReminderSweep(kind);
    } catch (err) {
      logger.error({ err, kind }, "Reminder sweep failed");
    }
  }
}

export function startReminderScheduler(intervalMs = REMINDER_TICK_MS): void {
  if (timer) return;
  timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref();
  logger.info("Reminder scheduler started");
}

export function stopReminderScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
```

> Lưu ý: `REMINDER_TICK_MS` có thể đã được import ở Task 3; nếu vậy gộp vào dòng import constants hiện có thay vì thêm dòng mới (tránh import trùng).

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 3: Chạy lại test (đảm bảo không vỡ)**

Run: `cd backend && npx vitest run src/services/reminder.service.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/reminder.service.ts
git commit -m "feat(reminders): in-process 60s scheduler (start/stop)"
```

---

### Task 6: Wire vào `server.ts`

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Import scheduler**

Trong nhóm import của `server.ts`, thêm:

```ts
import { startReminderScheduler, stopReminderScheduler } from "./services/reminder.service";
```

- [ ] **Step 2: Khởi động sau `startExpirySweep()`**

Trong callback `server.listen(...)`, ngay sau dòng `startExpirySweep();`, thêm:

```ts
  startReminderScheduler();
```

- [ ] **Step 3: Dừng khi shutdown**

Trong hàm `shutdown(...)`, ngay sau khối `try { await stopAllBots(); ... }`, thêm:

```ts
  stopReminderScheduler();
```

- [ ] **Step 4: Typecheck + test toàn backend**

Run: `cd backend && npx tsc --noEmit && npx vitest run`
Expected: typecheck sạch; toàn bộ test PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat(reminders): start/stop reminder scheduler in server lifecycle"
```

---

## Self-Review

**Spec coverage:**
- 2 khung 08:00/17:00 VN → Task 2 (hours) + Task 5 (scheduler) + Task 3 (`nextRuns`/`vnNow`). ✓
- Sáng="hôm qua trống", Chiều="hôm nay trống" → Task 3 `windowFor` + Task 4 due-detection. ✓
- Cá nhân hoá persona + fallback → Task 4 `buildReminderText`/`REMINDER_FALLBACK`. ✓
- Luôn bật, đối tượng ACTIVE+onboarded, dedup userId → Task 4 `collectRecipients`. ✓
- Chống trùng + audit (`ReminderLog`) → Task 1 + Task 4 idempotency. ✓
- Edge: user mới (MORNING guard), restart giữa khung (unique), nhiều ZaloUser (dedup) → Task 4. ✓
- Không cron lib, setInterval+unref, wire server.ts + shutdown → Task 5 + Task 6. ✓

**Placeholder scan:** Không có TODO/“handle errors”/“similar to”; mọi step code đầy đủ. ✓

**Type consistency:** `ReminderKind` (string-union từ generated client) so sánh `=== "MORNING"/"EVENING"` hợp lệ. `SchedulerState`, `VnClock`, `ReminderWindow`, `Recipient`, `PersonaInput` định nghĩa trước khi dùng. `runReminderSweep`/`buildReminderPrompt`/`REMINDER_FALLBACK` export khớp tên dùng trong test. Tên hàm nhất quán giữa các task. ✓
