import type { Trade, TradeOutcome } from "../models";
import { getOutcome } from "./tradeStats";

/**
 * Behavioral "guardrail" statistics for the Mentor. These are the hard facts
 * that protect the plan in a moment of activation — e.g. "a trade you open
 * within 10 minutes of a close loses 82% of the time". Computed from the
 * trader's OWN closed-trade history when there's enough of it; otherwise a
 * neutral, clearly-labelled general default stands in.
 *
 * Pure domain logic: no storage, no UI, no LLM. The Mentor feature quotes at
 * most one of these verbatim — it never invents a number.
 */

export type GuardrailId = "rapidReentry" | "revengeAfterLoss" | "afterBigWin" | "overtrading";

export interface GuardrailConfig {
  /** A re-entry this many minutes (or fewer) after a close counts as "rapid". */
  rapidReentryMinutes: number;
  /** A trade entered within this window after a losing close counts as "revenge". */
  revengeWindowMinutes: number;
  /** A trade entered within this window after a big win counts as "post-win". */
  afterWinWindowMinutes: number;
  /** A win at or above this quantile of winning results counts as a "big win" (0–1). */
  bigWinQuantile: number;
  /** The Nth trade of a day (1-indexed) at which "overtrading" begins. */
  overtradingFromNthTrade: number;
  /** Minimum decisive (win/loss) sample before a stat is treated as personal. */
  minSample: number;
  /** Neutral fallback loss rates (0–100) used, and labelled, as general patterns. */
  general: Record<GuardrailId, number>;
}

/**
 * The single place to tune the guardrail thresholds and neutral defaults.
 * (Kept as a constant for now; can be promoted into Settings later without
 * touching call sites — every consumer already passes a config in.)
 */
export const DEFAULT_GUARDRAIL_CONFIG: GuardrailConfig = {
  rapidReentryMinutes: 10,
  revengeWindowMinutes: 60,
  afterWinWindowMinutes: 120,
  bigWinQuantile: 0.8,
  overtradingFromNthTrade: 3,
  minSample: 5,
  general: {
    rapidReentry: 80,
    revengeAfterLoss: 75,
    afterBigWin: 65,
    overtrading: 70,
  },
};

export interface Guardrail {
  id: GuardrailId;
  /** True when computed from the trader's own history with enough samples. */
  personal: boolean;
  sampleSize: number;
  /** 0–100. For general guardrails this is the configured default. */
  lossRate: number;
  /** 0–100. Zero for general guardrails (no personal sample to derive it from). */
  winRate: number;
  /** A ready-to-quote sentence with the numbers already formatted in. */
  statement: string;
  /** Feelings/situations this guardrail speaks to — a hint for the Mentor. */
  relevantTo: string;
}

function entryTime(t: Trade): number {
  return new Date(t.date).getTime();
}

function closeTime(t: Trade): number {
  return new Date(t.closedAt ?? t.date).getTime();
}

/** Win / loss rates over a set of outcomes, counting only decisive ones. */
function decisiveRates(outcomes: TradeOutcome[]): {
  decisive: number;
  winRate: number;
  lossRate: number;
} {
  let wins = 0;
  let losses = 0;
  for (const o of outcomes) {
    if (o === "win") wins += 1;
    else if (o === "loss") losses += 1;
  }
  const decisive = wins + losses;
  return {
    decisive,
    winRate: decisive ? (wins / decisive) * 100 : 0,
    lossRate: decisive ? (losses / decisive) * 100 : 0,
  };
}

/** The closed trade whose close is the most recent one before `t`'s entry, same account. */
function priorCloseFor(t: Trade, closedByAccount: Map<string, Trade[]>): Trade | null {
  const list = closedByAccount.get(t.accountId) ?? [];
  const entry = entryTime(t);
  let best: Trade | null = null;
  let bestTime = -Infinity;
  for (const p of list) {
    if (p.id === t.id) continue;
    const ct = closeTime(p);
    if (ct <= entry && ct > bestTime) {
      best = p;
      bestTime = ct;
    }
  }
  return best;
}

function minutesBetween(laterMs: number, earlierMs: number): number {
  return (laterMs - earlierMs) / 60000;
}

