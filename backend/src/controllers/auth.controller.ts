import { Response } from "express";
import prisma from "../config/prisma";
import { hashPassword, verifyPassword, signToken } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";

const PHONE_REGEX = /^0\d{9,10}$/;

export const register = async (req: AuthRequest, res: Response) => {
  const { phone, password, name, email } = req.body;

  if (!phone || !password || !name) {
    res.status(400).json({ error: "Phone, password, and name are required" });
    return;
  }

  if (!PHONE_REGEX.test(phone)) {
    res.status(400).json({ error: "Invalid phone number. Must start with 0 and be 10-11 digits" });
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
  const { phone, password } = req.body;

  if (!phone || !password) {
    res.status(400).json({ error: "Phone and password are required" });
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
