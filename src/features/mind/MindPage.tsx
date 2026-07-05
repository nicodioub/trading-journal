import { Brain, Moon } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  StatTile,
} from "@/components/ui";
import { useAccounts, useChessStatsList, useMentalChecks, useTrades } from "@/data";
import {
  buildDailyPsychologySeries,
  buildWeeklyChessSeries,
  computeChessCorrelations,
  computePsychologyCorrelations,
  describeCorrelation,
} from "@/domain";
import { formatCurrency } from "@/lib/format";
import { ChessTradingChart } from "./components/ChessTradingChart";
import { MoodPnlScatter } from "./components/MoodPnlScatter";

function formatCorr(r: number | null): string {
  if (r === null) return "—";
  return `${r > 0 ? "+" : ""}${r.toFixed(2)}`;
}

export function MindPage() {
  const { data: checks = [] } = useMentalChecks();
  const { data: chess = [] } = useChessStatsList();
  const { data: trades = [] } = useTrades();
  const { data: accounts = [] } = useAccounts();
  const currency = accounts[0]?.currency ?? "USD";

  const psych = useMemo(
    () => computePsychologyCorrelations(checks, trades),
    [checks, trades],
  );
  const chessCorr = useMemo(
    () => computeChessCorrelations(chess, trades),
    [chess, trades],
  );
  const dailySeries = useMemo(
    () => buildDailyPsychologySeries(checks, trades),
    [checks, trades],
  );
  const weeklyChess = useMemo(
    () => buildWeeklyChessSeries(chess, trades),
    [chess, trades],
  );

  const hasAny = psych.sampleSize > 0 || chessCorr.sampleSize > 0;

  return (
    <div>
      <PageHeader
        title="Mind"
        description="How your psychology and chess sharpness relate to your trading results."
      />

      {!hasAny ? (
        <EmptyState
          icon={Brain}
          title="Not enough data yet"
          description="Log your daily check-ins, weekly chess and trades on the same days — once they overlap, the correlations appear here."
        />
      ) : (
        <div className="space-y-8">
          {/* Chess ↔ trading */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">
                Cognitive thermometer &rarr; trading
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile
                label="Chess vs trading win-rate"
                value={formatCorr(chessCorr.chessVsTradingWinRate)}
                hint={describeCorrelation(chessCorr.chessVsTradingWinRate)}
              />
              <StatTile
                label="Chess win-rate vs weekly PnL"
                value={formatCorr(chessCorr.chessVsPnl)}
                hint={describeCorrelation(chessCorr.chessVsPnl)}
              />
              <StatTile
                label="Weeks tracked"
                value={String(chessCorr.sampleSize)}
                hint="weeks with chess + trades"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Chess vs trading win-rate over time</CardTitle>
                <CardDescription>
                  When your chess dips, does your trading follow?
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyChess.length >= 2 ? (
                  <ChessTradingChart data={weeklyChess} />
                ) : (
                  <EmptyState
                    title="Track for 2+ weeks"
                    description="Log chess games and trades across at least two weeks to see the trend."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {/* Psychology ↔ trading */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">
                Psychology &rarr; trading
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile label="Mood vs PnL" value={formatCorr(psych.moodVsPnl)} hint={describeCorrelation(psych.moodVsPnl)} />
              <StatTile label="Confidence vs PnL" value={formatCorr(psych.confidenceVsPnl)} hint={describeCorrelation(psych.confidenceVsPnl)} />
              <StatTile label="Stress vs PnL" value={formatCorr(psych.stressVsPnl)} hint={describeCorrelation(psych.stressVsPnl)} />
              <StatTile label="Energy vs PnL" value={formatCorr(psych.energyVsPnl)} hint={describeCorrelation(psych.energyVsPnl)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <StatTile
                label="Avg PnL — slept well"
                value={
                  psych.avgPnlSleptWell !== null
                    ? formatCurrency(psych.avgPnlSleptWell, currency, { signed: true })
                    : "—"
                }
                intent={
                  psych.avgPnlSleptWell !== null && psych.avgPnlSleptWell >= 0
                    ? "positive"
                    : "negative"
                }
              />
              <StatTile
                label="Avg PnL — slept poorly"
                value={
                  psych.avgPnlSleptPoorly !== null
                    ? formatCurrency(psych.avgPnlSleptPoorly, currency, { signed: true })
                    : "—"
                }
                intent={
                  psych.avgPnlSleptPoorly !== null && psych.avgPnlSleptPoorly >= 0
                    ? "positive"
                    : "negative"
                }
              />
              <StatTile label="Days tracked" value={String(psych.sampleSize)} hint="days with check-in + trades" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Mood vs daily PnL</CardTitle>
                <CardDescription>Each dot is a trading day.</CardDescription>
              </CardHeader>
              <CardContent>
                {dailySeries.length >= 2 ? (
                  <MoodPnlScatter data={dailySeries} currency={currency} />
                ) : (
                  <EmptyState
                    title="Track for 2+ days"
                    description="Complete your check-in on days you trade to build this picture."
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
