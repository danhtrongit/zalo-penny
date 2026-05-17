import { z } from "zod";

export const broadcastBody = z.object({
  message: z.string().min(1).max(2000),
  personalized: z.boolean().optional().default(false),
});

export const listUsersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type BroadcastInput = z.infer<typeof broadcastBody>;
