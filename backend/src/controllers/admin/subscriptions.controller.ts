import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../middlewares/error.middleware";
import { logAdminAction } from "../../services/admin-audit.service";
import { archiveSubscription } from "../../services/subscription-archive.service";
import { assignBotToUser, releaseAssignment } from "../../services/bot-pool.service";
import { logger } from "../../utils/logger";

interface ManualUpgradeInput {
  planSlug: string;
  durationDays?: number; // override
  note?: string;
}

/**
 * POST /api/admin/subscriptions/users/:userId/upgrade
 * Activate (or replace) a subscription for the target user without going through SePay.
 * If the user has an existing subscription, it is archived to SubscriptionAudit
 * (reason=REPLACED) before the new one is written.
 */
export const manualUpgrade = async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId as string;
  const { planSlug, durationDays, note } = req.body as ManualUpgradeInput;

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new HttpError(404, "Không tìm thấy gói");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "Không tìm thấy người dùng");

  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) {
    await archiveSubscription({
      subscriptionId: existing.id,
      reason: "REPLACED",
      notes: `Manual upgrade by admin ${req.userId!} to ${planSlug}`,
    });
    await releaseAssignment(userId);
  }

  const now = new Date();
  const days = durationDays ?? plan.durationDays;
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);
  const invoiceNumber = `MANUAL-${Date.now()}-${userId.slice(-6)}`;

  const sub = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      invoiceNumber,
      status: "ACTIVE",
      startDate: now,
      endDate,
    },
    include: { plan: true },
  });

  await prisma.payment.create({
    data: {
      subscriptionId: sub.id,
      amount: plan.price,
      status: "PAID",
      paidAt: now,
      method: "MANUAL_ADMIN",
      transactionId: `MANUAL-${req.userId!}-${Date.now()}`,
    },
  });

  try {
    const assignment = await assignBotToUser(userId);
    if (!assignment) {
      logger.warn({ userId }, "POOL_FULL on manual upgrade — user awaiting bot");
    }
  } catch (err) {
    logger.error({ err, userId }, "Bot auto-assign failed on manual upgrade");
  }

  await logAdminAction({
    adminId: req.userId!,
    action: "SUBSCRIPTION_MANUAL_UPGRADE",
    payload: { targetUserId: userId, planSlug, durationDays: days, note: note ?? null },
    summary: `Manual upgrade ${userId} → ${planSlug} (${days}d)`,
  });

  res.status(201).json(sub);
};

/**
 * GET /api/admin/subscriptions/audit
 * Paginated audit log of ALL admin actions (filter optional by action).
 */
export const auditList = async (req: AuthRequest, res: Response) => {
  const { page, limit, action } = req.query as unknown as {
    page: number;
    limit: number;
    action?: string;
  };
  const skip = (page - 1) * limit;

  const where = action ? { action: action as never } : {};

  const [data, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { id: true, phone: true, name: true } },
      },
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
};
