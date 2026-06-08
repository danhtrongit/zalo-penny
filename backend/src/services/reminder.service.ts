import {
  REMINDER_TZ,
  REMINDER_TICK_MS,
  REMINDER_MORNING_HOUR,
  REMINDER_EVENING_HOUR,
} from "../config/constants";
import { ReminderKind } from "../generated/prisma/client";
import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import * as aiService from "./ai";
import { buildSystemPrompt } from "./persona.service";

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Time helpers (pure, testable). VN = UTC+7, no DST.
// ---------------------------------------------------------------------------

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
  if (hour === 24) hour = 0; // en-CA uses "24" for midnight
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

// ---------------------------------------------------------------------------
// Message content (persona-styled with static fallback)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sweep: eligibility -> due-detection -> idempotent send
// ---------------------------------------------------------------------------

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
      select: {
        createdAt: true,
        subscription: { select: { status: true } },
        persona: true,
      },
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
      if (kind === "MORNING" && u.createdAt >= sentOn) continue; // user created today
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
    // Idempotency: claim the (user, kind, day) slot first. Unique conflict =>
    // already reminded this window (restart / partial-run safe).
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

// ---------------------------------------------------------------------------
// Scheduler: 60s in-process tick (no cron lib, matches startExpirySweep)
// ---------------------------------------------------------------------------

let timer: ReturnType<typeof setInterval> | null = null;
let schedulerState: SchedulerState = { lastMorning: null, lastEvening: null };

async function tick(): Promise<void> {
  const { runs, state } = nextRuns(vnNow(), schedulerState);
  schedulerState = state; // update synchronously before await to avoid overlap
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
