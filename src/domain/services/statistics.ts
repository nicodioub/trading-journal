import { format, startOfWeek } from "date-fns";
import type { Account, Trade } from "../models";
import { computeRR, getOutcome, tradeTime } from "./tradeStats";

export interface PerformanceStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number; // 0–100 (of decisive trades)
  lossRate: number; // 0–100
  totalPnl: number;
  grossProfit: number;
  grossLoss: number; // positive magnitude
  averageWin: number; // positive
  averageLoss: number; // positive magnitude
  averageRR: number | null;
  expectancy: number; // currency per trade
  profitFactor: number | null;
  bestTrade: number | null;
  worstTrade: number | null;
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
}

const EMPTY_STATS: PerformanceStats = {
  totalTrades: 0,
  closedTrades: 0,
  openTrades: 0,
  wins: 0,
  losses: 0,
  breakevens: 0,
  winRate: 0,
  lossRate: 0,
  totalPnl: 0,
  grossProfit: 0,
  grossLoss: 0,
  averageWin: 0,
  averageLoss: 0,
  averageRR: null,
  expectancy: 0,
  profitFactor: null,
  bestTrade: null,
  worstTrade: null,
  currentStreak: { type: "none", count: 0 },
  longestWinStreak: 0,
  longestLossStreak: 0,
};

/** Aggregate performance metrics over a set of trades. */
export function computePerformanceStats(trades: Trade[]): PerformanceStats {
  if (trades.length === 0) return EMPTY_STATS;

  const closed = trades.filter((t) => t.status === "closed");
  const openTrades = trades.length - closed.length;

  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let bestTrade: number | null = null;
  let worstTrade: number | null = null;

  const rrValues: number[] = [];

  for (const trade of closed) {
    const amount = trade.resultAmount ?? 0;
    const outcome = getOutcome(trade);

    if (outcome === "win") {
      wins += 1;
      grossProfit += amount;
    } else if (outcome === "loss") {
      losses += 1;
      grossLoss += Math.abs(amount);
    } else {
      breakevens += 1;
    }

    bestTrade = bestTrade === null ? amount : Math.max(bestTrade, amount);
    worstTrade = worstTrade === null ? amount : Math.min(worstTrade, amount);

    const rr = computeRR(trade);
    if (rr !== null) rrValues.push(rr);
  }

  const decisive = wins + losses;
  const winRate = decisive > 0 ? (wins / decisive) * 100 : 0;
  const lossRate = decisive > 0 ? (losses / decisive) * 100 : 0;
  const averageWin = wins > 0 ? grossProfit / wins : 0;
  const averageLoss = losses > 0 ? grossLoss / losses : 0;
  const totalPnl = grossProfit - grossLoss;

  // Expectancy per trade in account currency.
  const expectancy =
    (winRate / 100) * averageWin - (lossRate / 100) * averageLoss;

  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;

  const averageRR =
    rrValues.length > 0
      ? rrValues.reduce((sum, v) => sum + v, 0) / rrValues.length
      : null;

  const streaks = computeStreaks(closed);

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades,
    wins,
    losses,
    breakevens,
    winRate,
    lossRate,
    totalPnl,
    grossProfit,
    grossLoss,
    averageWin,
    averageLoss,
    averageRR,
    expectancy,
    profitFactor,
    bestTrade,
    worstTrade,
    ...streaks,
  };
}

function computeStreaks(closed: Trade[]): {
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
} {
  // Only decisive outcomes (win/loss) contribute to streaks.
  const outcomes = [...closed]
    .sort((a, b) => tradeTime(a) - tradeTime(b))
    .map(getOutcome)
    .filter((o): o is "win" | "loss" => o === "win" || o === "loss");

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let runType: "win" | "loss" | null = null;
  let runCount = 0;

  for (const outcome of outcomes) {
    if (outcome === runType) {
      runCount += 1;
    } else {
      runType = outcome;
      runCount = 1;
    }
    if (outcome === "win") longestWinStreak = Math.max(longestWinStreak, runCount);
    else longestLossStreak = Math.max(longestLossStreak, runCount);
  }

  // Current streak = the trailing run.
  let currentType: "win" | "loss" | "none" = "none";
  let currentCount = 0;
  for (let i = outcomes.length - 1; i >= 0; i -= 1) {
    if (currentType === "none") {
      currentType = outcomes[i];
      currentCount = 1;
    } else if (outcomes[i] === currentType) {
      currentCount += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak: { type: currentType, count: currentCount },
    longestWinStreak,
    longestLossStreak,
  };
}

export interface EquityPoint {
  date: string; // ISO
  balance: number;
  pnl: number; // cumulative
}

/**
 * Running account balance over time, seeded with initial capital.
 * Only closed trades move the balance.
 */
export function buildEquityCurve(
  initialCapital: number,
  trades: Trade[],
): EquityPoint[] {
  const closed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => tradeTime(a) - tradeTime(b));

  const start = closed.length > 0 ? closed[0].date : new Date().toISOString();
  const points: EquityPoint[] = [
    { date: start, balance: initialCapital, pnl: 0 },
  ];

  let balance = initialCapital;
  let cumulative = 0;
  for (const trade of closed) {
    const amount = trade.resultAmount ?? 0;
    balance += amount;
    cumulative += amount;
    points.push({
      date: trade.closedAt ?? trade.date,
      balance,
      pnl: cumulative,
    });
  }
  return points;
}

