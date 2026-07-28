import { differenceInCalendarDays, format } from "date-fns";
import type { Account, Trade } from "../models";
import { tradeTime } from "./tradeStats";

/**
 * The daily risk budget: how much of the account the trader has declared they
 * are willing to lose in one day (normal / hard ceiling), against how much
 * they have actually spent — today, on their last session, and across the
 * trailing window.
 *
 * This is the missing link between "I lost 4% yesterday" and today's
 * check-in: a day that blew through the ceiling is the single most
 * psychologically loaded fact a trader carries into the next session, and
 * until it's measured against a declared limit it's just another number.
 *
 * Pure domain logic: no storage, no UI, no LLM.
 */

export interface DailyRiskLimits {
  /** Risk the trader treats as a normal day, as a % of account equity (0–100). */
  normalPercent: number;
  /** Hard ceiling for a single day, as a % of account equity (0–100). */
  maxPercent: number;
}

export interface DayRiskUsage {
  /** yyyy-MM-dd. */
  date: string;
  trades: number;
  netPnl: number;
  /**
   * The day's result as a % of what the traded accounts started that day
   * with. Negative on a losing day. 0 when nothing was traded (or no
   * starting balance could be established).
   */
  netPercent: number;
  /** The day's loss as a positive number — the risk actually spent. 0 on flat/green days. */
  lossPercent: number;
  exceededNormal: boolean;
  exceededMax: boolean;
}

export interface DailyRiskContext {
  limits: DailyRiskLimits;
  /** Today's usage so far. */
  today: DayRiskUsage;
  /** The most recent day BEFORE today that had closed trades. */
  previousTradingDay: DayRiskUsage | null;
  /** Calendar days from that previous trading day to today (1 = yesterday). */
  daysSincePreviousTradingDay: number | null;
  /** Every trading day inside the trailing window, most recent first (today excluded). */
  recentDays: DayRiskUsage[];
  /** Size of the trailing window in calendar days. */
  windowDays: number;
  /** Days in the window (today included) that went past the normal daily risk. */
  daysOverNormal: number;
  /** Days in the window (today included) that went past the hard ceiling. */
  daysOverMax: number;
  /** Worst single-day loss in the window as a positive %, or null if there were none. */
  worstLossPercent: number | null;
  /** Percentage points of today's ceiling still unspent, floored at 0. */
  remainingTodayPercent: number;
}

/** Floating-point slack, so a 3.0000000001% loss doesn't "breach" a 3% ceiling. */
const EPSILON = 1e-9;

function dayKeyOf(trade: Trade): string {
  return format(new Date(tradeTime(trade)), "yyyy-MM-dd");
}

/** Realized PnL per account, per calendar day. */
function aggregateByAccountDay(closed: Trade[]): Map<string, Map<string, number>> {
  const byAccount = new Map<string, Map<string, number>>();
  for (const trade of closed) {
    const days = byAccount.get(trade.accountId) ?? new Map<string, number>();
    const day = dayKeyOf(trade);
    days.set(day, (days.get(day) ?? 0) + (trade.resultAmount ?? 0));
    byAccount.set(trade.accountId, days);
  }
  return byAccount;
}

/** What an account was worth at the open of `day` — its capital plus everything realized before it. */
function startBalanceFor(
  account: Account,
  day: string,
  byAccountDay: Map<string, Map<string, number>>,
): number {
  let balance = account.initialCapital;
  for (const [otherDay, pnl] of byAccountDay.get(account.id) ?? []) {
    // yyyy-MM-dd sorts lexicographically, so a plain string compare is a date compare.
    if (otherDay < day) balance += pnl;
  }
  return balance;
}

function usageForDay(
  day: string,
  tradesThatDay: Trade[],
  accountById: Map<string, Account>,
  byAccountDay: Map<string, Map<string, number>>,
  limits: DailyRiskLimits,
): DayRiskUsage {
  let netPnl = 0;
  const accountIds = new Set<string>();
  for (const trade of tradesThatDay) {
    netPnl += trade.resultAmount ?? 0;
    accountIds.add(trade.accountId);
  }

  // Only accounts actually traded that day form the denominator — a dormant
  // demo account shouldn't make a real 4% loss look like 1%.
  let startBalance = 0;
  for (const id of accountIds) {
    const account = accountById.get(id);
    if (account) startBalance += startBalanceFor(account, day, byAccountDay);
  }

  const netPercent = startBalance > 0 ? (netPnl / startBalance) * 100 : 0;
  const lossPercent = netPercent < 0 ? -netPercent : 0;

  return {
    date: day,
    trades: tradesThatDay.length,
    netPnl,
    netPercent,
    lossPercent,
    exceededNormal: limits.normalPercent > 0 && lossPercent > limits.normalPercent + EPSILON,
    exceededMax: limits.maxPercent > 0 && lossPercent > limits.maxPercent + EPSILON,
  };
}

/**
 * Builds the full daily-risk picture for `todayDate` (yyyy-MM-dd) from closed
 * trades and the accounts they belong to. `windowDays` is the trailing window
 * used for the "how often am I blowing the budget" counts.
 */
export function computeDailyRiskContext(
  trades: Trade[],
  accounts: Account[],
  limits: DailyRiskLimits,
  todayDate: string,
  windowDays = 14,
): DailyRiskContext {
  const closed = trades.filter((t) => t.status === "closed");
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const byAccountDay = aggregateByAccountDay(closed);

  const byDay = new Map<string, Trade[]>();
  for (const trade of closed) {
    const day = dayKeyOf(trade);
    const list = byDay.get(day) ?? [];
    list.push(trade);
    byDay.set(day, list);
  }

  const today = usageForDay(
    todayDate,
    byDay.get(todayDate) ?? [],
    accountById,
    byAccountDay,
    limits,
  );

  const pastDays = [...byDay.keys()].filter((day) => day < todayDate).sort().reverse();

  const previousDayKey = pastDays[0] ?? null;
  const previousTradingDay = previousDayKey
    ? usageForDay(previousDayKey, byDay.get(previousDayKey) ?? [], accountById, byAccountDay, limits)
    : null;
  const daysSincePreviousTradingDay = previousDayKey
    ? differenceInCalendarDays(new Date(`${todayDate}T00:00:00`), new Date(`${previousDayKey}T00:00:00`))
    : null;

  const recentDays = pastDays
    .filter(
      (day) =>
        differenceInCalendarDays(
          new Date(`${todayDate}T00:00:00`),
          new Date(`${day}T00:00:00`),
        ) <= windowDays,
    )
    .map((day) => usageForDay(day, byDay.get(day) ?? [], accountById, byAccountDay, limits));

  const windowUsage = [today, ...recentDays];
  const losses = windowUsage.filter((d) => d.lossPercent > 0).map((d) => d.lossPercent);

  return {
    limits,
    today,
    previousTradingDay,
    daysSincePreviousTradingDay,
    recentDays,
    windowDays,
    daysOverNormal: windowUsage.filter((d) => d.exceededNormal).length,
    daysOverMax: windowUsage.filter((d) => d.exceededMax).length,
    worstLossPercent: losses.length > 0 ? Math.max(...losses) : null,
    remainingTodayPercent:
      limits.maxPercent > 0 ? Math.max(0, limits.maxPercent - today.lossPercent) : 0,
  };
}
