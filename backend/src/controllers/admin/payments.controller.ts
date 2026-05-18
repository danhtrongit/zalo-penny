import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const list = async (req: AuthRequest, res: Response) => {
  const { page, limit, status, search } = req.query as unknown as {
    page: number;
    limit: number;
    status?: "PENDING" | "PAID" | "FAILED";
    search?: string;
  };
  const skip = (page - 1) * limit;

  const where: {
    status?: "PENDING" | "PAID" | "FAILED";
    subscription?: {
      OR?: Array<{ invoiceNumber?: { contains: string }; user?: { phone?: { contains: string } } }>;
    };
  } = {};
  if (status) where.status = status;
  if (search) {
    where.subscription = {
      OR: [
        { invoiceNumber: { contains: search } },
        { user: { phone: { contains: search } } },
      ],
    };
  }

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          include: {
            user: { select: { id: true, phone: true, name: true, email: true } },
            plan: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
};
