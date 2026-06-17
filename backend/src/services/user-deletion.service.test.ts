import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, tx, mgr, zalo } = vi.hoisted(() => {
  const del = (count: number) => vi.fn().mockResolvedValue({ count });
  const tx = {
    payment: { deleteMany: del(1) },
    subscription: { deleteMany: del(1) },
    subscriptionAudit: { deleteMany: del(2) },
    transaction: { deleteMany: del(9) },
    receipt: { deleteMany: del(3) },
    budget: { deleteMany: del(4) },
    persona: { deleteMany: del(1) },
    dailyUsage: { deleteMany: del(7) },
    reminderLog: { deleteMany: del(5) },
    botAssignment: { deleteMany: del(1) },
    zaloUser: { deleteMany: del(2) },
    conversationState: { deleteMany: del(6) },
    botConfig: { deleteMany: del(1) },
    user: { delete: vi.fn().mockResolvedValue({ id: "u1" }) },
  };
  const prismaMock = {
    botConfig: { findUnique: vi.fn() },
    zaloUser: { findMany: vi.fn() },
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  const mgr = { stopBot: vi.fn() };
  const zalo = { deleteWebhook: vi.fn() };
  return { prismaMock, tx, mgr, zalo };
});
vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("./bot-manager.service", () => mgr);
vi.mock("../utils/zalo-api", async () => {
  const actual = await vi.importActual<typeof import("../utils/zalo-api")>("../utils/zalo-api");
  return { ...actual, deleteWebhook: (...a: unknown[]) => zalo.deleteWebhook(...a) };
});

import { deleteUserCompletely } from "./user-deletion.service";

beforeEach(() => vi.clearAllMocks());

describe("deleteUserCompletely", () => {
  it("tears down the OWNED bot and deletes every table, returning counts", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", botToken: "tok" });
    prismaMock.zaloUser.findMany.mockResolvedValue([{ zaloUserId: "z1", botConfigId: "bc1" }]);
    zalo.deleteWebhook.mockResolvedValue(null);

    const counts = await deleteUserCompletely("u1");

    expect(mgr.stopBot).toHaveBeenCalledWith("bc1");
    expect(zalo.deleteWebhook).toHaveBeenCalledWith("tok");
    expect(tx.transaction.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(tx.payment.deleteMany).toHaveBeenCalledWith({ where: { subscription: { userId: "u1" } } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(counts).toMatchObject({ transactions: 9, receipts: 3, budgets: 4, zaloUsers: 2, conversationStates: 6, user: 1 });
  });

  it("skips bot teardown when the user has no OWNED bot, and still deletes data", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue(null);
    prismaMock.zaloUser.findMany.mockResolvedValue([]);
    const counts = await deleteUserCompletely("u1");
    expect(mgr.stopBot).not.toHaveBeenCalled();
    expect(zalo.deleteWebhook).not.toHaveBeenCalled();
    // No bot and no zalo rows → conversationState delete is skipped (count 0, deleteMany not called)
    expect(tx.conversationState.deleteMany).not.toHaveBeenCalled();
    expect(counts.conversationStates).toBe(0);
    expect(counts.user).toBe(1);
  });

  it("does not let a deleteWebhook failure block the deletion", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", botToken: "dead" });
    prismaMock.zaloUser.findMany.mockResolvedValue([]);
    zalo.deleteWebhook.mockRejectedValue(new Error("401"));
    const counts = await deleteUserCompletely("u1");
    expect(tx.user.delete).toHaveBeenCalled();
    expect(counts.user).toBe(1);
  });
});
