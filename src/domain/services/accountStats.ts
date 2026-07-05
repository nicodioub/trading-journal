import type { Account, Trade } from "../models";
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
