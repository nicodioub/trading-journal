import { addWeeks } from "date-fns";

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
