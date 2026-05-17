import { z } from "zod";

export const connectBotBody = z.object({
  botToken: z.string().min(10).max(500).trim(),
});

export const verifyBotBody = z.object({
  verifyId: z.string().uuid(),
});

export type ConnectBotInput = z.infer<typeof connectBotBody>;
export type VerifyBotInput = z.infer<typeof verifyBotBody>;
