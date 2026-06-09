import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, assignMock } = vi.hoisted(() => ({
  prismaMock: { botConfig: { findUnique: vi.fn() } },
  assignMock: vi.fn(),
}));

vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("../services/bot-pool.service", () => ({
  assignBotToUser: (...a: unknown[]) => assignMock(...a),
}));

import { claimFreeBot } from "./bot.controller";

function mockRes() {
  return { json: vi.fn() } as never;
}
const req = { userId: "u1" } as never;

describe("claimFreeBot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("assigns a pool bot when the user has no bot and pool has capacity", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue(null);
    assignMock.mockResolvedValue({ status: "PENDING_LINK" });
    const res = mockRes();
    await claimFreeBot(req, res);
    expect(assignMock).toHaveBeenCalledWith("u1");
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({
      ok: true,
      status: "PENDING_LINK",
    });
  });

  it("returns 409 when the pool is full", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue(null);
    assignMock.mockResolvedValue(null);
    const res = mockRes();
    await expect(claimFreeBot(req, res)).rejects.toMatchObject({ status: 409 });
    expect((res as { json: ReturnType<typeof vi.fn> }).json).not.toHaveBeenCalled();
  });

  it("skips assignment when the user already owns a bot", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1" });
    const res = mockRes();
    await claimFreeBot(req, res);
    expect(assignMock).not.toHaveBeenCalled();
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({
      ok: true,
      alreadyHasBot: true,
    });
  });
});
