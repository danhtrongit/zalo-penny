import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, assignMock, mgr, zalo } = vi.hoisted(() => ({
  prismaMock: {
    botConfig: { findUnique: vi.fn(), update: vi.fn() },
    botAssignment: { findUnique: vi.fn() },
  },
  assignMock: vi.fn(),
  mgr: { stopBot: vi.fn() },
  zalo: { getMe: vi.fn(), deleteWebhook: vi.fn() },
}));
vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("../services/bot-pool.service", () => ({ assignBotToUser: (...a: unknown[]) => assignMock(...a) }));
vi.mock("../services/bot-manager.service", () => mgr);
vi.mock("../utils/zalo-api", async () => {
  const actual = await vi.importActual<typeof import("../utils/zalo-api")>("../utils/zalo-api");
  return { ...actual, getMe: (...a: unknown[]) => zalo.getMe(...a), deleteWebhook: (...a: unknown[]) => zalo.deleteWebhook(...a) };
});

import { migrateToPool } from "./bot.controller";
import { ZaloApiError } from "../utils/zalo-api";

function mockRes() { return { json: vi.fn() } as never; }
const req = (body: unknown = {}) => ({ userId: "u1", body }) as never;
beforeEach(() => vi.clearAllMocks());

describe("migrateToPool", () => {
  it("400 when the user has no OWNED bot", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    prismaMock.botConfig.findUnique.mockResolvedValue(null);
    await expect(migrateToPool(req(), mockRes())).rejects.toMatchObject({ status: 400 });
  });

  it("409 and leaves the bot untouched when the OWNED bot is still healthy", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", botToken: "tok" });
    zalo.getMe.mockResolvedValue({ id: "bot" }); // healthy
    await expect(migrateToPool(req(), mockRes())).rejects.toMatchObject({ status: 409 });
    expect(assignMock).not.toHaveBeenCalled();
    expect(prismaMock.botConfig.update).not.toHaveBeenCalled();
  });

  it("migrates a dead bot: assigns pool, deactivates OWNED, returns linkCode", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    prismaMock.botConfig.findUnique
      .mockResolvedValueOnce({ id: "bc1", botToken: "tok" }) // initial load
      .mockResolvedValueOnce({ id: "pool1", label: "P1", botLink: "https://zalo/pool1", qrImageUrl: null }); // pool lookup
    zalo.getMe.mockRejectedValue(new ZaloApiError("getMe", 401, "Unauthorized", 200));
    assignMock.mockResolvedValue({ botConfigId: "pool1", linkCode: "PENNY-AAAA", status: "PENDING_LINK" });
    zalo.deleteWebhook.mockResolvedValue(null);
    const res = mockRes();
    await migrateToPool(req(), res);
    expect(mgr.stopBot).toHaveBeenCalledWith("bc1");
    expect(prismaMock.botConfig.update).toHaveBeenCalledWith({ where: { userId: "u1" }, data: { isActive: false } });
    const body = (res as { json: ReturnType<typeof vi.fn> }).json.mock.calls[0][0];
    expect(body).toMatchObject({ ok: true, pool: { botConfigId: "pool1", linkCode: "PENNY-AAAA", status: "PENDING_LINK", botLink: "https://zalo/pool1" } });
  });

  it("409 when the pool is full; OWNED bot NOT deactivated", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", botToken: "tok" });
    zalo.getMe.mockRejectedValue(new ZaloApiError("getMe", 401, "Unauthorized", 200));
    assignMock.mockResolvedValue(null);
    await expect(migrateToPool(req(), mockRes())).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.botConfig.update).not.toHaveBeenCalled();
  });

  it("is idempotent: returns the existing assignment without re-checking health", async () => {
    prismaMock.botAssignment.findUnique.mockResolvedValue({ botConfigId: "pool1", linkCode: "PENNY-BBBB", status: "LINKED" });
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "pool1", label: "P1", botLink: "https://zalo/pool1", qrImageUrl: null });
    const res = mockRes();
    await migrateToPool(req(), res);
    expect(zalo.getMe).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    const body = (res as { json: ReturnType<typeof vi.fn> }).json.mock.calls[0][0];
    expect(body).toMatchObject({ ok: true, pool: { linkCode: "PENNY-BBBB", status: "LINKED" } });
  });
});
