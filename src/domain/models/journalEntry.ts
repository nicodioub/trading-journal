import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** A free-form journal entry — unstructured reflection, separate from per-trade notes. */
export const journalEntrySchema = z.object({
  id: idSchema,
  /** ISO date (yyyy-MM-dd) the entry is filed under. */
  date: timestampSchema,
  content: z.string().default(""),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const journalEntryInputSchema = journalEntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type JournalEntryInput = z.infer<typeof journalEntryInputSchema>;
