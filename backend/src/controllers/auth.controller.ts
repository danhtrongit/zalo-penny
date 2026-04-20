import { Response } from "express";
import prisma from "../config/prisma";
import { hashPassword, verifyPassword, signToken } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";

const PHONE_REGEX = /^0\d{9,10}$/;

/** Strip invisible Unicode chars (RTL marks, zero-width spaces, etc.) and whitespace */
function cleanPhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");  // keep only digits
}

export const register = async (req: AuthRequest, res: Response) => {
  const { password, name, email } = req.body;
  const phone = req.body.phone ? cleanPhone(String(req.body.phone)) : "";

  if (!phone || !password || !name) {
    res.status(400).json({ error: "Số điện thoại, mật khẩu và tên là bắt buộc" });
    return;
  }

  if (!PHONE_REGEX.test(phone)) {
    res.status(400).json({ error: "Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 chữ số)" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    res.status(409).json({ error: "Phone number already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { phone, passwordHash, name, email: email || null },
    select: { id: true, phone: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = signToken({ userId: user.id, role: user.role });

  res.status(201).json({ user, token });
};

export const login = async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  const phone = req.body.phone ? cleanPhone(String(req.body.phone)) : "";

  if (!phone || !password) {
    res.status(400).json({ error: "Số điện thoại và mật khẩu là bắt buộc" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

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

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
};
