import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/**
 * One step of the pre-trade checklist. The `checked` state is persisted and
 * only cleared when the user resets the list — it does not roll over by date.
 */
export const checklistItemSchema = z.object({
  id: idSchema,
  label: z.string().min(1, "Item can't be empty"),
  checked: z.boolean().default(false),
  createdAt: timestampSchema,
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const checklistItemInputSchema = checklistItemSchema.omit({
  id: true,
  createdAt: true,
});
export type ChecklistItemInput = z.infer<typeof checklistItemInputSchema>;
