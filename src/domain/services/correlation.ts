import { format, startOfWeek } from "date-fns";
import type { ChessStats, MentalCheck, Trade } from "../models";
import { chessWinRate } from "./chessStats";
import { getOutcome } from "./tradeStats";

/**
 * Correlate psychology + chess "cognitive thermometer" data with trading
 * performance. This is the app's core thesis: mental state and chess sharpness
 * as leading indicators of trading results.
 *
 * Pearson's r is used throughout: +1 strong positive, 0 none, −1 strong negative.
 */

function dayKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

function weekKey(iso: string): string {
  return format(startOfWeek(new Date(iso), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

interface PeriodAgg {
  pnl: number;
  trades: number;
  wins: number;
}

function aggregate(trades: Trade[], keyFn: (iso: string) => string): Map<string, PeriodAgg> {
  const map = new Map<string, PeriodAgg>();
  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    const key = keyFn(trade.closedAt ?? trade.date);
    const agg = map.get(key) ?? { pnl: 0, trades: 0, wins: 0 };
    agg.pnl += trade.resultAmount ?? 0;
    agg.trades += 1;
    if (getOutcome(trade) === "win") agg.wins += 1;
    map.set(key, agg);
  }
  return map;
}

/** Pearson correlation coefficient. Null if <2 points or a variable has no variance. */
export function pearson(points: Array<[number, number]>): number | null {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  const cov = n * sxy - sx * sy;
  const varX = n * sxx - sx * sx;
  const varY = n * syy - sy * sy;
  const denom = Math.sqrt(varX * varY);
  if (denom === 0) return null;
  return cov / denom;
}

/* -------------------------- Psychology (daily) -------------------------- */

export interface DailyPsychologyPoint {
  date: string;
  mood: number;
  confidence: number;
  stress: number;
  energy: number;
  sleptWell: boolean;
  pnl: number;
  trades: number;
}

/** Days that have BOTH a mental check and at least one closed trade. */
export function buildDailyPsychologySeries(
  checks: MentalCheck[],
  trades: Trade[],
): DailyPsychologyPoint[] {
  const byDay = aggregate(trades, dayKey);
  return checks
    .map((c): DailyPsychologyPoint | null => {
      const agg = byDay.get(c.date);
      if (!agg) return null;
      return {
        date: c.date,
        mood: c.mood,
        confidence: c.confidence,
        stress: c.stress,
        energy: c.energy,
        sleptWell: c.sleptWell,
        pnl: agg.pnl,
        trades: agg.trades,
      };
    })
    .filter((p): p is DailyPsychologyPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface PsychologyCorrelations {
  sampleSize: number;
  moodVsPnl: number | null;
  confidenceVsPnl: number | null;
  stressVsPnl: number | null;
  energyVsPnl: number | null;
  avgPnlSleptWell: number | null;
  avgPnlSleptPoorly: number | null;
}

export function computePsychologyCorrelations(
  checks: MentalCheck[],
  trades: Trade[],
): PsychologyCorrelations {
  const series = buildDailyPsychologySeries(checks, trades);
  const corr = (select: (p: DailyPsychologyPoint) => number) =>
    pearson(series.map((p) => [select(p), p.pnl]));

  const avg = (values: number[]) =>
    values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

  return {
    sampleSize: series.length,
    moodVsPnl: corr((p) => p.mood),
    confidenceVsPnl: corr((p) => p.confidence),
    stressVsPnl: corr((p) => p.stress),
    energyVsPnl: corr((p) => p.energy),
    avgPnlSleptWell: avg(series.filter((p) => p.sleptWell).map((p) => p.pnl)),
    avgPnlSleptPoorly: avg(series.filter((p) => !p.sleptWell).map((p) => p.pnl)),
  };
}

/* ---------------------------- Chess (weekly) ---------------------------- */

export interface WeeklyChessPoint {
  weekStart: string;
  chessWinRate: number;
  gamesPlayed: number;
  pnl: number;
  trades: number;
  tradingWinRate: number;
}

/** Weeks that have chess games played AND at least one closed trade. */
export function buildWeeklyChessSeries(
  chessStats: ChessStats[],
  trades: Trade[],
): WeeklyChessPoint[] {
  const byWeek = aggregate(trades, weekKey);
  return chessStats
    .filter((s) => s.gamesPlayed > 0)
    .map((s): WeeklyChessPoint | null => {
      const agg = byWeek.get(s.weekStart);
      if (!agg || agg.trades === 0) return null;
      return {
        weekStart: s.weekStart,
        chessWinRate: chessWinRate(s),
        gamesPlayed: s.gamesPlayed,
        pnl: agg.pnl,
        trades: agg.trades,
        tradingWinRate: (agg.wins / agg.trades) * 100,
      };
    })
    .filter((p): p is WeeklyChessPoint => p !== null)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export interface ChessCorrelations {
  sampleSize: number;
  chessVsTradingWinRate: number | null;
  chessVsPnl: number | null;
}

export function computeChessCorrelations(
  chessStats: ChessStats[],
  trades: Trade[],
): ChessCorrelations {
  const series = buildWeeklyChessSeries(chessStats, trades);
  return {
    sampleSize: series.length,
    chessVsTradingWinRate: pearson(series.map((p) => [p.chessWinRate, p.tradingWinRate])),
    chessVsPnl: pearson(series.map((p) => [p.chessWinRate, p.pnl])),
  };
}

/** Qualitative label for a correlation coefficient. */
export function describeCorrelation(r: number | null): string {
  if (r === null) return "not enough data";
  const a = Math.abs(r);
  const strength = a < 0.2 ? "no" : a < 0.4 ? "weak" : a < 0.6 ? "moderate" : a < 0.8 ? "strong" : "very strong";
  if (strength === "no") return "no clear link";
  return `${strength} ${r > 0 ? "positive" : "negative"}`;
}
