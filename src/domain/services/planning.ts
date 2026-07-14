import { addWeeks } from "date-fns";
import type { EquityPoint } from "./statistics";

export interface PlanWeek {
  week: number;
  date: Date;
  balance: number;
  /** Growth vs. the starting balance (week 0). */
  cumulativePercent: number;
  /** Currency gained since the previous week (0 for week 0). */
  weekGainAmount: number;
  /** Growth vs. the previous week only, not cumulative (0 for week 0). */
  weekGainPercent: number;
}

/**
 * Projects a compounding weekly growth plan from a starting balance.
 * Week 0 is the starting point; weeks 1..weeks apply the growth rate.
 */
export function buildWeeklyPlan(
  startBalance: number,
  weeklyGrowthPercent: number,
  weeks: number,
  startDate: Date = new Date(),
): PlanWeek[] {
  const growthFactor = 1 + weeklyGrowthPercent / 100;
  const rows: PlanWeek[] = [
    {
      week: 0,
      date: startDate,
      balance: startBalance,
      cumulativePercent: 0,
      weekGainAmount: 0,
      weekGainPercent: 0,
    },
  ];

  for (let week = 1; week <= weeks; week += 1) {
    const previousBalance = rows[week - 1].balance;
    const balance = startBalance * growthFactor ** week;
    rows.push({
      week,
      date: addWeeks(startDate, week),
      balance,
      cumulativePercent: ((balance - startBalance) / startBalance) * 100,
      weekGainAmount: balance - previousBalance,
      weekGainPercent: ((balance - previousBalance) / previousBalance) * 100,
    });
  }

  return rows;
}

export interface PlanProgressRow extends PlanWeek {
  /** Real account balance as of this week's date; null for weeks not yet reached. */
  actualBalance: number | null;
  /** How far actual balance is from the target, as a percent of the target (positive = ahead). */
  aheadPercent: number | null;
}

/**
 * Overlays a saved plan with the account's real equity curve, so each past
 * week shows target vs. actual and future weeks stay as pure targets.
 */
export function computePlanProgress(
  plan: PlanWeek[],
  equityCurve: EquityPoint[],
  now: Date = new Date(),
): PlanProgressRow[] {
  const sorted = [...equityCurve].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return plan.map((row) => {
    if (row.date > now || sorted.length === 0) {
      return { ...row, actualBalance: null, aheadPercent: null };
    }

    let actualBalance = sorted[0].balance;
    for (const point of sorted) {
      if (new Date(point.date).getTime() <= row.date.getTime()) {
        actualBalance = point.balance;
      } else {
        break;
      }
    }

    const aheadPercent =
      row.balance !== 0 ? ((actualBalance - row.balance) / row.balance) * 100 : null;

    return { ...row, actualBalance, aheadPercent };
  });
}
