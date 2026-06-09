import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, release, stopBot, sendMock, noticeMock } = vi.hoisted(() => {
  const prismaMock = {
    subscription: { findMany: vi.fn(), update: vi.fn() },
    zaloUser: { findMany: vi.fn() },
    botConfig: { findMany: vi.fn() },
    persona: { findUnique: vi.fn() },
  };
  return {
    prismaMock,
    release: vi.fn(),
    stopBot: vi.fn(),
    sendMock: vi.fn(),
    noticeMock: vi.fn(),
  };
});
vi.mock("../config/prisma", () => ({ default: prismaMock }));
vi.mock("./bot-pool.service", () => ({ releaseAssignment: (...a: unknown[]) => release(...a) }));
vi.mock("./bot-manager.service", () => ({ stopBot: (...a: unknown[]) => stopBot(...a) }));
vi.mock("../utils/zalo-api", () => ({ sendMessage: (...a: unknown[]) => sendMock(...a) }));
vi.mock("./notice.service", () => ({
  buildPersonaNotice: (...a: unknown[]) => noticeMock(...a),
}));
vi.mock("./persona.service", () => ({ buildSystemPrompt: () => "SYS" }));

import { sweepExpiredSubscriptions } from "./subscription-expiry.service";

beforeEach(() => {
  vi.clearAllMocks();
  // Safe defaults: no recipients unless a test opts in.
  prismaMock.zaloUser.findMany.mockResolvedValue([]);
  prismaMock.botConfig.findMany.mockResolvedValue([]);
  prismaMock.persona.findUnique.mockResolvedValue(null);
  prismaMock.subscription.update.mockResolvedValue({});
  release.mockResolvedValue(undefined);
  noticeMock.mockResolvedValue("EXPIRY NOTICE");
});

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

  it("nhắn cho từng ZaloUser đã onboard khi sub hết hạn", async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      { id: "s1", userId: "u1", user: { botConfig: null } },
    ]);
    prismaMock.zaloUser.findMany.mockResolvedValue([
      { zaloUserId: "z1", botConfigId: "bc1" },
    ]);
    prismaMock.botConfig.findMany.mockResolvedValue([{ id: "bc1", botToken: "T1" }]);

    await sweepExpiredSubscriptions();

    expect(sendMock).toHaveBeenCalledWith("T1", "z1", "EXPIRY NOTICE");
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "EXPIRED" },
    });
  });

  it("gửi thông báo TRƯỚC khi stopBot của owned bot", async () => {
    const order: string[] = [];
    sendMock.mockImplementation(() => {
      order.push("send");
    });
    stopBot.mockImplementation(() => {
      order.push("stop");
    });
    prismaMock.subscription.findMany.mockResolvedValue([
      { id: "s1", userId: "u1", user: { botConfig: { id: "own1" } } },
    ]);
    prismaMock.zaloUser.findMany.mockResolvedValue([
      { zaloUserId: "z1", botConfigId: "own1" },
    ]);
    prismaMock.botConfig.findMany.mockResolvedValue([{ id: "own1", botToken: "T1" }]);

    await sweepExpiredSubscriptions();

    expect(order).toEqual(["send", "stop"]);
  });

  it("send lỗi không chặn update/release/stop", async () => {
    sendMock.mockRejectedValue(new Error("zalo down"));
    prismaMock.subscription.findMany.mockResolvedValue([
      { id: "s1", userId: "u1", user: { botConfig: { id: "own1" } } },
    ]);
    prismaMock.zaloUser.findMany.mockResolvedValue([
      { zaloUserId: "z1", botConfigId: "own1" },
    ]);
    prismaMock.botConfig.findMany.mockResolvedValue([{ id: "own1", botToken: "T1" }]);

    await sweepExpiredSubscriptions();

    expect(prismaMock.subscription.update).toHaveBeenCalled();
    expect(release).toHaveBeenCalledWith("u1");
    expect(stopBot).toHaveBeenCalledWith("own1");
  });

  it("không có ZaloUser onboard → không gửi, vẫn EXPIRED", async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      { id: "s1", userId: "u1", user: { botConfig: null } },
    ]);
    prismaMock.zaloUser.findMany.mockResolvedValue([]);

    await sweepExpiredSubscriptions();

    expect(sendMock).not.toHaveBeenCalled();
    expect(prismaMock.subscription.update).toHaveBeenCalled();
  });
});
