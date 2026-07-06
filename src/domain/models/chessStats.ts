import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/**
 * Daily chess performance — the trader's "cognitive thermometer".
 * Designed to be correlated with trading performance later.
 */
export const chessStatsSchema = z.object({
  id: idSchema,
  /** ISO date (yyyy-MM-dd) this rating belongs to, one per day. */
  date: timestampSchema,
  gamesPlayed: z.number().int().nonnegative().default(0),
  gamesWon: z.number().int().nonnegative().default(0),
  gamesLost: z.number().int().nonnegative().default(0),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type ChessStats = z.infer<typeof chessStatsSchema>;

export const chessStatsInputSchema = chessStatsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ChessStatsInput = z.infer<typeof chessStatsInputSchema>;
