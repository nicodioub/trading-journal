import { endOfWeek, startOfWeek } from "date-fns";
import type { Account, Trade } from "../models";
import { tradeTime } from "./tradeStats";
import {
  buildEquityCurve,
  computePerformanceStats,
  type EquityPoint,
  type PerformanceStats,
} from "./statistics";

export interface AccountSummary {
  account: Account;
  performance: PerformanceStats;
  tradeCount: number;
  totalPnl: number;
  totalReturnPct: number;
  /** Drawdown from the running equity peak, right now. */
  currentDrawdownPct: number;
  /** Worst peak-to-trough drawdown ever reached. */
  maxDrawdownPct: number;
  equityCurve: EquityPoint[];
}

/** Everything the account dashboard needs, derived from trades + the account. */
export function computeAccountSummary(
  account: Account,
  trades: Trade[],
): AccountSummary {
  const performance = computePerformanceStats(trades);
  const equityCurve = buildEquityCurve(account.initialCapital, trades);
  const { currentDrawdownPct, maxDrawdownPct } = computeDrawdown(equityCurve);

  const totalPnl = performance.totalPnl;
  const totalReturnPct =
    account.initialCapital > 0 ? (totalPnl / account.initialCapital) * 100 : 0;

  return {
    account,
    performance,
    tradeCount: trades.length,
    totalPnl,
    totalReturnPct,
    currentDrawdownPct,
    maxDrawdownPct,
    equityCurve,
  };
}

function computeDrawdown(curve: EquityPoint[]): {
  currentDrawdownPct: number;
  maxDrawdownPct: number;
} {
  let peak = -Infinity;
  let maxDrawdownPct = 0;
  for (const point of curve) {
    peak = Math.max(peak, point.balance);
    if (peak > 0) {
      const dd = ((peak - point.balance) / peak) * 100;
      maxDrawdownPct = Math.max(maxDrawdownPct, dd);
    }
  }

  const last = curve[curve.length - 1];
  const currentDrawdownPct =
    peak > 0 && last ? ((peak - last.balance) / peak) * 100 : 0;

  return { currentDrawdownPct, maxDrawdownPct };
}

export interface WeeklyAccountStat {
  weekStart: string; // ISO date, Monday
  weekEnd: string; // ISO date, Sunday
  /** Account balance at the start of this week (Monday 00:00). */
  startBalance: number;
  /** Account balance right now. */
  currentBalance: number;
  pnl: number;
  /** Change over the week, relative to Monday's starting balance. */
  returnPct: number;
}

/**
 * How much this account grew (or shrank) this calendar week, Monday to
 * Sunday — the trader's own "how's my week going" number, distinct from the
 * all-time return shown elsewhere.
 */
export function computeWeeklyAccountStat(
  account: Account,
  trades: Trade[],
  referenceDate: Date = new Date(),
): WeeklyAccountStat {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });

  const closed = trades.filter((t) => t.status === "closed");
  const before = closed.filter((t) => tradeTime(t) < weekStart.getTime());
  const during = closed.filter(
    (t) => tradeTime(t) >= weekStart.getTime() && tradeTime(t) <= weekEnd.getTime(),
  );

  const startBalance =
    account.initialCapital + before.reduce((sum, t) => sum + (t.resultAmount ?? 0), 0);
  const pnl = during.reduce((sum, t) => sum + (t.resultAmount ?? 0), 0);
  const currentBalance = startBalance + pnl;
  const returnPct = startBalance !== 0 ? (pnl / startBalance) * 100 : 0;

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    startBalance,
    currentBalance,
    pnl,
    returnPct,
  };
}