/** Format a minute count as a natural window ("10 minutes", "1 hour", "2 hours"). */
function describeWindow(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${minutes} minutes`;
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)));
  return sorted[idx];
}

const RELEVANCE: Record<GuardrailId, string> = {
  rapidReentry: "the urge to jump straight back in, entering another trade right after closing one",
  revengeAfterLoss: "just took a loss, wanting to win it back, frustration, anger, needing to recover",
  afterBigWin: "just had a big win, euphoria, overconfidence, wanting to press or add",
  overtrading: "already traded a lot today, boredom, restlessness, seeking action",
};

const GENERAL_STATEMENT: Record<GuardrailId, (c: GuardrailConfig) => string> = {
  rapidReentry: (c) =>
    `As a general rule, a trade opened within ${describeWindow(c.rapidReentryMinutes)} of a close is far more likely to lose than to win.`,
  revengeAfterLoss: () =>
    `As a general rule, a trade taken right after a loss to win it back loses far more often than a planned entry.`,
  afterBigWin: () =>
    `As a general rule, the quick trade taken right after a big win tends to give a chunk of that win back.`,
  overtrading: (c) =>
    `As a general rule, past the first ${c.overtradingFromNthTrade - 1} trades of a day your edge tends to fade.`,
};

function buildGuardrail(
  id: GuardrailId,
  outcomes: TradeOutcome[],
  personalStatement: (lossRate: number, sample: number) => string,
  config: GuardrailConfig,
): Guardrail {
  const { decisive, winRate, lossRate } = decisiveRates(outcomes);
  if (decisive >= config.minSample) {
    return {
      id,
      personal: true,
      sampleSize: decisive,
      lossRate: Math.round(lossRate),
      winRate: Math.round(winRate),
      statement: personalStatement(Math.round(lossRate), decisive),
      relevantTo: RELEVANCE[id],
    };
  }
  return {
    id,
    personal: false,
    sampleSize: decisive,
    lossRate: config.general[id],
    winRate: 0,
    statement: GENERAL_STATEMENT[id](config),
    relevantTo: RELEVANCE[id],
  };
}

/**
 * Computes every guardrail from the trader's trades. Always returns one entry
 * per guardrail id — personal when the sample is large enough, otherwise a
 * clearly-labelled general default the Mentor can still lean on.
 */
export function computeGuardrails(
  trades: Trade[],
  config: GuardrailConfig = DEFAULT_GUARDRAIL_CONFIG,
): Guardrail[] {
  const closed = trades.filter((t) => t.status === "closed");

  const closedByAccount = new Map<string, Trade[]>();
  for (const t of closed) {
    const list = closedByAccount.get(t.accountId) ?? [];
    list.push(t);
    closedByAccount.set(t.accountId, list);
  }

  // Threshold above which a winning result counts as a "big win".
  const winAmounts = closed
    .map((t) => t.resultAmount)
    .filter((v): v is number => v !== null && Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  const bigWinThreshold = quantile(winAmounts, config.bigWinQuantile);

  const rapid: TradeOutcome[] = [];
  const revenge: TradeOutcome[] = [];
  const afterWin: TradeOutcome[] = [];

  for (const t of closed) {
    const prior = priorCloseFor(t, closedByAccount);
    if (!prior) continue;
    const gapMin = minutesBetween(entryTime(t), closeTime(prior));
    if (gapMin < 0) continue;
    const outcome = getOutcome(t);

    if (gapMin <= config.rapidReentryMinutes) rapid.push(outcome);

    if (getOutcome(prior) === "loss" && gapMin <= config.revengeWindowMinutes) {
      revenge.push(outcome);
    }

    if (
      bigWinThreshold !== null &&
      getOutcome(prior) === "win" &&
      (prior.resultAmount ?? 0) >= bigWinThreshold &&
      gapMin <= config.afterWinWindowMinutes
    ) {
      afterWin.push(outcome);
    }
  }

  // Overtrading: the Nth+ trade of a calendar day, ordered by entry time.
  const byDay = new Map<string, Trade[]>();
  for (const t of closed) {
    const key = t.date.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(t);
    byDay.set(key, list);
  }
  const overtrading: TradeOutcome[] = [];
  for (const list of byDay.values()) {
    list.sort((a, b) => entryTime(a) - entryTime(b));
    for (let i = config.overtradingFromNthTrade - 1; i < list.length; i += 1) {
      overtrading.push(getOutcome(list[i]));
    }
  }

  return [
    buildGuardrail(
      "rapidReentry",
      rapid,
      (loss, n) =>
        `When you open a trade within ${describeWindow(config.rapidReentryMinutes)} of closing one, it loses ${loss}% of the time (${n} such trades).`,
      config,
    ),
    buildGuardrail(
      "revengeAfterLoss",
      revenge,
      (loss, n) =>
        `When you re-enter within ${describeWindow(config.revengeWindowMinutes)} of a loss, it loses ${loss}% of the time (${n} such trades).`,
      config,
    ),
    buildGuardrail(
      "afterBigWin",
      afterWin,
      (loss, n) =>
        `In the ${describeWindow(config.afterWinWindowMinutes)} after a big win, your next trade loses ${loss}% of the time (${n} such trades).`,
      config,
    ),
    buildGuardrail(
      "overtrading",
      overtrading,
      (loss, n) =>
        `Your ${ordinal(config.overtradingFromNthTrade)}-or-later trade of a day loses ${loss}% of the time (${n} such trades).`,
      config,
    ),
  ];
}
