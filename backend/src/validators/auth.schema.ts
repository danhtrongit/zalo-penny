import { z } from "zod";
import { PHONE_REGEX } from "../config/constants";

const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[^\d]/g, ""))
  .refine((value) => PHONE_REGEX.test(value), {
    message: "Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 chữ số)",
  });

export const registerBody = z.object({
  phone: phoneSchema,
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(128),
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(255).optional().or(z.literal("").transform(() => undefined)),
  referralCode: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
});

export const loginBody = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(128),
});

export const magicBody = z.object({
  token: z.string().min(10).max(2000),
});

export type RegisterInput = z.infer<typeof registerBody>;
export type LoginInput = z.infer<typeof loginBody>;
export type MagicInput = z.infer<typeof magicBody>;
