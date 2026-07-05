import { useMemo, useState } from "react";
import { PnlBarChart } from "@/components/charts";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatTile,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useAccounts, useTrades } from "@/data";
import {
  bestWorstDay,
  computePerformanceStats,
  pnlByDay,
  pnlByMonth,
  pnlByWeek,
} from "@/domain";
import { formatCurrency, formatPercent, formatRR } from "@/lib/format";

const ALL = "all";
type Period = "day" | "week" | "month";

export function StatisticsPage() {
  const { data: accounts = [] } = useAccounts();
  const [accountId, setAccountId] = useState<string>(ALL);
  const [period, setPeriod] = useState<Period>("month");

  const { data: trades = [] } = useTrades(
    accountId === ALL ? undefined : { accountId },
  );

  const currency =
    accountId === ALL
      ? (accounts[0]?.currency ?? "USD")
      : (accounts.find((a) => a.id === accountId)?.currency ?? "USD");

  const perf = useMemo(() => computePerformanceStats(trades), [trades]);
  const { best, worst } = useMemo(() => bestWorstDay(trades), [trades]);
  const periodData = useMemo(() => {
    if (period === "day") return pnlByDay(trades);
    if (period === "week") return pnlByWeek(trades);
    return pnlByMonth(trades);
  }, [trades, period]);

  const profitFactor =
    perf.profitFactor === null
      ? "—"
      : perf.profitFactor === Infinity
        ? "∞"
        : perf.profitFactor.toFixed(2);

  return (
    <div>
      <PageHeader
        title="Statistics"
        description="Your edge, measured — win rate, expectancy, profit factor and more."
        actions={
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {perf.closedTrades === 0 ? (
        <EmptyState
          title="No closed trades yet"
          description="Log some trades to unlock your performance statistics."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Total trades" value={String(perf.closedTrades)} />
            <StatTile label="Win rate" value={formatPercent(perf.winRate, 1)} hint={`${perf.wins}W · ${perf.losses}L`} />
            <StatTile label="Loss rate" value={formatPercent(perf.lossRate, 1)} />
            <StatTile label="Average RR" value={formatRR(perf.averageRR)} />
            <StatTile label="Average gain" value={formatCurrency(perf.averageWin, currency)} intent="positive" />
            <StatTile label="Average loss" value={formatCurrency(-perf.averageLoss, currency)} intent="negative" />
            <StatTile
              label="Expectancy / trade"
              value={formatCurrency(perf.expectancy, currency, { signed: true })}
              intent={perf.expectancy >= 0 ? "positive" : "negative"}
            />
            <StatTile label="Profit factor" value={profitFactor} />
            <StatTile
              label="Total PnL"
              value={formatCurrency(perf.totalPnl, currency, { signed: true })}
              intent={perf.totalPnl >= 0 ? "positive" : "negative"}
            />
            <StatTile
              label="Best day"
              value={best ? formatCurrency(best.pnl, currency, { signed: true }) : "—"}
              hint={best?.label}
              intent="positive"
            />
            <StatTile
              label="Worst day"
              value={worst ? formatCurrency(worst.pnl, currency, { signed: true }) : "—"}
              hint={worst?.label}
              intent="negative"
            />
            <StatTile
              label="Longest win streak"
              value={String(perf.longestWinStreak)}
              hint={`Loss streak ${perf.longestLossStreak}`}
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>PnL by period</CardTitle>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList>
                  <TabsTrigger value="day">Daily</TabsTrigger>
                  <TabsTrigger value="week">Weekly</TabsTrigger>
                  <TabsTrigger value="month">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <PnlBarChart data={periodData} currency={currency} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
