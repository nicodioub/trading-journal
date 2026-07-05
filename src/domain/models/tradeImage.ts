import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** Where in the trade lifecycle a screenshot was taken. */
export const tradeImageCategorySchema = z.enum([
  "before",
  "during",
  "after",
  "htf", // higher timeframe
  "ltf", // lower timeframe
  "other",
]);
export type TradeImageCategory = z.infer<typeof tradeImageCategorySchema>;

export const tradeImageSchema = z.object({
  id: idSchema,
  tradeId: idSchema,
  /** Path relative to the app's images directory (see storage service). */
  path: z.string(),
  caption: z.string().default(""),
  category: tradeImageCategorySchema.default("other"),
  createdAt: timestampSchema,
});
export type TradeImage = z.infer<typeof tradeImageSchema>;

export const tradeImageInputSchema = tradeImageSchema.omit({
  id: true,
  createdAt: true,
});
export type TradeImageInput = z.infer<typeof tradeImageInputSchema>;
