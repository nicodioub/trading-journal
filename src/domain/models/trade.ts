import { z } from "zod";
import { idSchema, timestampSchema, directionSchema } from "./common";

export const tradeStatusSchema = z.enum(["open", "closed"]);
export type TradeStatus = z.infer<typeof tradeStatusSchema>;

/** Result classification of a closed trade. */
export const tradeOutcomeSchema = z.enum(["win", "loss", "breakeven", "open"]);
export type TradeOutcome = z.infer<typeof tradeOutcomeSchema>;

export const tradeSchema = z.object({
  id: idSchema,
  accountId: idSchema,

  date: timestampSchema, // entry time
  closedAt: timestampSchema.nullable().default(null),
  pair: z.string().min(1, "Pair is required"),
  direction: directionSchema,
  status: tradeStatusSchema.default("closed"),

  entryPrice: z.number(),
  exitPrice: z.number().nullable().default(null),
  stopLoss: z.number().nullable().default(null),
  takeProfit: z.number().nullable().default(null),

  riskPercent: z.number().nullable().default(null),
  resultPercent: z.number().nullable().default(null),
  resultAmount: z.number().nullable().default(null), // in account currency
  rrAchieved: z.number().nullable().default(null),

  strategy: z.string().default(""),
  setup: z.string().default(""),
  reasonEntry: z.string().default(""),
  reasonExit: z.string().default(""),
  emotionBefore: z.string().default(""),
  emotionAfter: z.string().default(""),
  lessons: z.string().default(""),
  tags: z.array(z.string()).default([]),

  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Trade = z.infer<typeof tradeSchema>;

export const tradeInputSchema = tradeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type TradeInput = z.infer<typeof tradeInputSchema>;
