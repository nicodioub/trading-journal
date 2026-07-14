import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/**
 * A saved weekly growth plan for an account. One per account — saving a new
 * plan replaces the previous one. Persists until explicitly deleted, so
 * progress can be tracked against it over time rather than recomputed fresh
 * on every visit to the Planning page.
 */
export const planningObjectiveSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  /** Account balance the plan was projected from. */
  startBalance: z.number(),
  weeklyGrowthPercent: z.number(),
  weeks: z.number().int().positive(),
  startDate: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type PlanningObjective = z.infer<typeof planningObjectiveSchema>;

export const planningObjectiveInputSchema = planningObjectiveSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type PlanningObjectiveInput = z.infer<typeof planningObjectiveInputSchema>;
