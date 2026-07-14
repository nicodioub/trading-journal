import { format, subDays } from "date-fns";
import type {
  BehaviorPattern,
  FirstThought,
  JournalEntry,
  PsychDimensions,
  ReadinessRule,
  ReadinessStatus,
  Trade,
  TrajectoryState,
} from "../models";
import { computeRR, getOutcome } from "./tradeStats";

/**
 * One day's worth of behavioral evidence: what the trader was told about
 * their readiness, and what they actually did. This is the raw material the
 * Behavior Engine reduces into BehavioralContext, and what gets summarized
 * for the model so it can reason across days instead of just today.
 */
export interface DayBehavior {
  date: string;
  firstThought: FirstThought | null;
  /** Status from a self-declared ReadinessRule window covering this date, if any. */
  declaredStatus: ReadinessStatus | null;
  trades: { count: number; wins: number; losses: number; netPnl: number; netR: number | null };
  /**
   * Minutes between the day's check-in and the first trade entered afterward,
   * or null if either is missing. A short gap on a day whose writing preached
   * patience is a concrete words-vs-actions contradiction.
   */
  minutesFromCheckInToFirstTrade: number | null;
  journalExcerpt: string | null;
  /** True if either signal (declared window or AI readiness) recommended against trading today. */
  restricted: boolean;
  /** Restricted, and the trader traded anyway. */
  violated: boolean;
  /** Restricted, and the trader successfully stayed out. */
  compliant: boolean;
}

interface DayTradeAgg {
  count: number;
  wins: number;
  losses: number;
  netPnl: number;
  rr: number[];
}

function aggregateTradesByDay(trades: Trade[]): Map<string, DayTradeAgg> {
  const map = new Map<string, DayTradeAgg>();
  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    const key = format(new Date(trade.closedAt ?? trade.date), "yyyy-MM-dd");
    const agg = map.get(key) ?? { count: 0, wins: 0, losses: 0, netPnl: 0, rr: [] };
    agg.count += 1;
    agg.netPnl += trade.resultAmount ?? 0;
    const outcome = getOutcome(trade);
    if (outcome === "win") agg.wins += 1;
    else if (outcome === "loss") agg.losses += 1;
    const rr = computeRR(trade);
    if (rr !== null) agg.rr.push(rr);
    map.set(key, agg);
  }
  return map;
}

/** Earliest trade ENTRY timestamp per calendar day (entry day, not close day). */
function firstEntryByDay(trades: Trade[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const trade of trades) {
    const entry = new Date(trade.date).getTime();
    if (!Number.isFinite(entry)) continue;
    const key = format(new Date(trade.date), "yyyy-MM-dd");
    const current = map.get(key);
    if (current === undefined || entry < current) map.set(key, entry);
  }
  return map;
}

function minutesFromCheckIn(firstThought: FirstThought | null, firstEntry: number | undefined): number | null {
  if (!firstThought || firstEntry === undefined) return null;
  const checkIn = new Date(firstThought.createdAt).getTime();
  if (!Number.isFinite(checkIn) || firstEntry < checkIn) return null;
  return Math.round((firstEntry - checkIn) / 60_000);
}

/** The declared readiness window covering a date — most recently created wins on overlap. */
function findDeclaredStatus(rules: ReadinessRule[], date: string): ReadinessStatus | null {
  const matches = rules.filter((r) => r.startDate <= date && date <= r.endDate);
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).status;
}

/**
 * Builds the trailing N-day (default 7) behavioral window ending the day
 * before `todayDate` — today is analyzed separately, this is the history
 * it gets compared against.
 */
export function buildBehaviorWindow(
  thoughts: FirstThought[],
  readinessRules: ReadinessRule[],
  trades: Trade[],
  journalEntries: JournalEntry[],
  todayDate: string,
  days = 7,
): DayBehavior[] {
  const thoughtByDate = new Map(thoughts.map((t) => [t.date, t]));
  const journalByDate = new Map(journalEntries.map((j) => [j.date, j]));
  const tradesByDate = aggregateTradesByDay(trades);
  const entryByDate = firstEntryByDay(trades);

  const window: DayBehavior[] = [];
  for (let i = days; i >= 1; i--) {
    const date = format(subDays(new Date(todayDate), i), "yyyy-MM-dd");
    const firstThought = thoughtByDate.get(date) ?? null;
    const declaredStatus = findDeclaredStatus(readinessRules, date);
    const agg = tradesByDate.get(date) ?? { count: 0, wins: 0, losses: 0, netPnl: 0, rr: [] };
    const journal = journalByDate.get(date) ?? null;

    const restricted =
      declaredStatus === "no_trade" || firstThought?.status === "no_trade" || firstThought?.status === "high_risk";
    const hasSignal = firstThought !== null || declaredStatus !== null;

    window.push({
      date,
      firstThought,
      declaredStatus,
      trades: {
        count: agg.count,
        wins: agg.wins,
        losses: agg.losses,
        netPnl: agg.netPnl,
        netR: agg.rr.length ? agg.rr.reduce((s, v) => s + v, 0) : null,
      },
      minutesFromCheckInToFirstTrade: minutesFromCheckIn(firstThought, entryByDate.get(date)),
      journalExcerpt: journal?.content ? journal.content.slice(0, 240) : null,
      restricted,
      violated: hasSignal && restricted && agg.count > 0,
      compliant: hasSignal && restricted && agg.count === 0,
    });
  }
  return window;
}

