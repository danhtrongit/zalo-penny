import { z } from "zod";

export const broadcastBody = z.object({
  message: z.string().min(1).max(2000),
  personalized: z.boolean().optional().default(false),
  planSlugs: z.array(z.string().min(1)).optional(),
});

export const listUsersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(60).optional(),
});

export const userIdParams = z.object({ id: z.string().min(1).max(64) });
export const userIdParam = z.object({ userId: z.string().min(1).max(64) });

export const lockUserBody = z.object({
  reason: z.string().max(200).optional(),
});

export const changeRoleBody = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

export const planCreateBody = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug chỉ chứa chữ thường, số và dấu gạch ngang"),
  durationDays: z.number().int().positive().max(3650),
  price: z.number().int().nonnegative(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional().default(true),
});

export const planUpdateBody = planCreateBody.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Cần ít nhất một trường để cập nhật" }
);

export const planIdParams = z.object({ id: z.string().min(1).max(64) });

export const listPaymentsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "PAID", "FAILED"]).optional(),
  search: z.string().max(60).optional(),
});

export const manualUpgradeBody = z.object({
  planSlug: z.string().min(1).max(60),
  durationDays: z.number().int().positive().max(3650).optional(),
  note: z.string().max(500).optional(),
});

export const sendToUserBody = z.object({
  message: z.string().min(1).max(2000),
});

export const sendToUsersBody = z.object({
  userIds: z.array(z.string().min(1).max(64)).min(1).max(500),
  message: z.string().min(1).max(2000),
  personalized: z.boolean().optional().default(false),
});

export const timeseriesQuery = z.object({
  metric: z.enum(["revenue", "signups"]),
  range: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
});

export const reminderListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  kind: z.enum(["MORNING", "EVENING"]).optional(),
});

export const reminderStatsQuery = z.object({
  days: z.coerce.number().int().positive().max(90).default(14),
});

export const auditListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  action: z.string().max(60).optional(),
});

export const botCreateBody = z.object({
  label: z.string().min(1).max(80),
  botToken: z.string().min(10).max(500).trim(),
  capacity: z.number().int().positive().max(50).optional().default(5),
  botLink: z.string().max(300).optional(),
  qrImageUrl: z.string().max(2_000_000).optional(), // data URL
  isActive: z.boolean().optional().default(true),
});

export const botUpdateBody = botCreateBody.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Cần ít nhất một trường để cập nhật" }
);

export const botIdParams = z.object({ id: z.string().min(1).max(64) });

export const commissionUpdateBody = z.object({
  pct: z.number().int().min(0).max(100),
});
