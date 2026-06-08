import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sendMock, auditMock } = vi.hoisted(() => ({
  prismaMock: {
    zaloUser: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    botConfig: { findUnique: vi.fn() },
  },
  sendMock: vi.fn(),
  auditMock: vi.fn(),
}));
vi.mock("../../config/prisma", () => ({ default: prismaMock }));
vi.mock("../../utils/zalo-api", () => ({ sendMessage: (...a: unknown[]) => sendMock(...a) }));
vi.mock("../../services/admin-audit.service", () => ({ logAdminAction: (...a: unknown[]) => auditMock(...a) }));
vi.mock("../../services/ai", () => ({ generateChatResponse: vi.fn() }));
vi.mock("../../services/persona.service", () => ({ buildSystemPrompt: () => "SYS" }));

import { sendToUsers } from "./notifications.controller";

function mockRes() {
  return { json: vi.fn() } as unknown as import("express").Response & { json: ReturnType<typeof vi.fn> };
}

beforeEach(() => vi.clearAllMocks());

describe("sendToUsers", () => {
  it("sends to users with a Zalo identity and counts the rest as failed", async () => {
    prismaMock.zaloUser.findMany.mockImplementation(({ where }: { where: { userId: string } }) =>
      Promise.resolve(where.userId === "u1" ? [{ zaloUserId: "z1", botConfigId: "b1" }] : [])
    );
    prismaMock.botConfig.findUnique.mockResolvedValue({ botToken: "T1" });
    sendMock.mockResolvedValue(undefined);

    const res = mockRes();
    await sendToUsers(
      { body: { userIds: ["u1", "u2"], message: "Xin chào", personalized: false }, userId: "admin1" } as never,
      res
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith("T1", "z1", "Xin chào");
    expect(res.json).toHaveBeenCalledWith({ sent: 1, failed: 1 });
    expect(auditMock).toHaveBeenCalledTimes(1);
  });
});
