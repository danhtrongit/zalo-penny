import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, aiMock, sendMock } = vi.hoisted(() => {
  const prismaMock = {
    botConfig: { findMany: vi.fn() },
    zaloUser: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    transaction: { findMany: vi.fn() },
    reminderLog: { create: vi.fn() },
  };
  const aiMock = vi.fn();
  const sendMock = vi.fn();
  return { prismaMock, aiMock, sendMock };
});

vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("./ai", () => ({ generateChatResponse: (...a: unknown[]) => aiMock(...a) }));
vi.mock("../utils/zalo-api", () => ({ sendMessage: (...a: unknown[]) => sendMock(...a) }));
vi.mock("./persona.service", () => ({ buildSystemPrompt: () => "SYS" }));

import {
  vnNow,
  startOfVnDay,
  windowFor,
  nextRuns,
  runReminderSweep,
  buildReminderPrompt,
  REMINDER_FALLBACK,
} from "./reminder.service";

// --- time helpers ----------------------------------------------------------

describe("vnNow", () => {
  it("đổi UTC sang giờ VN (UTC+7)", () => {
    // 2026-06-08T01:30:00Z = 08:30 giờ VN
    expect(vnNow(new Date("2026-06-08T01:30:00Z"))).toEqual({
      dateStr: "2026-06-08",
      hour: 8,
      minute: 30,
    });
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
    const r = nextRuns(
      { dateStr: "2026-06-08", hour: 12, minute: 0 },
      { lastMorning: null, lastEvening: null }
    );
    expect(r.runs).toEqual([]);
  });
});

// --- sweep -----------------------------------------------------------------

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
  const now = new Date("2026-06-08T10:00:00Z"); // 17:00 VN

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.reminderLog.create.mockResolvedValue({});
    aiMock.mockResolvedValue("AI text");
  });

  it("gửi cho user ACTIVE/onboarded chưa ghi hôm nay (EVENING)", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-01-01T00:00:00Z") });
    prismaMock.transaction.findMany.mockResolvedValue([]); // không ai ghi trong khung
    aiMock.mockResolvedValue("Nhắc nha!");

    const res = await runReminderSweep("EVENING", now);

    expect(prismaMock.reminderLog.create).toHaveBeenCalledWith({
      data: { userId: "u1", kind: "EVENING", sentOn: new Date("2026-06-07T17:00:00.000Z") },
    });
    expect(sendMock).toHaveBeenCalledWith("T1", "z1", "Nhắc nha!");
    expect(res).toEqual({ sent: 1, failed: 0, skipped: 0 });
  });

  it("KHÔNG gửi nếu user đã ghi trong khung", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-01-01T00:00:00Z") });
    prismaMock.transaction.findMany.mockResolvedValue([{ userId: "u1" }]);

    const res = await runReminderSweep("EVENING", now);
    expect(sendMock).not.toHaveBeenCalled();
    expect(res.sent).toBe(0);
  });

  it("MORNING bỏ qua user tạo trong hôm nay", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-06-08T02:00:00Z") }); // 09:00 VN hôm nay
    prismaMock.transaction.findMany.mockResolvedValue([]);

    const res = await runReminderSweep("MORNING", now);
    expect(sendMock).not.toHaveBeenCalled();
    expect(res.sent).toBe(0);
  });

  it("idempotency: P2002 → skip, không gửi", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-01-01T00:00:00Z") });
    prismaMock.transaction.findMany.mockResolvedValue([]);
    prismaMock.reminderLog.create.mockRejectedValue({ code: "P2002" });

    const res = await runReminderSweep("EVENING", now);
    expect(sendMock).not.toHaveBeenCalled();
    expect(res).toEqual({ sent: 0, failed: 0, skipped: 1 });
  });

  it("AI lỗi → dùng fallback theo kind", async () => {
    seedOneEligibleUser({ createdAt: new Date("2026-01-01T00:00:00Z") });
    prismaMock.transaction.findMany.mockResolvedValue([]);
    aiMock.mockRejectedValue(new Error("boom"));

    await runReminderSweep("EVENING", now);
    expect(sendMock).toHaveBeenCalledWith("T1", "z1", REMINDER_FALLBACK.EVENING);
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
    expect(sendMock).not.toHaveBeenCalled();
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
