import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    reminderLog: { findMany: vi.fn(), count: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock("../../config/prisma", () => ({ default: prismaMock }));

import { list, stats } from "./reminders.controller";
import { startOfVnDay, vnDateStr } from "../../utils/vn-time";

function mockRes() {
  return { json: vi.fn() } as unknown as import("express").Response & { json: ReturnType<typeof vi.fn> };
}

beforeEach(() => vi.clearAllMocks());

describe("reminders.list", () => {
  it("paginates and attaches user name/phone", async () => {
    prismaMock.reminderLog.findMany.mockResolvedValue([
      { id: "r1", userId: "u1", kind: "MORNING", sentOn: new Date(), createdAt: new Date() },
    ]);
    prismaMock.reminderLog.count.mockResolvedValue(1);
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", name: "An", phone: "0900" }]);

    const res = mockRes();
    await list({ query: { page: 1, limit: 20 } } as never, res);

    const body = res.json.mock.calls[0][0] as {
      data: { user: { name: string } | null }[];
      total: number;
      totalPages: number;
    };
    expect(body.total).toBe(1);
    expect(body.totalPages).toBe(1);
    expect(body.data[0].user).toEqual({ name: "An", phone: "0900" });
  });

  it("filters by date+kind via sentOn range", async () => {
    prismaMock.reminderLog.findMany.mockResolvedValue([]);
    prismaMock.reminderLog.count.mockResolvedValue(0);
    prismaMock.user.findMany.mockResolvedValue([]);

    const res = mockRes();
    await list({ query: { page: 1, limit: 20, date: "2026-06-08", kind: "EVENING" } } as never, res);

    const where = prismaMock.reminderLog.findMany.mock.calls[0][0].where;
    expect(where.kind).toBe("EVENING");
    expect(where.sentOn.gte.toISOString()).toBe(startOfVnDay("2026-06-08").toISOString());
  });
});

describe("reminders.stats", () => {
  it("returns zero-filled per-day per-kind counts", async () => {
    const today = vnDateStr(new Date());
    prismaMock.reminderLog.findMany.mockResolvedValue([
      { sentOn: startOfVnDay(today), kind: "MORNING" },
      { sentOn: startOfVnDay(today), kind: "MORNING" },
      { sentOn: startOfVnDay(today), kind: "EVENING" },
    ]);

    const res = mockRes();
    await stats({ query: { days: 14 } } as never, res);

    const body = res.json.mock.calls[0][0] as { points: { date: string; kind: string; count: number }[] };
    expect(body.points).toHaveLength(28); // 14 days * 2 kinds
    const todayMorning = body.points.find((p) => p.date === today && p.kind === "MORNING");
    const todayEvening = body.points.find((p) => p.date === today && p.kind === "EVENING");
    expect(todayMorning?.count).toBe(2);
    expect(todayEvening?.count).toBe(1);
  });
});
