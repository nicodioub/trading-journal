import { format, startOfWeek } from "date-fns";
import type { ChessStats } from "../models";

/** Win rate as a 0–100 percentage. */
export function chessWinRate(
  stats: Pick<ChessStats, "gamesPlayed" | "gamesWon">,
): number {
  return stats.gamesPlayed > 0
    ? (stats.gamesWon / stats.gamesPlayed) * 100
    : 0;
}

/** ISO date (yyyy-MM-dd) of the Monday starting the week containing `date`. */
export function currentWeekStart(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}
