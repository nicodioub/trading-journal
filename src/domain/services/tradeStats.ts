import type { Direction, Trade, TradeOutcome } from "../models";

/** Timestamp used for ordering a trade on a timeline (close time, else entry). */
export function tradeTime(trade: Trade): number {
  return new Date(trade.closedAt ?? trade.date).getTime();
}

/** Classify a closed trade's outcome from its monetary (or percentage) result. */
export function getOutcome(trade: Trade): TradeOutcome {
  if (trade.status === "open") return "open";
  const result = trade.resultAmount ?? trade.resultPercent;
  if (result === null || result === undefined) return "breakeven";
  if (result > 0) return "win";
  if (result < 0) return "loss";
  return "breakeven";
}

export function isWin(trade: Trade): boolean {
  return getOutcome(trade) === "win";
}

export function isLoss(trade: Trade): boolean {
  return getOutcome(trade) === "loss";
}

/**
 * Risk/reward actually achieved. Uses the explicit rrAchieved when present,
 * otherwise derives it from prices:
 *   Long:  (exit - entry) / (entry - stop)
 *   Short: (entry - exit) / (stop - entry)
 */
export function computeRR(trade: Trade): number | null {
  if (trade.rrAchieved !== null && trade.rrAchieved !== undefined) {
    return trade.rrAchieved;
  }
  const { entryPrice, exitPrice, stopLoss, direction } = trade;
  if (exitPrice === null || stopLoss === null) return null;
  return riskReward(entryPrice, stopLoss, exitPrice, direction);
}

/**
 * Planned RR from entry / stop / target, for live preview in the trade form
 * before a trade is closed.
 */
export function computePlannedRR(
  entry: number | null,
  stop: number | null,
  target: number | null,
  direction: Direction,
): number | null {
  if (entry === null || stop === null || target === null) return null;
  return riskReward(entry, stop, target, direction);
}

function riskReward(
  entry: number,
  stop: number,
  exitOrTarget: number,
  direction: Direction,
): number | null {
  const risk = direction === "long" ? entry - stop : stop - entry;
  if (risk <= 0) return null;
  const reward =
    direction === "long" ? exitOrTarget - entry : entry - exitOrTarget;
  return reward / risk;
}
