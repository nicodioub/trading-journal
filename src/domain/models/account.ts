import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const accountTypeSchema = z.enum(["prop", "personal", "demo"]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const accountStatusSchema = z.enum([
  "active",
  "passed",
  "failed",
  "archived",
]);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const accountSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Account name is required"),
  broker: z.string().default(""),
  platform: z.string().default(""),
  type: accountTypeSchema.default("personal"),
  currency: z.string().default("USD"),
  initialCapital: z.number().nonnegative(),
  currentBalance: z.number(),
  currentEquity: z.number(),
  /** Configured max drawdown limit, as a percent of initial capital (e.g. FTMO = 10). */
  maxDrawdown: z.number().nonnegative().default(0),
  /** Profit target in account currency. */
  targetProfit: z.number().nonnegative().default(0),
  status: accountStatusSchema.default("active"),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Account = z.infer<typeof accountSchema>;

/**
 * Shape accepted when creating an account. The data layer fills in id,
 * timestamps, and seeds balance/equity from initialCapital when omitted.
 */
export const accountInputSchema = accountSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    currentBalance: true,
    currentEquity: true,
  })
  .extend({
    currentBalance: z.number().optional(),
    currentEquity: z.number().optional(),
  });
export type AccountInput = z.infer<typeof accountInputSchema>;
