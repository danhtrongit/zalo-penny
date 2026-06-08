import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, tx } = vi.hoisted(() => {
  const tx = {
    botConfig: { findMany: vi.fn() },
    botAssignment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    zaloUser: { deleteMany: vi.fn() },
  };
  const prismaMock = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    botAssignment: tx.botAssignment,
    botConfig: tx.botConfig,
    zaloUser: tx.zaloUser,
  };
  return { prismaMock, tx };
});
vi.mock("../config/prisma", () => ({ default: prismaMock }));

import { assignBotToUser, releaseAssignment, poolHasCapacity } from "./bot-pool.service";

beforeEach(() => {
  vi.clearAllMocks();
  tx.botAssignment.findUnique.mockResolvedValue(null);
  tx.botAssignment.findFirst.mockResolvedValue(null);
});

describe("assignBotToUser", () => {
  it("chọn pool bot tải ít nhất, tạo PENDING_LINK", async () => {
    tx.botConfig.findMany.mockResolvedValue([
      { id: "bot-a", label: "A", capacity: 5, createdAt: new Date("2026-01-01"), _count: { assignments: 4 } },
      { id: "bot-b", label: "B", capacity: 5, createdAt: new Date("2026-01-02"), _count: { assignments: 1 } },
    ]);
    tx.botAssignment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "as1", ...data }));
    const result = await assignBotToUser("u1");
    expect(result?.botConfigId).toBe("bot-b");
    expect(result?.status).toBe("PENDING_LINK");
    expect(result?.linkCode).toMatch(/^PENNY-[A-Z0-9]{4}$/);
  });

  it("ties broken by oldest bot", async () => {
    tx.botConfig.findMany.mockResolvedValue([
      { id: "bot-new", capacity: 5, createdAt: new Date("2026-02-01"), _count: { assignments: 2 } },
      { id: "bot-old", capacity: 5, createdAt: new Date("2026-01-01"), _count: { assignments: 2 } },
    ]);
    tx.botAssignment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "as1", ...data }));
    const result = await assignBotToUser("u1");
    expect(result?.botConfigId).toBe("bot-old");
  });

  it("trả null khi mọi bot đã đầy", async () => {
    tx.botConfig.findMany.mockResolvedValue([
      { id: "bot-a", capacity: 5, createdAt: new Date(), _count: { assignments: 5 } },
    ]);
    expect(await assignBotToUser("u1")).toBeNull();
  });

  it("idempotent: user đã có assignment thì trả lại", async () => {
    tx.botAssignment.findUnique.mockResolvedValue({ id: "as0", userId: "u1", botConfigId: "bot-a", status: "PENDING_LINK", linkCode: "PENNY-AAAA" });
    const r = await assignBotToUser("u1");
    expect(r?.id).toBe("as0");
    expect(tx.botAssignment.create).not.toHaveBeenCalled();
  });
});

describe("releaseAssignment", () => {
  it("xoá zalo mapping + assignment", async () => {
    tx.botAssignment.findUnique.mockResolvedValue({ id: "as1", userId: "u1", botConfigId: "bot-a", linkedZaloUserId: "z1" });
    const ok = await releaseAssignment("u1");
    expect(ok).toBe(true);
    expect(tx.zaloUser.deleteMany).toHaveBeenCalledWith({ where: { zaloUserId: "z1", botConfigId: "bot-a" } });
    expect(tx.botAssignment.delete).toHaveBeenCalledWith({ where: { id: "as1" } });
  });

  it("no-op khi không có assignment", async () => {
    tx.botAssignment.findUnique.mockResolvedValue(null);
    expect(await releaseAssignment("u1")).toBe(false);
  });
});

describe("poolHasCapacity", () => {
  it("true khi có bot còn chỗ", async () => {
    tx.botConfig.findMany.mockResolvedValue([{ id: "a", capacity: 5, _count: { assignments: 2 } }]);
    expect(await poolHasCapacity()).toBe(true);
  });
  it("false khi tất cả đầy", async () => {
    tx.botConfig.findMany.mockResolvedValue([{ id: "a", capacity: 5, _count: { assignments: 5 } }]);
    expect(await poolHasCapacity()).toBe(false);
  });
});
