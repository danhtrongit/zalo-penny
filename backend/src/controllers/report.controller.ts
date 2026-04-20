import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getReport = async (req: AuthRequest, res: Response) => {
  const { period = "month", startDate, endDate } = req.query;

  const now = new Date();
  let start: Date;
  let end: Date = now;

  if (startDate && endDate) {
    start = new Date(startDate as string);
    end = new Date(endDate as string);
  } else {
    switch (period) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case "month":
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.userId!,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "desc" },
  });

  const total = transactions.reduce((s, t) => s + t.amount, 0);

  const categories: Record<string, { total: number; count: number }> = {};
  for (const t of transactions) {
    if (!categories[t.category]) {
      categories[t.category] = { total: 0, count: 0 };
    }
    categories[t.category].total += t.amount;
    categories[t.category].count++;
  }

  const budget = await prisma.budget.findFirst({
    where: { userId: req.userId!, type: "MONTHLY" },
  });

  res.json({
    period,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    total,
    transactionCount: transactions.length,
    categories,
    budget: budget ? { amount: budget.amount, used: total } : null,
    transactions,
  });
};
