import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";

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
