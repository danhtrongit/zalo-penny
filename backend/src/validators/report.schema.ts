import { z } from "zod";

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid ISO date string",
  });

export const getReportQuery = z
  .object({
    period: z.enum(["today", "week", "month"]).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
  })
  .refine(
    (value) =>
      (!value.startDate && !value.endDate) ||
      (!!value.startDate && !!value.endDate),
    { message: "startDate and endDate must be provided together" }
  );

export type GetReportQuery = z.infer<typeof getReportQuery>;
