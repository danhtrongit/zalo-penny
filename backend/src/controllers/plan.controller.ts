import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export const listPlans = async (_req: AuthRequest, res: Response) => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { durationDays: "asc" },
  });
  res.json(plans);
};
