import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** How fit the declared window is for trading. */
export const readinessStatusSchema = z.enum(["no_trade", "caution", "ok"]);
export type ReadinessStatus = z.infer<typeof readinessStatusSchema>;

/** A self-declared trade/no-trade window, e.g. a hormone cycle phase or travel week. */
export const readinessRuleSchema = z
  .object({
    id: idSchema,
    /** ISO date (yyyy-MM-dd), inclusive. */
    startDate: timestampSchema,
    /** ISO date (yyyy-MM-dd), inclusive; equal to startDate for a single day. */
    endDate: timestampSchema,
    status: readinessStatusSchema,
    reason: z.string().default(""),
    createdAt: timestampSchema,
  })
  .refine((rule) => rule.endDate >= rule.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });
export type ReadinessRule = z.infer<typeof readinessRuleSchema>;

export const readinessRuleInputSchema = z
  .object({
    startDate: timestampSchema,
    endDate: timestampSchema,
    status: readinessStatusSchema,
    reason: z.string().default(""),
  })
  .refine((rule) => rule.endDate >= rule.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });
export type ReadinessRuleInput = z.infer<typeof readinessRuleInputSchema>;
