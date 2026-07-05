import { z } from "zod";
import { idSchema, timestampSchema, ratingSchema } from "./common";

/** Daily psychology check-in — the app's opening ritual before any trading. */
export const mentalCheckSchema = z.object({
  id: idSchema,
  /** The calendar day this check belongs to (ISO date, one per day). */
  date: timestampSchema,
  mood: ratingSchema,
  confidence: ratingSchema,
  stress: ratingSchema,
  energy: ratingSchema,
  sleptWell: z.boolean().default(true),
  notes: z.string().default(""),
  createdAt: timestampSchema,
});
export type MentalCheck = z.infer<typeof mentalCheckSchema>;

export const mentalCheckInputSchema = mentalCheckSchema.omit({
  id: true,
  createdAt: true,
});
export type MentalCheckInput = z.infer<typeof mentalCheckInputSchema>;