export interface PeriodPnl {
  key: string; // sortable key, e.g. "2026-07"
  label: string; // display label
  pnl: number;
  trades: number;
  wins: number;
}

function groupPnl(
  trades: Trade[],
  keyFn: (date: Date) => string,
  labelFn: (date: Date) => string,
): PeriodPnl[] {
  const buckets = new Map<string, PeriodPnl>();

  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    const date = new Date(trade.closedAt ?? trade.date);
    const key = keyFn(date);
    const bucket =
      buckets.get(key) ?? { key, label: labelFn(date), pnl: 0, trades: 0, wins: 0 };
    bucket.pnl += trade.resultAmount ?? 0;
    bucket.trades += 1;
    if (getOutcome(trade) === "win") bucket.wins += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function pnlByDay(trades: Trade[]): PeriodPnl[] {
  return groupPnl(
    trades,
    (d) => format(d, "yyyy-MM-dd"),
    (d) => format(d, "dd MMM"),
  );
}

export function pnlByWeek(trades: Trade[]): PeriodPnl[] {
  return groupPnl(
    trades,
    (d) => format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-'W'II"),
    (d) => `W/o ${format(startOfWeek(d, { weekStartsOn: 1 }), "dd MMM")}`,
  );
}

export function pnlByMonth(trades: Trade[]): PeriodPnl[] {
  return groupPnl(
    trades,
    (d) => format(d, "yyyy-MM"),
    (d) => format(d, "MMM yyyy"),
  );
}

export interface DailyPercentPoint {
  key: string; // yyyy-MM-dd
  label: string;
  percent: number;
  trades: number;
  accounts: number;
}

function resolveResultPercent(
  trade: Trade,
  initialCapitalByAccount: Map<string, number>,
): number | null {
  if (trade.resultPercent !== null && Number.isFinite(trade.resultPercent)) {
    return trade.resultPercent;
  }

  const initialCapital = initialCapitalByAccount.get(trade.accountId);
  if (
    trade.resultAmount === null ||
    !Number.isFinite(trade.resultAmount) ||
    initialCapital === undefined ||
    initialCapital <= 0
  ) {
    return null;
  }

  return (trade.resultAmount / initialCapital) * 100;
}

/** Calendar years that contain a closed trade with a stored or derivable percentage. */
export function percentageYears(trades: Trade[], accounts: Account[]): number[] {
  const years = new Set<number>();
  const capitalByAccount = new Map(
    accounts.map((account) => [account.id, account.initialCapital]),
  );

  for (const trade of trades) {
    if (trade.status !== "closed" || resolveResultPercent(trade, capitalByAccount) === null) {
      continue;
    }
    years.add(new Date(trade.closedAt ?? trade.date).getFullYear());
  }

  return [...years].sort((a, b) => b - a);
}

/**
 * Net percentage for each active trading day in a calendar year.
 * Percentages are summed across closed trades, so accounts and currencies can
 * be viewed together without combining monetary values.
 */
export function dailyPercentByYear(
  trades: Trade[],
  accounts: Account[],
  year: number,
): DailyPercentPoint[] {
  const capitalByAccount = new Map(
    accounts.map((account) => [account.id, account.initialCapital]),
  );
  const buckets = new Map<
    string,
    Omit<DailyPercentPoint, "accounts"> & { accountIds: Set<string> }
  >();

  for (const trade of trades) {
    if (trade.status !== "closed") continue;

    const resultPercent = resolveResultPercent(trade, capitalByAccount);
    if (resultPercent === null) continue;

    const date = new Date(trade.closedAt ?? trade.date);
    if (date.getFullYear() !== year) continue;

    const key = format(date, "yyyy-MM-dd");
    const bucket = buckets.get(key) ?? {
      key,
      label: format(date, "dd MMM"),
      percent: 0,
      trades: 0,
      accountIds: new Set<string>(),
    };
    bucket.percent += resultPercent;
    bucket.trades += 1;
    bucket.accountIds.add(trade.accountId);
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ accountIds, ...point }) => ({
      ...point,
      accounts: accountIds.size,
    }));
}

/** Best / worst single day by realized PnL. */
export function bestWorstDay(trades: Trade[]): {
  best: PeriodPnl | null;
  worst: PeriodPnl | null;
} {
  const days = pnlByDay(trades);
  if (days.length === 0) return { best: null, worst: null };
  let best = days[0];
  let worst = days[0];
  for (const day of days) {
    if (day.pnl > best.pnl) best = day;
    if (day.pnl < worst.pnl) worst = day;
  }
  return { best, worst };
}
