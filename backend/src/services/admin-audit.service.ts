import prisma from "../config/prisma";
import { AdminAction, Prisma } from "../generated/prisma/client";

export interface LogAdminInput {
  adminId: string;
  action: AdminAction;
  payload: Prisma.InputJsonValue;
  summary?: string;
}

export async function logAdminAction(input: LogAdminInput): Promise<string> {
  const row = await prisma.adminAuditLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      payload: input.payload,
      summary: input.summary,
    },
  });
  return row.id;
}
