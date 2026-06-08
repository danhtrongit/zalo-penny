import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
  },
}));
vi.mock("../../config/prisma", () => ({ default: prismaMock }));

import { timeseries } from "./stats.controller";
import { vnDateRange } from "../../utils/vn-time";

function mockRes() {
  return { json: vi.fn() } as unknown as import("express").Response & { json: ReturnType<typeof vi.fn> };
}

beforeEach(() => vi.clearAllMocks());

describe("timeseries", () => {
  it("buckets signups by VN day, zero-filled across 7d", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { createdAt: new Date() },
      { createdAt: new Date() },
    ]);
    const res = mockRes();
    await timeseries({ query: { metric: "signups", range: "7d" } } as never, res);

    const body = res.json.mock.calls[0][0] as { points: { date: string; value: number }[] };
    const dates = vnDateRange(7);
    expect(body.points).toHaveLength(7);
    // both signups land on today (last bucket)
    expect(body.points[6]).toEqual({ date: dates[6], value: 2 });
    expect(body.points.slice(0, 6).every((p) => p.value === 0)).toBe(true);
  });

  it("sums PAID revenue by VN day", async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { paidAt: new Date(), amount: 1000 },
      { paidAt: new Date(), amount: 500 },
    ]);
    const res = mockRes();
    await timeseries({ query: { metric: "revenue", range: "30d" } } as never, res);

    const body = res.json.mock.calls[0][0] as { points: { value: number }[] };
    expect(body.points).toHaveLength(30);
    expect(body.points[29].value).toBe(1500);
  });
});
