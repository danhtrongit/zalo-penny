import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, delMock, auditMock } = vi.hoisted(() => ({
  prismaMock: { user: { findUnique: vi.fn() } },
  delMock: vi.fn(),
  auditMock: vi.fn(),
}));
vi.mock("../../config/prisma", () => ({ default: prismaMock }));
vi.mock("../../services/user-deletion.service", () => ({ deleteUserCompletely: (...a: unknown[]) => delMock(...a) }));
vi.mock("../../services/admin-audit.service", () => ({ logAdminAction: (...a: unknown[]) => auditMock(...a) }));

import { remove } from "./users.controller";

function mockRes() { return { json: vi.fn() } as never; }
const req = (id: string) => ({ params: { id }, userId: "admin1" }) as never;
beforeEach(() => vi.clearAllMocks());

describe("admin users.remove", () => {
  it("404 when the user does not exist (service not called)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(remove(req("ghost"), mockRes())).rejects.toMatchObject({ status: 404 });
    expect(delMock).not.toHaveBeenCalled();
  });

  it("400 when deleting self", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin1", role: "ADMIN", phone: "1", name: "A", email: null });
    await expect(remove(req("admin1"), mockRes())).rejects.toMatchObject({ status: 400 });
    expect(delMock).not.toHaveBeenCalled();
  });

  it("400 when deleting another ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "ADMIN", phone: "2", name: "B", email: null });
    await expect(remove(req("u2"), mockRes())).rejects.toMatchObject({ status: 400 });
    expect(delMock).not.toHaveBeenCalled();
  });

  it("deletes a USER: calls service, audits USER_DELETE, returns counts", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u3", role: "USER", phone: "0900", name: "C", email: "c@x.vn" });
    delMock.mockResolvedValue({ transactions: 5, user: 1 });
    const res = mockRes();
    await remove(req("u3"), res);
    expect(delMock).toHaveBeenCalledWith("u3");
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      adminId: "admin1",
      action: "USER_DELETE",
      payload: expect.objectContaining({ targetUserId: "u3", phone: "0900" }),
    }));
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({ ok: true, deleted: { transactions: 5, user: 1 } });
  });
});
