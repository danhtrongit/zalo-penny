import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { vnDateStr, startOfVnDay, vnDateRange } from "../../utils/vn-time";

export const overview = async (_req: AuthRequest, res: Response) => {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    totalUsers,
    lockedUsers,
    activeSubs,
    pendingSubs,
    paidThisMonth,
    revenueAllTime,
    revenueThisMonth,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isLocked: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "PENDING" } }),
    prisma.payment.count({
      where: { status: "PAID", paidAt: { gte: startOfMonth } },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, phone: true, name: true, createdAt: true },
    }),
  ]);

  res.json({
    totalUsers,
    lockedUsers,
    activeSubs,
    pendingSubs,
    paidThisMonth,
    revenueAllTime: revenueAllTime._sum.amount ?? 0,
    revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
    recentSignups,
  });
};

/**
 * GET /api/admin/stats/timeseries?metric=revenue|signups&range=7d|30d|90d
 * Daily buckets (VN calendar days), zero-filled across the range.
 */
export const timeseries = async (req: AuthRequest, res: Response) => {
  const { metric, range } = req.query as unknown as {
    metric: "revenue" | "signups";
    range: "7d" | "30d" | "90d";
  };
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const dates = vnDateRange(days);
  const gte = startOfVnDay(dates[0]);
  const counts = new Map<string, number>(dates.map((d) => [d, 0]));

  if (metric === "signups") {
    const rows = await prisma.user.findMany({
      where: { createdAt: { gte } },
      select: { createdAt: true },
    });
    for (const r of rows) {
      const k = vnDateStr(r.createdAt);
      if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
    }
  } else {
    const rows = await prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte } },
      select: { paidAt: true, amount: true },
    });
    for (const r of rows) {
      if (!r.paidAt) continue;
      const k = vnDateStr(r.paidAt);
      if (counts.has(k)) counts.set(k, counts.get(k)! + r.amount);
    }
  }

  res.json({ points: dates.map((d) => ({ date: d, value: counts.get(d) ?? 0 })) });
};
