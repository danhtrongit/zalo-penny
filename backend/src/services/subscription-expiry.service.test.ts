import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, release, stopBot } = vi.hoisted(() => {
  const prismaMock = {
    subscription: { findMany: vi.fn(), update: vi.fn() },
  };
  const release = vi.fn();
  const stopBot = vi.fn();
  return { prismaMock, release, stopBot };
});
vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("./bot-pool.service", () => ({ releaseAssignment: (...a: unknown[]) => release(...a) }));
vi.mock("./bot-manager.service", () => ({ stopBot: (...a: unknown[]) => stopBot(...a) }));

import { sweepExpiredSubscriptions } from "./subscription-expiry.service";

beforeEach(() => vi.clearAllMocks());

describe("sweepExpiredSubscriptions", () => {
  it("EXPIRED + release các sub quá hạn", async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      { id: "s1", userId: "u1", user: { botConfig: null } },
    ]);
    await sweepExpiredSubscriptions();
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "EXPIRED" },
    });
    expect(release).toHaveBeenCalledWith("u1");
  });

  it("stopBot cho owned bot khi hết hạn", async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      { id: "s2", userId: "u2", user: { botConfig: { id: "bc2" } } },
    ]);
    await sweepExpiredSubscriptions();
    expect(stopBot).toHaveBeenCalledWith("bc2");
  });

  it("no-op khi không có sub quá hạn", async () => {
    prismaMock.subscription.findMany.mockResolvedValue([]);
    await sweepExpiredSubscriptions();
    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });
});
