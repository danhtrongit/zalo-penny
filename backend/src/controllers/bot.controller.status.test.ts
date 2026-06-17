import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, healthMock, mgr } = vi.hoisted(() => ({
  prismaMock: {
    botConfig: { findUnique: vi.fn() },
    botAssignment: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
  healthMock: vi.fn(),
  mgr: { getBotRuntimeMode: vi.fn(() => "webhook"), getBotWebhookUrl: vi.fn(() => "https://x/api/webhooks/zalo/bc1"), isBotRunning: vi.fn(() => false) },
}));
vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("../services/bot-health.service", () => ({ getOwnedBotHealth: (...a: unknown[]) => healthMock(...a) }));
vi.mock("../services/bot-manager.service", () => mgr);
vi.mock("../services/bot-pool.service", () => ({ assignBotToUser: vi.fn() }));

import { botStatus } from "./bot.controller";

function mockRes() { return { json: vi.fn() } as never; }
const req = { userId: "u1" } as never;
beforeEach(() => vi.clearAllMocks());

describe("botStatus", () => {
  it("reports ownedBotHealthy=false for a dead OWNED bot, without leaking botToken", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", isActive: true, connectedAt: null, createdAt: new Date(), botToken: "secret" });
    prismaMock.botAssignment.findUnique.mockResolvedValue(null);
    healthMock.mockResolvedValue(false);
    const res = mockRes();
    await botStatus(req, res);
    const body = (res as { json: ReturnType<typeof vi.fn> }).json.mock.calls[0][0];
    expect(body.ownedBotHealthy).toBe(false);
    expect(body.config).not.toHaveProperty("botToken");
    expect(body.pool).toBeNull();
  });

  it("prefers the pool assignment over a lingering inactive OWNED config", async () => {
    prismaMock.botConfig.findUnique.mockResolvedValue({ id: "bc1", isActive: false, connectedAt: null, createdAt: new Date(), botToken: "secret" });
    prismaMock.botAssignment.findUnique.mockResolvedValue({ status: "PENDING_LINK", linkCode: "PENNY-AAAA", botConfig: { id: "pool1", label: "P1", qrImageUrl: null, botLink: "https://zalo/pool1" } });
    healthMock.mockResolvedValue(false);
    const res = mockRes();
    await botStatus(req, res);
    const body = (res as { json: ReturnType<typeof vi.fn> }).json.mock.calls[0][0];
    expect(body.migratedFromOwned).toBe(true);
    expect(body.pool).toMatchObject({ status: "PENDING_LINK", linkCode: "PENNY-AAAA", id: "pool1" });
  });
});
