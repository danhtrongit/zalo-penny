import { Response } from "express";
import prisma from "../config/prisma";
import { hashPassword, verifyPassword, signToken } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { HttpError } from "../middlewares/error.middleware";

export const register = async (req: AuthRequest, res: Response) => {
  const { phone, password, name, email } = req.body as {
    phone: string;
    password: string;
    name: string;
    email?: string;
  };

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new HttpError(409, "Số điện thoại đã được đăng ký");

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { phone, passwordHash, name, email: email || null },
    select: { id: true, phone: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = signToken({ userId: user.id, role: user.role });

  res.status(201).json({ user, token });
};

export const login = async (req: AuthRequest, res: Response) => {
  const { phone, password } = req.body as { phone: string; password: string };

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new HttpError(401, "Số điện thoại hoặc mật khẩu không đúng");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new HttpError(401, "Số điện thoại hoặc mật khẩu không đúng");

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  });
};

export const me = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      subscription: {
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          plan: { select: { name: true, slug: true } },
        },
      },
      botConfig: {
        select: { id: true, isActive: true, connectedAt: true },
      },
    },
  });

  if (!user) throw new HttpError(404, "Không tìm thấy người dùng");

  res.json(user);
};
