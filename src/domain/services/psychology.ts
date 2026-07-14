import { differenceInCalendarDays, endOfWeek, format, startOfWeek, subDays } from "date-fns";
import type { Bias, BiasTag, FirstThought, FirstThoughtStatus, PsychDimensions, Trade } from "../models";
import type { ChessContext } from "./chessStats";
import { computeRR, getOutcome, tradeTime } from "./tradeStats";

/** Human-readable labels for each detected bias/trait tag. */
export const BIAS_LABELS: Record<BiasTag, string> = {
  outcome_attachment: "Outcome Attachment",
  revenge_trading: "Revenge Trading",
  fomo: "Fear of Missing Out",
  fear_of_failure: "Fear of Failure",
  need_for_validation: "Need for Validation",
  overconfidence: "Overconfidence",
  perfectionism: "Perfectionism",
  need_to_recover: "Need to Recover",
  impatience: "Impatience",
  discipline: "Discipline",
  acceptance: "Acceptance",
  process_focus: "Process Focus",
};

/** Tags that read as protective traits rather than risks. */
const POSITIVE_BIAS_TAGS = new Set<BiasTag>(["discipline", "acceptance", "process_focus"]);

/**
 * Rolls the six psychological dimensions into a single 0-100 Trading
 * Readiness score. Weighted per the desk's own calibration: outcome
 * attachment matters most, then process orientation, then emotional charge,
 * then impulsivity and discipline. Ego involvement is displayed but not
 * scored — it's diagnostic, not yet weighted.
 */
const WEIGHTS = {
  outcomeAttachment: 0.35,
  processOrientation: 0.25,
  emotionalCharge: 0.2,
  impulsivity: 0.1,
  discipline: 0.1,
};

export function computeReadinessScore(dimensions: PsychDimensions): number {
  const outcomeGood = (10 - dimensions.outcomeAttachment) / 10;
  const processGood = dimensions.processOrientation / 10;
  const emotionGood = (10 - dimensions.emotionalCharge) / 10;
  const impulsivityGood = (10 - dimensions.impulsivity) / 10;
  const disciplineGood = dimensions.discipline / 10;

  const fraction =
    outcomeGood * WEIGHTS.outcomeAttachment +
    processGood * WEIGHTS.processOrientation +
    emotionGood * WEIGHTS.emotionalCharge +
    impulsivityGood * WEIGHTS.impulsivity +
    disciplineGood * WEIGHTS.discipline;

  return Math.round(fraction * 100);
}

/**
 * A small, deterministic penalty when today's chess performance sits well
 * below the trader's own rolling baseline — treated as corroborating
 * objective evidence of cognitive sharpness, not a replacement for the
 * written psychology. Never a bonus for good chess: absence of a warning
 * sign shouldn't inflate a score already set by the written check-in.
 */
export function applyChessAdjustment(baseScore: number, chess: ChessContext | null): number {
  if (!chess?.today || chess.today.played < 3) return baseScore;
  const baseline = chess.avg30d ?? chess.avg7d;
  if (baseline === null) return baseScore;
  const gap = baseline - chess.today.winRate;
  if (gap >= 25) return Math.max(0, baseScore - 10);
  if (gap >= 15) return Math.max(0, baseScore - 5);
  return baseScore;
}

export function statusForScore(score: number): FirstThoughtStatus {
  if (score >= 75) return "ready";
  if (score >= 55) return "caution";
  if (score >= 35) return "high_risk";
  return "no_trade";
}

/**
 * Deterministically derives plain-language risk flags from the scored
 * dimensions and detected bias tags, so the risk read-out stays consistent
 * day to day. Strengths are sourced directly from the model's own
 * evidence-based `strengths` field instead — see FirstThoughtAnalysis.
 */
