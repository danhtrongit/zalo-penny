import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.hoisted(() => vi.fn());
vi.mock("../config/prisma", () => ({
  default: { adminAuditLog: { create: createMock } },
}));

import { logAdminAction } from "./admin-audit.service";

beforeEach(() => createMock.mockReset());

describe("logAdminAction", () => {
  it("persists with the given action + payload + summary", async () => {
    createMock.mockResolvedValue({ id: "log_1" });
    await logAdminAction({
      adminId: "u_admin",
      action: "USER_LOCK",
      payload: { targetUserId: "u_target", reason: "spam" },
      summary: "Locked u_target (reason: spam)",
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        adminId: "u_admin",
        action: "USER_LOCK",
        payload: { targetUserId: "u_target", reason: "spam" },
        summary: "Locked u_target (reason: spam)",
      },
    });
  });

  it("works without optional summary", async () => {
    createMock.mockResolvedValue({ id: "log_2" });
    await logAdminAction({
      adminId: "u_admin",
      action: "PLAN_DELETE",
      payload: { planId: "p_1" },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        adminId: "u_admin",
        action: "PLAN_DELETE",
        payload: { planId: "p_1" },
        summary: undefined,
      },
    });
  });

  it("returns the new row id", async () => {
    createMock.mockResolvedValue({ id: "log_xyz" });
    const id = await logAdminAction({
      adminId: "u_admin",
      action: "NOTIFICATION_BROADCAST",
      payload: { sent: 5, failed: 0 },
    });
    expect(id).toBe("log_xyz");
  });
});
