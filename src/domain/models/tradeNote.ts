import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** Free-form markdown note attached to a trade (market context, mistakes, lessons…). */
export const tradeNoteSchema = z.object({
  id: idSchema,
  tradeId: idSchema,
  content: z.string().default(""), // markdown
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type TradeNote = z.infer<typeof tradeNoteSchema>;

export const tradeNoteInputSchema = tradeNoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type TradeNoteInput = z.infer<typeof tradeNoteInputSchema>;
