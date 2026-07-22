import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/**
 * A saved Mentor conversation — the trader's live emotional-regulation chat
 * while a trade is open. Each conversation is a series of turns; every mentor
 * turn carries a structured analysis (scores/intervention level) so the UI
 * never has to parse free text. Stored as one row with the turns as JSON,
 * mirroring how first_thoughts stores its nested payloads.
 */

export const mentorRoleSchema = z.enum(["user", "mentor"]);
export type MentorRole = z.infer<typeof mentorRoleSchema>;

export const planStatusSchema = z.enum(["INTACT", "UNCERTAIN", "INVALIDATED"]);
export type PlanStatus = z.infer<typeof planStatusSchema>;

/** Backend-only severity ladder. Kept for scoring/history; not surfaced verbatim in the chat. */
export const interventionLevelSchema = z.enum(["OBSERVE", "GROUND", "PAUSE", "LOCKDOWN"]);
export type InterventionLevel = z.infer<typeof interventionLevelSchema>;

/**
 * The softer, human-facing read on where the trader's head is right now. This
 * is what the conversation surfaces instead of the clinical intervention level.
 */
export const internalStateSchema = z.enum([
  "Settled",
  "Emotionally activated",
  "Conflicted",
  "Outcome-attached",
  "Seeking stimulation",
  // Formerly "Fear-driven" — renamed so the label reads as protective, not alarming.
  "Protective",
  "Processing a significant result",
]);
export type InternalState = z.infer<typeof internalStateSchema>;

/** The structured read the Mentor attaches to each of its replies. */
export const mentorAnalysisSchema = z.object({
  emotionalActivation: z.number().min(0).max(100),
  planAlignment: z.number().min(0).max(100),
  impulsiveActionRisk: z.number().min(0).max(100),
  mainCognitiveRisk: z.string().default(""),
  planStatus: planStatusSchema,
  objectiveChangeDetected: z.boolean().default(false),
  /** Backend severity, retained for pattern history. Not shown as a command. */
  interventionLevel: interventionLevelSchema,
  /** The human-facing state label shown in the conversation. `.catch` keeps
   *  older saved conversations (e.g. the retired "Fear-driven" value) loadable. */
  internalState: internalStateSchema.catch("Settled").default("Settled"),
  /** A non-commanding observation of what may be happening — replaces the old "recommended action". */
  whatImNoticing: z.string().default(""),
  question: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0),
});
export type MentorAnalysis = z.infer<typeof mentorAnalysisSchema>;

export const mentorMessageSchema = z.object({
  role: mentorRoleSchema,
  content: z.string(),
  createdAt: timestampSchema,
  /** Present on mentor turns only; user turns carry null. */
  analysis: mentorAnalysisSchema.nullable().default(null),
});
export type MentorMessage = z.infer<typeof mentorMessageSchema>;

export const mentorConversationSchema = z.object({
  id: idSchema,
  /** When the conversation started (ISO timestamp). */
  date: timestampSchema,
  /** Short label derived from the opening message. */
  title: z.string().default(""),
  /** The open trade the trader was focused on, if any. Not a FK — kept even if the trade is later deleted. */
  focusTradeId: idSchema.nullable().default(null),
  messages: z.array(mentorMessageSchema).default([]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type MentorConversation = z.infer<typeof mentorConversationSchema>;

export const mentorConversationInputSchema = mentorConversationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type MentorConversationInput = z.infer<typeof mentorConversationInputSchema>;
