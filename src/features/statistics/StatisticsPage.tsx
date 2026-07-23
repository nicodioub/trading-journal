import { useMemo, useState } from "react";
import {
  DailyPercentChart,
  PnlBarChart,
  YearlyPercentHeatmap,
} from "@/components/charts";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
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
  dailyPercentByYear,
  percentageYears,
  pnlByDay,
  pnlByMonth,
  pnlByWeek,
} from "@/domain";
import {
  formatCurrency,
  formatPercent,
  formatRR,
  formatSignedPercent,
} from "@/lib/format";

const ALL = "all";
type Period = "day" | "week" | "month";

export function StatisticsPage() {
  const { data: accounts = [] } = useAccounts();
  const [accountId, setAccountId] = useState<string>(ALL);
  const [period, setPeriod] = useState<Period>("month");
  const [year, setYear] = useState<string>("");

  const { data: allTrades = [] } = useTrades();
  const trades = useMemo(
    () =>
      accountId === ALL
        ? allTrades
        : allTrades.filter((trade) => trade.accountId === accountId),
    [accountId, allTrades],
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
  const years = useMemo(
    () => percentageYears(allTrades, accounts),
    [accounts, allTrades],
  );
  const requestedYear = Number(year);
  const selectedYear =
    year && years.includes(requestedYear)
      ? requestedYear
      : (years[0] ?? new Date().getFullYear());
  const yearlyData = useMemo(
    () => dailyPercentByYear(allTrades, accounts, selectedYear),
    [accounts, allTrades, selectedYear],
  );
  const yearlySummary = useMemo(() => {
    if (yearlyData.length === 0) {
      return { total: 0, best: null, worst: null };
    }
    return {
      total: yearlyData.reduce((sum, day) => sum + day.percent, 0),
      best: yearlyData.reduce((best, day) =>
        day.percent > best.percent ? day : best,
      ),
      worst: yearlyData.reduce((worst, day) =>
        day.percent < worst.percent ? day : worst,
      ),
    };
  }, [yearlyData]);

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

      <div className="space-y-6">
        {perf.closedTrades === 0 ? (
          <EmptyState
            title="No closed trades yet"
            description="Log some trades to unlock your performance statistics."
          />
        ) : (
          <>
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

          </>
        )}

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle>Yearly daily percentage trend</CardTitle>
                <CardDescription>
                  All accounts combined · uses Result %, or derives it from Result $ and account capital
                </CardDescription>
              </div>
              {years.length > 0 && (
                <Select value={String(selectedYear)} onValueChange={setYear}>
                  <SelectTrigger className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((availableYear) => (
                      <SelectItem key={availableYear} value={String(availableYear)}>
                        {availableYear}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              {yearlyData.length === 0 ? (
                <EmptyState
                  title="No percentage results yet"
                  description="Add Result % or Result $ to closed trades to see the all-account yearly trend."
                  className="py-10"
                />
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile
                      label={`${selectedYear} net return`}
                      value={formatSignedPercent(yearlySummary.total)}
                      intent={yearlySummary.total >= 0 ? "positive" : "negative"}
                    />
                    <StatTile label="Active days" value={String(yearlyData.length)} />
                    <StatTile
                      label="Best day"
                      value={formatSignedPercent(yearlySummary.best?.percent ?? 0)}
                      hint={yearlySummary.best?.label}
                      intent="positive"
                    />
                    <StatTile
                      label="Worst day"
                      value={formatSignedPercent(yearlySummary.worst?.percent ?? 0)}
                      hint={yearlySummary.worst?.label}
                      intent="negative"
                    />
                  </div>
                  <div className="h-80">
                    <DailyPercentChart data={yearlyData} year={selectedYear} />
                  </div>
                  <div className="space-y-3 border-t border-border pt-5">
                    <div>
                      <h3 className="text-sm font-semibold">Monthly heatmap</h3>
                      <p className="text-xs text-muted-foreground">
                        Hover a day to see its exact all-account return.
                      </p>
                    </div>
                    <YearlyPercentHeatmap
                      data={yearlyData}
                      year={selectedYear}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
