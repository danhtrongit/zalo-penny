import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export const listTransactions = async (req: AuthRequest, res: Response) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const category = req.query.category as string | undefined;
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "20");

  const where: Record<string, unknown> = { userId: req.userId! };

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.date = dateFilter;
  }

  if (category) where.category = category;

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
      include: { receipt: { select: { id: true, fileUrl: true, fileType: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    data: transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
};

export const getTransaction = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const tx = await prisma.transaction.findFirst({
    where: { id, userId: req.userId! },
    include: { receipt: true },
  });

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json(tx);
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
  const { description, amount, category, date } = req.body;
  const id = req.params.id as string;

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: req.userId! },
  });

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(description !== undefined && { description }),
      ...(amount !== undefined && { amount }),
      ...(category !== undefined && { category }),
      ...(date !== undefined && { date: new Date(date) }),
    },
  });

  res.json(updated);
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: req.userId! },
  });

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  await prisma.transaction.delete({ where: { id } });

  res.json({ message: "Transaction deleted" });
};
