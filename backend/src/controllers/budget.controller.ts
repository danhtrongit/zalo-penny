import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getBudgets = async (req: AuthRequest, res: Response) => {
  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId! },
  });
  res.json(budgets);
};

export const setBudget = async (req: AuthRequest, res: Response) => {
  const { type, amount } = req.body;

  if (!type || !amount) {
    res.status(400).json({ error: "type and amount are required" });
    return;
  }

  if (!["WEEKLY", "MONTHLY"].includes(type)) {
    res.status(400).json({ error: "type must be WEEKLY or MONTHLY" });
    return;
  }

  const budget = await prisma.budget.upsert({
    where: { userId_type: { userId: req.userId!, type } },
    update: { amount },
    create: { userId: req.userId!, type, amount },
  });

  res.json(budget);
};
