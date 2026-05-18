import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../middlewares/error.middleware";
import { logAdminAction } from "../../services/admin-audit.service";

interface PlanInput {
  name: string;
  slug: string;
  durationDays: number;
  price: number;
  description?: string;
  isActive?: boolean;
}

export const list = async (_req: AuthRequest, res: Response) => {
  const plans = await prisma.plan.findMany({
    orderBy: { durationDays: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });
  res.json(plans);
};

export const create = async (req: AuthRequest, res: Response) => {
  const input = req.body as PlanInput;
  const existing = await prisma.plan.findUnique({ where: { slug: input.slug } });
  if (existing) throw new HttpError(409, "Slug đã được dùng");

  const plan = await prisma.plan.create({ data: input });
  await logAdminAction({
    adminId: req.userId!,
    action: "PLAN_CREATE",
    payload: { planId: plan.id, ...input },
    summary: `Created plan ${plan.slug} @ ${plan.price}đ / ${plan.durationDays}d`,
  });
  res.status(201).json(plan);
};

export const update = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const input = req.body as Partial<PlanInput>;
  const before = await prisma.plan.findUnique({ where: { id } });
  if (!before) throw new HttpError(404, "Không tìm thấy gói");

  const plan = await prisma.plan.update({ where: { id }, data: input });
  await logAdminAction({
    adminId: req.userId!,
    action: "PLAN_UPDATE",
    payload: { planId: id, before, after: input },
    summary: `Updated plan ${plan.slug}`,
  });
  res.json(plan);
};

export const remove = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: { _count: { select: { subscriptions: true } } },
  });
  if (!plan) throw new HttpError(404, "Không tìm thấy gói");
  if (plan._count.subscriptions > 0) {
    const updated = await prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
    await logAdminAction({
      adminId: req.userId!,
      action: "PLAN_DELETE",
      payload: { planId: id, softDeleted: true },
      summary: `Soft-disabled plan ${plan.slug} (had ${plan._count.subscriptions} subs)`,
    });
    res.json({ ok: true, softDeleted: true, plan: updated });
    return;
  }
  await prisma.plan.delete({ where: { id } });
  await logAdminAction({
    adminId: req.userId!,
    action: "PLAN_DELETE",
    payload: { planId: id, softDeleted: false },
    summary: `Deleted plan ${plan.slug}`,
  });
  res.json({ ok: true, softDeleted: false });
};
