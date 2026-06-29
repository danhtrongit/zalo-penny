import { Response } from "express";
import prisma from "../config/prisma";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyMagicToken,
} from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { HttpError } from "../middlewares/error.middleware";
import { resolveReferrer, ensureUserReferralCode } from "../services/referral.service";

export const register = async (req: AuthRequest, res: Response) => {
  const { phone, password, name, email, referralCode } = req.body as {
    phone: string;
    password: string;
    name: string;
    email?: string;
    referralCode?: string;
  };

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new HttpError(409, "Số điện thoại đã được đăng ký");

  // Attribute the signup to a referrer if a valid code was entered. Unknown
  // codes are silently ignored — they must never block registration.
  const referredById = await resolveReferrer(referralCode);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { phone, passwordHash, name, email: email || null, referredById },
    select: { id: true, phone: true, email: true, name: true, role: true, createdAt: true },
  });

  // Give every new user their own shareable code right away.
  await ensureUserReferralCode(user.id);

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

// Exchange a short-lived chat magic-link token for a normal session token.
export const magic = async (req: AuthRequest, res: Response) => {
  const { token } = req.body as { token: string };

  let userId: string;
  try {
    ({ userId } = verifyMagicToken(token));
  } catch {
    throw new HttpError(401, "Liên kết đăng nhập không hợp lệ hoặc đã hết hạn");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) throw new HttpError(401, "Không tìm thấy người dùng");

  const sessionToken = signToken({ userId: user.id, role: user.role });
  res.json({ user, token: sessionToken });
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
      botAssignment: {
        select: { status: true },
      },
    },
  });

  if (!user) throw new HttpError(404, "Không tìm thấy người dùng");

  const botConnection = user.botConfig
    ? {
        kind: "OWNED" as const,
        status: user.botConfig.isActive ? ("LINKED" as const) : ("PENDING_LINK" as const),
        isActive: user.botConfig.isActive,
      }
    : user.botAssignment
      ? {
          kind: "POOL" as const,
          status: user.botAssignment.status,
          isActive: user.botAssignment.status === "LINKED",
        }
      : null;

  res.json({ ...user, botConnection });
};
