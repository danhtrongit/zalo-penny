import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getStats = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const now = new Date();

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: startOfMonth } },
  });

  const todayTotal = transactions
    .filter((t) => t.date >= startOfDay)
    .reduce((s, t) => s + t.amount, 0);
  const weekTotal = transactions
    .filter((t) => t.date >= startOfWeek)
    .reduce((s, t) => s + t.amount, 0);
  const monthTotal = transactions.reduce((s, t) => s + t.amount, 0);

  const categories: Record<string, number> = {};
  for (const t of transactions) {
    categories[t.category] = (categories[t.category] || 0) + t.amount;
  }

  const budget = await prisma.budget.findFirst({
    where: { userId, type: "MONTHLY" },
  });

  res.json({
    today: todayTotal,
    week: weekTotal,
    month: monthTotal,
    budget: budget
      ? { amount: budget.amount, used: monthTotal, remaining: budget.amount - monthTotal }
      : null,
    categories,
    transactionCount: transactions.length,
  });
};

export const getRecent = async (req: AuthRequest, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId! },
    orderBy: { date: "desc" },
    take: 20,
    include: { receipt: { select: { id: true, fileUrl: true, fileType: true } } },
  });

  res.json(transactions);
};
