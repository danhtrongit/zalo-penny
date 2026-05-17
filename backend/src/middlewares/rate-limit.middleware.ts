import rateLimit, { Options } from "express-rate-limit";
import { env } from "../config/env";

const baseConfig: Partial<Options> = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu, vui lòng thử lại sau ít phút" },
};

export const generalLimiter = rateLimit({
  ...baseConfig,
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
});

export const authLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Bạn đã thử đăng nhập quá nhiều lần, vui lòng đợi 15 phút" },
});

export const paymentLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: 30,
});
