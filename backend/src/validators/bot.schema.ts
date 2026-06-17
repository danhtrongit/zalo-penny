import { z } from "zod";

export const connectBotBody = z.object({
  botToken: z.string().min(10).max(500).trim(),
});

export const verifyBotBody = z.object({
  verifyId: z.string().uuid(),
});

export const migrateBotBody = z.object({
  force: z.boolean().optional(),
});

export type ConnectBotInput = z.infer<typeof connectBotBody>;
export type VerifyBotInput = z.infer<typeof verifyBotBody>;
export type MigrateBotInput = z.infer<typeof migrateBotBody>;
