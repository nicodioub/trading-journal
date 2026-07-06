import { format, subDays } from "date-fns";
import type { ChessStats } from "../models";

/** Win rate as a 0–100 percentage. */
export function chessWinRate(
  stats: Pick<ChessStats, "gamesPlayed" | "gamesWon">,
): number {
  return stats.gamesPlayed > 0
    ? (stats.gamesWon / stats.gamesPlayed) * 100
    : 0;
}

/** Today as an ISO date (yyyy-MM-dd). */
export function currentChessDay(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export interface ChessContext {
  today: { played: number; won: number; lost: number; winRate: number } | null;
  /** Weighted win rate (total wins / total games) over the trailing 7/30 days, excluding today. */
  avg7d: number | null;
  avg30d: number | null;
  gamesPlayed7d: number;
  gamesPlayed30d: number;
}

function weightedWinRate(list: ChessStats[]): number | null {
  const played = list.reduce((sum, s) => sum + s.gamesPlayed, 0);
  if (played === 0) return null;
  const won = list.reduce((sum, s) => sum + s.gamesWon, 0);
  return (won / played) * 100;
}

/**
 * Bundles today's chess performance against the trader's own rolling
 * baseline — raw win rates mean nothing without a personal reference point.
 * Used as objective, day-of-session evidence alongside the written
 * psychology check-in.
 */
export function computeChessContext(stats: ChessStats[], todayDate: string): ChessContext {
  const today = stats.find((s) => s.date === todayDate);
  const todayCtx =
    today && today.gamesPlayed > 0
      ? {
          played: today.gamesPlayed,
          won: today.gamesWon,
          lost: today.gamesLost,
          winRate: chessWinRate(today),
        }
      : null;

  const cutoff7 = subDays(new Date(todayDate), 7);
  const cutoff30 = subDays(new Date(todayDate), 30);
  const priorDays = (cutoff: Date) =>
    stats.filter((s) => s.date !== todayDate && s.gamesPlayed > 0 && new Date(s.date) >= cutoff);

  const in7 = priorDays(cutoff7);
  const in30 = priorDays(cutoff30);

  return {
    today: todayCtx,
    avg7d: weightedWinRate(in7),
    avg30d: weightedWinRate(in30),
    gamesPlayed7d: in7.reduce((sum, s) => sum + s.gamesPlayed, 0),
    gamesPlayed30d: in30.reduce((sum, s) => sum + s.gamesPlayed, 0),
  };
}
