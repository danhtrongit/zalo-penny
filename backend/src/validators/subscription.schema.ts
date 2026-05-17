import { z } from "zod";

export const createSubscriptionBody = z.object({
  planSlug: z.string().min(1).max(60),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionBody>;
