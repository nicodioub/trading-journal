import { AlertTriangle, Flame, LineChart, Percent, Trophy, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { StatTile } from "@/components/ui";
import { useAccounts, useSettings, useTrades } from "@/data";
import { getSessionSplashQuote } from "@/data/splashQuotes";
import {
  computeAccountSummary,
  computeDailyRiskContext,
  computePerformanceStats,
  isLoss,
  tradeTime,
} from "@/domain";
import { formatCurrency, formatPercent, formatSignedPercent } from "@/lib/format";
import { todayKey } from "./utils";
import { AccountBalancesWidget } from "./components/AccountBalancesWidget";
import { ChessThermometerCard } from "./components/ChessThermometerCard";
import { FirstThoughtCard } from "./components/FirstThoughtCard";
import { MarketSessionsCard } from "./components/MarketSessionsCard";
import { MyPlanCard } from "./components/MyPlanCard";
import { RecentTradesWidget } from "./components/RecentTradesWidget";

export function DashboardPage() {
  const { data: settings } = useSettings();
  const { data: accounts = [] } = useAccounts();
  const { data: trades = [] } = useTrades();
  const sessionQuote = useMemo(() => getSessionSplashQuote(), []);

  const perf = useMemo(() => computePerformanceStats(trades), [trades]);

  const currency = accounts[0]?.currency ?? settings?.defaultCurrency ?? "USD";

  // Accounts can be very different in nature (prop-firm challenge vs. live
  // broker), so summing their balances into one number is meaningless —
  // surface the best performer instead.
  const bestAccount = useMemo(() => {
    let best: { name: string; returnPct: number } | null = null;
    for (const account of accounts) {
      const accountTrades = trades.filter((t) => t.accountId === account.id);
      const { totalReturnPct } = computeAccountSummary(account, accountTrades);
      if (!best || totalReturnPct > best.returnPct) {
        best = { name: account.name, returnPct: totalReturnPct };
      }
    }
    return best;
  }, [accounts, trades]);

  const streak = perf.currentStreak;
  const streakLabel =
    streak.type === "none"
      ? "—"
      : `${streak.count} ${streak.type}${streak.count > 1 ? "s" : ""}`;

  const todayHasLoss = useMemo(() => {
    const todayKey = new Date().toDateString();
    return trades.some(
      (t) =>
        t.status === "closed" &&
        isLoss(t) &&
        new Date(tradeTime(t)).toDateString() === todayKey,
    );
  }, [trades]);

  // Nothing entered today and nothing still open — the session hasn't started,
  // so the banner slot carries the pre-session order of operations instead of
  // a warning about a day that hasn't happened yet.
  const sessionNotStarted = useMemo(() => {
    const today = new Date().toDateString();
    const isToday = (iso: string | null) => iso !== null && new Date(iso).toDateString() === today;
    return !trades.some(
      (t) => t.status === "open" || isToday(t.date) || isToday(t.closedAt),
    );
  }, [trades]);

  // Today's and the previous session's spend against the declared daily limits.
  const dailyRisk = useMemo(
    () =>
      computeDailyRiskContext(
        trades,
        accounts,
        {
          normalPercent: settings?.normalDailyRiskPercent ?? 0,
          maxPercent: settings?.maxDailyRiskPercent ?? 0,
        },
        todayKey(),
      ),
    [trades, accounts, settings?.normalDailyRiskPercent, settings?.maxDailyRiskPercent],
  );

  const previousDay = dailyRisk.previousTradingDay;
  const previousDayLabel =
    dailyRisk.daysSincePreviousTradingDay === 1 ? "Yesterday" : "Your last session";

  return (
    <div className="space-y-6">
      {/* Motivational banner — same quote shown on the boot splash */}
      <div className="px-6 py-2 text-center">
        <p className="text-lg font-medium italic tracking-tight">
          &ldquo;{sessionQuote.text}&rdquo;
        </p>
        {sessionQuote.source && (
          <p className="mt-1 text-xs text-muted-foreground">— {sessionQuote.source}</p>
        )}
      </div>

      {previousDay?.exceededMax && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-medium">
            {previousDayLabel} cost {formatSignedPercent(previousDay.netPercent)} against your{" "}
            {dailyRisk.limits.maxPercent}% daily ceiling. That money is spent — today can only
            be judged on execution, not on earning it back.
          </p>
        </div>
      )}

      {sessionNotStarted && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <LineChart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="font-medium">
            Nothing traded yet today. Open TradingView first and do the deep analysis —
            MT5 comes after, and only if the analysis actually hands you a setup.
          </p>
        </div>
      )}

      {todayHasLoss && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-medium">
            80% of days that start with a loss end negative—and continuing to trade makes the average loss about 12× larger.
            {dailyRisk.limits.maxPercent > 0 && dailyRisk.today.lossPercent > 0 && (
              <>
                {" "}
                Today has used {dailyRisk.today.lossPercent.toFixed(2)} of your{" "}
                {dailyRisk.limits.maxPercent}% daily risk budget
                {dailyRisk.today.exceededMax
                  ? " — the ceiling is reached."
                  : `, ${dailyRisk.remainingTodayPercent.toFixed(2)} points left.`}
              </>
            )}
          </p>
        </div>
      )}

      <MarketSessionsCard />

      {/* Check-in + cognitive thermometer */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MyPlanCard />
          <FirstThoughtCard />
        </div>
        <ChessThermometerCard />
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Best account"
          value={bestAccount?.name ?? "—"}
          icon={Trophy}
          hint={bestAccount ? formatSignedPercent(bestAccount.returnPct) : "No accounts yet"}
          intent={
            bestAccount ? (bestAccount.returnPct >= 0 ? "positive" : "negative") : "neutral"
          }
        />
        <StatTile
          label="Total PnL"
          value={formatCurrency(perf.totalPnl, currency, { signed: true })}
          icon={TrendingUp}
          intent={perf.totalPnl >= 0 ? "positive" : "negative"}
        />
        <StatTile
          label="Win rate"
          value={formatPercent(perf.winRate, 0)}
          icon={Percent}
          hint={`${perf.wins}W · ${perf.losses}L`}
        />
        <StatTile
          label="Current streak"
          value={streakLabel}
          icon={Flame}
          intent={
            streak.type === "win"
              ? "positive"
              : streak.type === "loss"
                ? "negative"
                : "neutral"
          }
        />
      </div>

      {/* Widgets */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountBalancesWidget />
        <RecentTradesWidget />
      </div>
    </div>
  );
}