export function deriveRisks(dimensions: PsychDimensions, biases: Bias[]): string[] {
  const risks: string[] = [];

  if (dimensions.discipline <= 3) risks.push("Low discipline");
  if (dimensions.emotionalCharge >= 7) risks.push("High emotional activation");
  if (dimensions.impulsivity >= 7) risks.push("High impulsivity");
  if (dimensions.outcomeAttachment >= 7) risks.push("High attachment to today's result");
  if (dimensions.processOrientation <= 3) risks.push("Low process focus");
  if (dimensions.egoInvolvement >= 7) risks.push("Performance pressure");

  for (const bias of biases) {
    if (bias.confidence < 50 || POSITIVE_BIAS_TAGS.has(bias.tag)) continue;
    risks.push(BIAS_LABELS[bias.tag]);
  }

  return [...new Set(risks)];
}

export interface ReadinessComparison {
  today: number;
  monthAverage: number | null;
  yesterday: number | null;
}

/** Compares today's readiness score against this month's average and yesterday's score. */
export function computeReadinessComparison(
  thoughts: FirstThought[],
  todayDate: string,
): ReadinessComparison | null {
  const today = thoughts.find((t) => t.date === todayDate);
  if (!today) return null;

  const monthPrefix = todayDate.slice(0, 7);
  const monthEntries = thoughts.filter((t) => t.date.startsWith(monthPrefix) && t.date !== todayDate);
  const monthAverage = monthEntries.length
    ? monthEntries.reduce((sum, t) => sum + t.readinessScore, 0) / monthEntries.length
    : null;

  const yesterdayDate = format(subDays(new Date(todayDate), 1), "yyyy-MM-dd");
  const yesterday = thoughts.find((t) => t.date === yesterdayDate)?.readinessScore ?? null;

  return { today: today.readinessScore, monthAverage, yesterday };
}

/* ------------------------- Historical intelligence ------------------------ */

function dayKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

interface DayAgg {
  pnl: number;
  trades: number;
  wins: number;
}

function aggregateTradesByDay(trades: Trade[]): Map<string, DayAgg> {
  const map = new Map<string, DayAgg>();
  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    const key = dayKey(trade.closedAt ?? trade.date);
    const agg = map.get(key) ?? { pnl: 0, trades: 0, wins: 0 };
    agg.pnl += trade.resultAmount ?? 0;
    agg.trades += 1;
    if (getOutcome(trade) === "win") agg.wins += 1;
    map.set(key, agg);
  }
  return map;
}

export interface BiasFrequency {
  tag: BiasTag;
  /** Share of tracked days this bias appeared on, 0-100. */
  percentDays: number;
  occurrences: number;
}

