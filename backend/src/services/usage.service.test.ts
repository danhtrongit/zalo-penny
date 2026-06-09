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
