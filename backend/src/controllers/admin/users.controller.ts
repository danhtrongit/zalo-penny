import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../middlewares/error.middleware";
import { logAdminAction } from "../../services/admin-audit.service";
import { deleteUserCompletely } from "../../services/user-deletion.service";

export const list = async (req: AuthRequest, res: Response) => {
  const { page, limit, search } = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
  };
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { phone: { contains: search } },
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        isLocked: true,
        lockedAt: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            endDate: true,
            plan: { select: { name: true, slug: true } },
          },
        },
        botConfig: { select: { isActive: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
};

export const detail = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscription: { include: { plan: true, payment: true } },
      botConfig: true,
      persona: true,
      _count: {
        select: { transactions: true, receipts: true, budgets: true },
      },
    },
  });
  if (!user) throw new HttpError(404, "Không tìm thấy người dùng");
  res.json(user);
};

export const lock = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { reason } = req.body as { reason?: string };

  if (id === req.userId) {
    throw new HttpError(400, "Không thể tự khoá tài khoản của chính mình");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isLocked: true, lockedAt: new Date(), lockedReason: reason ?? null },
    select: { id: true, isLocked: true, lockedAt: true, lockedReason: true },
  });

  await logAdminAction({
    adminId: req.userId!,
    action: "USER_LOCK",
    payload: { targetUserId: id, reason: reason ?? null },
    summary: `Locked user ${id}${reason ? ` (${reason})` : ""}`,
  });

  res.json(updated);
};

export const unlock = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const updated = await prisma.user.update({
    where: { id },
    data: { isLocked: false, lockedAt: null, lockedReason: null },
    select: { id: true, isLocked: true },
  });

  await logAdminAction({
    adminId: req.userId!,
    action: "USER_UNLOCK",
    payload: { targetUserId: id },
    summary: `Unlocked user ${id}`,
  });

  res.json(updated);
};

export const changeRole = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { role } = req.body as { role: "USER" | "ADMIN" };

  if (id === req.userId && role === "USER") {
    throw new HttpError(400, "Không thể tự hạ quyền admin của chính mình");
  }

  const before = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!before) throw new HttpError(404, "Không tìm thấy người dùng");

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, role: true },
  });

  await logAdminAction({
    adminId: req.userId!,
    action: "USER_ROLE_CHANGE",
    payload: { targetUserId: id, before: before.role, after: role },
    summary: `Role: ${before.role} → ${role} for ${id}`,
  });

  res.json(updated);
};

export const remove = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, phone: true, name: true, email: true },
  });
  if (!user) throw new HttpError(404, "Không tìm thấy người dùng");

  if (id === req.userId) {
    throw new HttpError(400, "Không thể tự xoá tài khoản của chính mình");
  }
  if (user.role === "ADMIN") {
    throw new HttpError(400, "Không thể xoá tài khoản admin. Hãy hạ quyền về USER trước.");
  }

  const counts = await deleteUserCompletely(id);

  await logAdminAction({
    adminId: req.userId!,
    action: "USER_DELETE",
    payload: { targetUserId: id, phone: user.phone, name: user.name, email: user.email, counts },
    summary: `Deleted user ${id} (${user.phone})`,
  });

  res.json({ ok: true, deleted: counts });
};
