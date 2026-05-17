import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { HttpError } from "../middlewares/error.middleware";

export const listTransactions = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, category, page, limit } = req.query as unknown as {
    startDate?: string;
    endDate?: string;
    category?: string;
    page: number;
    limit: number;
  };

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

  if (!tx) throw new HttpError(404, "Không tìm thấy giao dịch");

  res.json(tx);
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
  const { description, amount, category, date } = req.body as {
    description?: string;
    amount?: number;
    category?: string;
    date?: string;
  };
  const id = req.params.id as string;

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!tx) throw new HttpError(404, "Không tìm thấy giao dịch");

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
  if (!tx) throw new HttpError(404, "Không tìm thấy giao dịch");

  await prisma.transaction.delete({ where: { id } });

  res.json({ message: "Đã xoá giao dịch" });
};
