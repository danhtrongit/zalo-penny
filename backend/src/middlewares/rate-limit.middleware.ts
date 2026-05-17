import rateLimit, { Options } from "express-rate-limit";
import { env } from "../config/env";

const baseConfig: Partial<Options> = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please retry later." },
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
  message: { error: "Too many auth attempts, please retry in 15 minutes." },
});

export const paymentLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: 30,
});
