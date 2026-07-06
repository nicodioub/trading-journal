import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** A personal trading rule, shown on the Rules page as a standing checklist. */
export const tradingRuleSchema = z.object({
  id: idSchema,
  content: z.string().min(1, "Rule can't be empty"),
  createdAt: timestampSchema,
});
export type TradingRule = z.infer<typeof tradingRuleSchema>;

export const tradingRuleInputSchema = tradingRuleSchema.omit({
  id: true,
  createdAt: true,
});
export type TradingRuleInput = z.infer<typeof tradingRuleInputSchema>;