export interface BehavioralContext {
  trustScore: number;
  /** Net self-trust points gained (+) or lost (−) across the window, relative to a neutral 70 baseline. This is the "↓ −18 this week" number. */
  trustDelta: number;
  /** Plain-language reasons trust was earned this window (the "built by" list). */
  trustBuilders: string[];
  /** Plain-language reasons trust was lost this window (the "destroyed by" list). */
  trustDestroyers: string[];
  consistencyScore: number;
  disciplineTrend: "improving" | "stable" | "declining";
  emotionalMomentum: number;
  noTradeViolations: number;
  highRiskViolations: number;
  consecutiveViolations: number;
  recoveryAttempts: number;
  daysSinceLastRuleBreak: number | null;
  followedPlanRate: number;
  averageReadiness: number | null;
  averagePsychologicalLoad: number | null;
  currentBehaviorPattern: BehaviorPattern;
  trajectory: TrajectoryState;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

function stddev(values: number[]): number {
  const mean = average(values);
  if (mean === null || values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function avgDimension(days: DayBehavior[], key: keyof PsychDimensions): number | null {
  return average(days.filter((d) => d.firstThought).map((d) => d.firstThought!.dimensions[key]));
}

/** Trailing run of consecutive net-losing or net-winning trading days, most-recent-first. */
function trailingDayStreak(window: DayBehavior[], type: "loss" | "win"): number {
  let count = 0;
  for (let i = window.length - 1; i >= 0; i--) {
    const day = window[i];
    if (day.trades.count === 0) continue;
    const matches = type === "loss" ? day.trades.netPnl < 0 : day.trades.netPnl > 0;
    if (matches) count += 1;
    else break;
  }
  return count;
}

/** The deterministic indicators, before the two classification labels are attached. */
type BehavioralBase = Omit<BehavioralContext, "currentBehaviorPattern" | "trajectory">;

/**
 * The trajectory label: which direction the identity is moving. Severe active
 * decline reads as "Breaking Self Trust"; improving discipline after a recent
 * break is "Rebuilding Discipline"; slipping-but-not-broken is "Losing
 * Consistency"; solid and steady is "Identity Stable".
 */
function classifyTrajectory(ctx: BehavioralBase): TrajectoryState {
  if (ctx.consecutiveViolations >= 2 || ctx.trustDelta <= -12) return "Breaking Self Trust";
  if (ctx.disciplineTrend === "improving" && ctx.daysSinceLastRuleBreak !== null) return "Rebuilding Discipline";
  if (ctx.disciplineTrend === "declining" || ctx.followedPlanRate < 70 || ctx.trustDelta < 0) return "Losing Consistency";
  return "Identity Stable";
}

function classifyPattern(
  ctx: BehavioralBase,
  window: DayBehavior[],
): BehaviorPattern {
  const avgOutcomeAttachment = avgDimension(window, "outcomeAttachment");
  if (ctx.consecutiveViolations >= 2 && trailingDayStreak(window, "loss") >= 1) return "Revenge Trading";
  if (ctx.noTradeViolations >= 2) return "Forcing Trades";
  if (ctx.disciplineTrend === "declining" && ctx.emotionalMomentum > 1.5) return "Fearful";
  if (trailingDayStreak(window, "win") >= 3 && (avgOutcomeAttachment ?? 0) >= 6) return "Overconfident";
  if ((avgOutcomeAttachment ?? 0) >= 6.5) return "Outcome Attached";
  if (ctx.consecutiveViolations === 0 && ctx.followedPlanRate >= 90 && ctx.trustScore >= 75) return "Disciplined";
  return "Patient";
}

/**
 * Reduces a behavioral window into deterministic longitudinal indicators —
 * the "Behavior Engine". Returns null when there isn't enough signal (no
 * first-thought or declared-readiness data) in the window to say anything
 * meaningful yet.
 */
export function computeBehavioralContext(window: DayBehavior[]): BehavioralContext | null {
  const withSignal = window.filter((d) => d.firstThought || d.declaredStatus);
  if (withSignal.length === 0) return null;

  let noTradeViolations = 0;
  let highRiskViolations = 0;
  let recoveryAttempts = 0;
  for (const day of window) {
    if (day.violated) {
      const isNoTrade = day.declaredStatus === "no_trade" || day.firstThought?.status === "no_trade";
      if (isNoTrade) noTradeViolations += 1;
      else highRiskViolations += 1;
    }
    if (day.compliant) recoveryAttempts += 1;
  }

  const restrictedDays = window.filter((d) => d.restricted);
  let consecutiveViolations = 0;
  for (let i = restrictedDays.length - 1; i >= 0; i--) {
    if (restrictedDays[i].violated) consecutiveViolations += 1;
    else break;
  }

  // Relative to today: a violation on the window's last day (yesterday) = 1.
  let daysSinceLastRuleBreak: number | null = null;
  for (let i = window.length - 1; i >= 0; i--) {
    if (window[i].violated) {
      daysSinceLastRuleBreak = window.length - i;
      break;
    }
  }

  const violatedCount = window.filter((d) => d.violated).length;
  const followedPlanRate =
    withSignal.length > 0 ? Math.round(((withSignal.length - violatedCount) / withSignal.length) * 100) : 100;

  const readinessValues = window
    .map((d) => d.firstThought?.readinessScore)
    .filter((v): v is number => typeof v === "number");
  const loadValues = window
    .map((d) => d.firstThought?.psychologicalLoad?.score)
    .filter((v): v is number => typeof v === "number");
  const averageReadiness = readinessValues.length ? Math.round(average(readinessValues)!) : null;
  const averagePsychologicalLoad = loadValues.length ? Math.round(average(loadValues)!) : null;

  const withDims = window.filter((d) => d.firstThought);
  const mid = Math.floor(withDims.length / 2);
  const firstHalf = withDims.slice(0, mid);
  const secondHalf = withDims.slice(mid);
  const disciplineDelta =
    firstHalf.length && secondHalf.length ? avgDimension(secondHalf, "discipline")! - avgDimension(firstHalf, "discipline")! : 0;
  const disciplineTrend: BehavioralContext["disciplineTrend"] =
    disciplineDelta > 0.75 ? "improving" : disciplineDelta < -0.75 ? "declining" : "stable";
  const emotionalMomentum =
    firstHalf.length && secondHalf.length
      ? Math.round((avgDimension(secondHalf, "emotionalCharge")! - avgDimension(firstHalf, "emotionalCharge")!) * 10) / 10
      : 0;

  const disciplineValues = withDims.map((d) => d.firstThought!.dimensions.discipline);
  const consistencyScore =
    disciplineValues.length >= 2 ? Math.round(Math.max(0, 100 - stddev(disciplineValues) * 20)) : 100;

  // Trust accrues from a neutral 70 baseline. The violation penalty scales
  // with how hard the recommendation was ignored: one trade through a
  // no-trade day costs 5, each additional trade adds 1 (cap 10) — five
  // trades on a "do not trade" day is a different event than one. netDelta
  // is the unclamped sum of adjustments: the "points earned/lost this week".
  let netDelta = 0;
  let cleanDays = 0;
  let escalatedOnRestricted = false;
  for (const day of window) {
    if (day.violated) {
      const isNoTrade = day.declaredStatus === "no_trade" || day.firstThought?.status === "no_trade";
      const base = isNoTrade ? 5 : 3;
      netDelta -= Math.min(base + Math.max(0, day.trades.count - 1), 10);
      if (day.trades.count >= 3) escalatedOnRestricted = true;
    } else if (day.compliant) {
      netDelta += 2;
    } else if (day.firstThought && !day.restricted) {
      netDelta += 1;
      cleanDays += 1;
    }
  }
  const trustScore = Math.round(Math.max(0, Math.min(100, 70 + netDelta)));
  const trustDelta = Math.round(netDelta);

  const trustBuilders: string[] = [];
  if (recoveryAttempts > 0)
    trustBuilders.push(`Stayed out on ${recoveryAttempts} day${recoveryAttempts > 1 ? "s" : ""} you flagged as unfit`);
  if (cleanDays > 0)
    trustBuilders.push(`Followed your plan on ${cleanDays} clear day${cleanDays > 1 ? "s" : ""}`);

  const trustDestroyers: string[] = [];
  if (noTradeViolations > 0)
    trustDestroyers.push(`Traded after a "no trade" call (${noTradeViolations}×)`);
  if (highRiskViolations > 0)
    trustDestroyers.push(`Traded on a high-risk day (${highRiskViolations}×)`);
  if (escalatedOnRestricted) trustDestroyers.push("Took multiple positions on a day you'd flagged");

  const base = {
    trustScore,
    trustDelta,
    trustBuilders,
    trustDestroyers,
    consistencyScore,
    disciplineTrend,
    emotionalMomentum,
    noTradeViolations,
    highRiskViolations,
    consecutiveViolations,
    recoveryAttempts,
    daysSinceLastRuleBreak,
    followedPlanRate,
    averageReadiness,
    averagePsychologicalLoad,
  };

  return {
    ...base,
    currentBehaviorPattern: classifyPattern(base, window),
    trajectory: classifyTrajectory(base),
  };
}
