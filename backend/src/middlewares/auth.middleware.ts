import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";
import prisma from "../config/prisma";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  isLocked?: boolean;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Bạn cần đăng nhập" });
    return;
  }

  let payload: { userId: string; role: string };
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
    return;
  }

  // Look up the user once per request to enforce real-time lock state.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isLocked: true },
  });

  if (!user) {
    res.status(401).json({ error: "Tài khoản không còn tồn tại" });
    return;
  }

  if (user.isLocked) {
    res.status(403).json({
      error: "Tài khoản đã bị khoá",
      reason: "ACCOUNT_LOCKED",
    });
    return;
  }

  req.userId = user.id;
  req.userRole = user.role;
  next();
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userRole !== "ADMIN") {
    res.status(403).json({ error: "Bạn không có quyền truy cập" });
    return;
  }
  next();
};
