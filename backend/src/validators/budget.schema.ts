import { z } from "zod";

export const setBudgetBody = z.object({
  type: z.enum(["WEEKLY", "MONTHLY"]),
  amount: z.number().int().positive(),
});

export type SetBudgetInput = z.infer<typeof setBudgetBody>;
