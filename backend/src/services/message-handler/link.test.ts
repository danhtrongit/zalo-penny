import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, send } = vi.hoisted(() => {
  const prismaMock = {
    botAssignment: { findFirst: vi.fn(), update: vi.fn() },
    zaloUser: { findUnique: vi.fn(), create: vi.fn() },
    persona: { upsert: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  };
  const send = vi.fn();
  return { prismaMock, send };
});
vi.mock("../../config/prisma", () => ({ default: prismaMock }));
vi.mock("../../utils/zalo-api", () => ({ sendMessage: (...a: unknown[]) => send(...a) }));

import { tryLinkPoolUser } from "./link";

beforeEach(() => vi.clearAllMocks());

describe("tryLinkPoolUser", () => {
  it("liên kết khi mã khớp", async () => {
    prismaMock.botAssignment.findFirst.mockResolvedValue({ id: "as1", userId: "u1", botConfigId: "b1" });
    prismaMock.zaloUser.findUnique.mockResolvedValue(null);
    const uid = await tryLinkPoolUser("b1", "tok", "z1", "Z", "penny-aaaa", "c1");
    expect(uid).toBe("u1");
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(send).toHaveBeenCalled(); // bot confirms the successful link
  });

  it("từ chối khi mã sai (nhắc người dùng)", async () => {
    prismaMock.botAssignment.findFirst.mockResolvedValue(null);
    const uid = await tryLinkPoolUser("b1", "tok", "z1", "Z", "xxx", "c1");
    expect(uid).toBeNull();
    expect(send).toHaveBeenCalled();
  });

  it("từ chối khi Zalo đã liên kết", async () => {
    prismaMock.botAssignment.findFirst.mockResolvedValue({ id: "as1", userId: "u1", botConfigId: "b1" });
    prismaMock.zaloUser.findUnique.mockResolvedValue({ id: "existing" });
    const uid = await tryLinkPoolUser("b1", "tok", "z1", "Z", "penny-aaaa", "c1");
    expect(uid).toBeNull();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
