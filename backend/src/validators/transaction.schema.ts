import { z } from "zod";

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid ISO date string",
  });

const positiveInt = z.coerce.number().int().positive();

export const listTransactionsQuery = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  category: z.string().max(60).optional(),
  page: positiveInt.default(1),
  limit: positiveInt.max(100).default(20),
});

export const transactionIdParams = z.object({
  id: z.string().min(1).max(64),
});

export const updateTransactionBody = z
  .object({
    description: z.string().min(1).max(200).optional(),
    amount: z.number().int().positive().optional(),
    category: z.string().min(1).max(60).optional(),
    date: dateString.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuery>;
export type UpdateTransactionBody = z.infer<typeof updateTransactionBody>;
