import { Flame, Percent, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import { StatTile } from "@/components/ui";
import { useAccounts, useSettings, useTrades } from "@/data";
import { computePerformanceStats } from "@/domain";
import { formatCurrency, formatPercent } from "@/lib/format";
import { AccountBalancesWidget } from "./components/AccountBalancesWidget";
import { ChessThermometerCard } from "./components/ChessThermometerCard";
import { MentalCheckCard } from "./components/MentalCheckCard";
import { RecentTradesWidget } from "./components/RecentTradesWidget";

export function DashboardPage() {
  const { data: settings } = useSettings();
  const { data: accounts = [] } = useAccounts();
  const { data: trades = [] } = useTrades();

  const perf = useMemo(() => computePerformanceStats(trades), [trades]);

  const currency = accounts[0]?.currency ?? settings?.defaultCurrency ?? "USD";
  const totalInitial = accounts.reduce((sum, a) => sum + a.initialCapital, 0);
  const totalBalance = totalInitial + perf.totalPnl;

  const streak = perf.currentStreak;
  const streakLabel =
    streak.type === "none"
      ? "—"
      : `${streak.count} ${streak.type}${streak.count > 1 ? "s" : ""}`;

  return (
    <div className="space-y-6">
      {/* Motivational banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/15 via-surface to-surface px-6 py-5">
        <p className="text-lg font-medium tracking-tight">
          {settings?.motivationalQuote ?? "Trade your plan, not your emotions."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with your mental check-in before you trade.
        </p>
      </div>

      {/* Check-in + cognitive thermometer */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MentalCheckCard />
        </div>
        <ChessThermometerCard />
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total balance"
          value={formatCurrency(totalBalance, currency)}
          icon={Wallet}
          hint={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
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
