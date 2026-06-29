import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { getCommissionPct, setCommissionPct } from "../../services/referral.service";
import { isValidCommissionPct } from "../../services/referral-code";
import { HttpError } from "../../middlewares/error.middleware";
import { logAdminAction } from "../../services/admin-audit.service";

// Referral / commission settings overview for the admin panel.
export const getSettings = async (_req: AuthRequest, res: Response) => {
  const [commissionPct, referredUsers, agg] = await Promise.all([
    getCommissionPct(),
    prisma.user.count({ where: { referredById: { not: null } } }),
    prisma.referralCommission.aggregate({ _sum: { amount: true }, _count: true }),
  ]);
  res.json({
    commissionPct,
    referredUsers,
    totalCommission: agg._sum.amount ?? 0,
    commissionCount: agg._count,
  });
};

export const updateCommission = async (req: AuthRequest, res: Response) => {
  const { pct } = req.body as { pct: number };
  if (!isValidCommissionPct(pct)) {
    throw new HttpError(400, "Hoa hồng phải là số nguyên từ 0 đến 100");
  }
  await setCommissionPct(pct);
  await logAdminAction({
    adminId: req.userId!,
    action: "COMMISSION_UPDATE",
    payload: { pct },
    summary: `Set referral commission to ${pct}%`,
  });
  res.json({ commissionPct: pct });
};