/** How often each bias tag appears across all logged check-ins. */
export function computeBiasFrequency(thoughts: FirstThought[]): BiasFrequency[] {
  if (thoughts.length === 0) return [];
  const counts = new Map<BiasTag, number>();
  for (const t of thoughts) {
    for (const bias of t.biases) {
      counts.set(bias.tag, (counts.get(bias.tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, occurrences]) => ({
      tag,
      occurrences,
      percentDays: (occurrences / thoughts.length) * 100,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

export interface BiasPnlStat {
  tag: BiasTag;
  avgPnl: number | null;
  sampleSize: number;
}

/** Average same-day trading PnL on days a given bias tag was detected. */
export function computeAvgPnlByBias(thoughts: FirstThought[], trades: Trade[]): BiasPnlStat[] {
  const byDay = aggregateTradesByDay(trades);
  const tags = new Set<BiasTag>();
  for (const t of thoughts) for (const b of t.biases) tags.add(b.tag);

  return [...tags].map((tag) => {
    const pnls = thoughts
      .filter((t) => t.biases.some((b) => b.tag === tag))
      .map((t) => byDay.get(t.date))
      .filter((agg): agg is DayAgg => agg !== undefined)
      .map((agg) => agg.pnl);
    return { tag, avgPnl: average(pnls), sampleSize: pnls.length };
  });
}

export interface ProcessFocusStat {
  /** Avg PnL on days process orientation scored above the given threshold. */
  avgPnlHighProcess: number | null;
  avgPnlLowProcess: number | null;
  threshold: number;
}

export function computeProcessFocusStat(
  thoughts: FirstThought[],
  trades: Trade[],
  threshold = 8,
): ProcessFocusStat {
  const byDay = aggregateTradesByDay(trades);
  const pnlFor = (predicate: (t: FirstThought) => boolean) =>
    average(
      thoughts
        .filter(predicate)
        .map((t) => byDay.get(t.date))
        .filter((agg): agg is DayAgg => agg !== undefined)
        .map((agg) => agg.pnl),
    );

  return {
    threshold,
    avgPnlHighProcess: pnlFor((t) => t.dimensions.processOrientation > threshold),
    avgPnlLowProcess: pnlFor((t) => t.dimensions.processOrientation <= threshold),
  };
}

export interface WeekdayStat {
  weekday: string;
  avgDiscipline: number | null;
  avgEmotionalCharge: number | null;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Average discipline / emotional charge grouped by weekday. */
export function computeWeekdayStats(thoughts: FirstThought[]): WeekdayStat[] {
  return WEEKDAYS.map((weekday, index) => {
    const onDay = thoughts.filter((t) => new Date(t.date).getDay() === index);
    return {
      weekday,
      avgDiscipline: average(onDay.map((t) => t.dimensions.discipline)),
      avgEmotionalCharge: average(onDay.map((t) => t.dimensions.emotionalCharge)),
    };
  });
}

export interface ReadinessStats {
  sampleSize: number;
  avgReadiness: number | null;
  avgReadinessWinningDays: number | null;
  avgReadinessLosingDays: number | null;
}

/** Average readiness overall, and split by whether that day net won or lost. */
export function computeReadinessStats(thoughts: FirstThought[], trades: Trade[]): ReadinessStats {
  const byDay = aggregateTradesByDay(trades);
  const winning: number[] = [];
  const losing: number[] = [];
  for (const t of thoughts) {
    const agg = byDay.get(t.date);
    if (!agg) continue;
    if (agg.pnl >= 0) winning.push(t.readinessScore);
    else losing.push(t.readinessScore);
  }

  return {
    sampleSize: thoughts.length,
    avgReadiness: average(thoughts.map((t) => t.readinessScore)),
    avgReadinessWinningDays: average(winning),
    avgReadinessLosingDays: average(losing),
  };
}

/** The single most frequent bias tag, if any. */
export function mostFrequentBias(thoughts: FirstThought[]): BiasFrequency | null {
  return computeBiasFrequency(thoughts)[0] ?? null;
}

/** The weekday with the highest and lowest average discipline. */
export function mostAndLeastDisciplinedWeekday(thoughts: FirstThought[]): {
  most: WeekdayStat | null;
  least: WeekdayStat | null;
} {
  const stats = computeWeekdayStats(thoughts).filter((s) => s.avgDiscipline !== null);
  if (stats.length === 0) return { most: null, least: null };
  const sorted = [...stats].sort((a, b) => (b.avgDiscipline ?? 0) - (a.avgDiscipline ?? 0));
  return { most: sorted[0], least: sorted[sorted.length - 1] };
}

/** Average R-multiple (rrAchieved) per calendar day, across closed trades that recorded one. */
function expectancyByDay(trades: Trade[]): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const trade of trades) {
    if (trade.status !== "closed" || trade.rrAchieved === null || trade.rrAchieved === undefined) continue;
    const key = dayKey(trade.closedAt ?? trade.date);
    const agg = sums.get(key) ?? { total: 0, count: 0 };
    agg.total += trade.rrAchieved;
    agg.count += 1;
    sums.set(key, agg);
  }
  const result = new Map<string, number>();
  for (const [key, { total, count }] of sums) result.set(key, total / count);
  return result;
}

export interface ExpectancyStat {
  threshold: number;
  avgAbove: number | null;
  avgAtOrBelow: number | null;
  sampleAbove: number;
  sampleAtOrBelow: number;
}

function expectancyBreakdown(
  thoughts: FirstThought[],
  trades: Trade[],
  predicate: (t: FirstThought) => boolean,
): Omit<ExpectancyStat, "threshold"> {
  const byDay = expectancyByDay(trades);
  const above: number[] = [];
  const atOrBelow: number[] = [];
  for (const t of thoughts) {
    const rr = byDay.get(t.date);
    if (rr === undefined) continue;
    if (predicate(t)) above.push(rr);
    else atOrBelow.push(rr);
  }
  return {
    avgAbove: average(above),
    avgAtOrBelow: average(atOrBelow),
    sampleAbove: above.length,
    sampleAtOrBelow: atOrBelow.length,
  };
}

/** Average expectancy (R) on days readiness scored above vs at-or-below the threshold. */
export function computeReadinessExpectancy(
  thoughts: FirstThought[],
  trades: Trade[],
  threshold = 85,
): ExpectancyStat {
  return { threshold, ...expectancyBreakdown(thoughts, trades, (t) => t.readinessScore > threshold) };
}

/** Average expectancy (R) on days outcome attachment scored above vs at-or-below the threshold. */
export function computeOutcomeAttachmentExpectancy(
  thoughts: FirstThought[],
  trades: Trade[],
  threshold = 7,
): ExpectancyStat {
  return {
    threshold,
    ...expectancyBreakdown(thoughts, trades, (t) => t.dimensions.outcomeAttachment > threshold),
  };
}

/* ------------------------- Weekly trading context ------------------------- */

export interface WeeklyTradingContext {
  weekStart: string;
  weekEnd: string;
  trades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  netR: number | null;
  netPnl: number;
  largestLoss: number | null;
  /** Trailing win/loss run across ALL closed trades (decisive outcomes only), not limited to this week. */
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  /** Trailing breakeven run across all closed trades. */
  breakevenStreak: number;
  daysSinceLastTrade: number | null;
}

/** Trailing win/loss run, most-recent-first, across all closed trades (decisive outcomes only). */
function computeOverallStreak(closedSortedDesc: Trade[]): { type: "win" | "loss" | "none"; count: number } {
  let type: "win" | "loss" | "none" = "none";
  let count = 0;
  for (const trade of closedSortedDesc) {
    const outcome = getOutcome(trade);
    if (outcome !== "win" && outcome !== "loss") continue;
    if (type === "none") {
      type = outcome;
      count = 1;
    } else if (outcome === type) {
      count += 1;
    } else break;
  }
  return { type, count };
}

/** Trailing run of consecutive breakeven outcomes, most-recent-first, across all closed trades. */
function computeBreakevenStreak(closedSortedDesc: Trade[]): number {
  let count = 0;
  for (const trade of closedSortedDesc) {
    if (getOutcome(trade) === "breakeven") count += 1;
    else break;
  }
  return count;
}

/**
 * This week's (Monday-Sunday) realized trading performance, plus streak and
 * recency signals computed over ALL closed trades — a losing or winning
 * streak that started last week still shapes today's psychology even though
 * it isn't fully "this week's" result.
 */
export function computeWeeklyTradingContext(trades: Trade[], todayDate: string): WeeklyTradingContext {
  const reference = new Date(todayDate);
  const weekStart = startOfWeek(reference, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(reference, { weekStartsOn: 1 });

  const closedDesc = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => tradeTime(b) - tradeTime(a));

  const thisWeek = closedDesc.filter((t) => {
    const time = tradeTime(t);
    return time >= weekStart.getTime() && time <= weekEnd.getTime();
  });

  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let netPnl = 0;
  let largestLoss: number | null = null;
  const rrValues: number[] = [];

  for (const trade of thisWeek) {
    const amount = trade.resultAmount ?? 0;
    netPnl += amount;
    const outcome = getOutcome(trade);
    if (outcome === "win") {
      wins += 1;
    } else if (outcome === "loss") {
      losses += 1;
      largestLoss = largestLoss === null ? amount : Math.min(largestLoss, amount);
    } else {
      breakevens += 1;
    }

    const rr = computeRR(trade);
    if (rr !== null) rrValues.push(rr);
  }

  const decisive = wins + losses;
  const winRate = decisive > 0 ? (wins / decisive) * 100 : 0;
  const netR = rrValues.length > 0 ? rrValues.reduce((sum, v) => sum + v, 0) : null;

  const daysSinceLastTrade =
    closedDesc.length > 0
      ? Math.max(0, differenceInCalendarDays(reference, new Date(tradeTime(closedDesc[0]))))
      : null;

  return {
    weekStart: format(weekStart, "yyyy-MM-dd"),
    weekEnd: format(weekEnd, "yyyy-MM-dd"),
    trades: thisWeek.length,
    wins,
    losses,
    breakevens,
    winRate,
    netR,
    netPnl,
    largestLoss,
    currentStreak: computeOverallStreak(closedDesc),
    breakevenStreak: computeBreakevenStreak(closedDesc),
    daysSinceLastTrade,
  };
}

export interface PsychologicalLoad {
  score: number;
  drivers: string[];
}

/**
 * Deterministic 0-100 "psychological load" index: how much pressure this
 * week's realized results (plus a same-day cognitive read) are likely
 * putting on today's decision-making, regardless of direction. Loss streaks
 * (fear, urge to recover) and win streaks (overconfidence, FOMO) both add
 * load, as do breakeven streaks (frustration) and long layoffs (rust). This
 * is context for the model, not a verdict — how a given load actually plays
 * out for THIS trader still depends on the written check-in.
 */
export function computePsychologicalLoad(
  weekly: WeeklyTradingContext,
  chess: ChessContext | null,
): PsychologicalLoad {
  let score = 0;
  const drivers: string[] = [];

  if (weekly.currentStreak.type === "loss" && weekly.currentStreak.count >= 2) {
    score += (Math.min(weekly.currentStreak.count, 6) / 6) * 35;
    drivers.push(`${weekly.currentStreak.count} consecutive losses`);
  }
  if (weekly.currentStreak.type === "win" && weekly.currentStreak.count >= 3) {
    score += (Math.min(weekly.currentStreak.count, 6) / 6) * 20;
    drivers.push(`${weekly.currentStreak.count} consecutive wins`);
  }
  if (weekly.breakevenStreak >= 2) {
    score += (Math.min(weekly.breakevenStreak, 6) / 6) * 15;
    drivers.push(`${weekly.breakevenStreak} consecutive breakeven trades`);
  }
  if (weekly.trades > 0 && weekly.wins === 0 && weekly.losses > 0) {
    drivers.push("No winning trades this week");
  }
  if (weekly.daysSinceLastTrade !== null && weekly.daysSinceLastTrade >= 4) {
    const capped = Math.min(weekly.daysSinceLastTrade, 14);
    score += ((capped - 3) / 11) * 10;
    drivers.push(`${weekly.daysSinceLastTrade} days since last trade`);
  }
  if (weekly.trades >= 12) {
    score += Math.min((weekly.trades - 12) / 10, 1) * 10;
    drivers.push(`${weekly.trades} trades already logged this week`);
  }
  if (chess?.today && chess.today.played >= 3) {
    const baseline = chess.avg30d ?? chess.avg7d;
    if (baseline !== null) {
      const gap = baseline - chess.today.winRate;
      if (gap >= 15) {
        score += (Math.min(gap, 40) / 40) * 10;
        drivers.push("Below-baseline chess performance today");
      }
    }
  }

  return { score: Math.round(Math.max(0, Math.min(100, score))), drivers };
}
