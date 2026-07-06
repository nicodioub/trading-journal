import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatTile } from "@/components/ui";
import type { FirstThought, Trade } from "@/domain";
import {
  BIAS_LABELS,
  computeAvgPnlByBias,
  computeBiasFrequency,
  computeOutcomeAttachmentExpectancy,
  computeProcessFocusStat,
  computeReadinessExpectancy,
  computeReadinessStats,
  mostAndLeastDisciplinedWeekday,
} from "@/domain";
import { formatCurrency, formatPercent, formatRR } from "@/lib/format";

function pnlText(value: number | null, currency: string): string {
  return value !== null ? formatCurrency(value, currency, { signed: true }) : "—";
}

function expectancyIntent(value: number | null): "positive" | "negative" | "neutral" {
  if (value === null) return "neutral";
  return value >= 0 ? "positive" : "negative";
}

interface PsychInsightsProps {
  thoughts: FirstThought[];
  trades: Trade[];
  currency: string;
}

export function PsychInsights({ thoughts, trades, currency }: PsychInsightsProps) {
  if (thoughts.length === 0) return null;

  const readiness = computeReadinessStats(thoughts, trades);
  const biasFreq = computeBiasFrequency(thoughts);
  const biasPnl = computeAvgPnlByBias(thoughts, trades);
  const process = computeProcessFocusStat(thoughts, trades);
  const readinessExpectancy = computeReadinessExpectancy(thoughts, trades);
  const outcomeExpectancy = computeOutcomeAttachmentExpectancy(thoughts, trades);
  const { most: mostDisciplined, least: leastDisciplined } = mostAndLeastDisciplinedWeekday(thoughts);

  const biasPnlByTag = new Map(biasPnl.map((b) => [b.tag, b]));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Trading Readiness intelligence</h2>
        <p className="text-sm text-muted-foreground">
          What your daily first-thought check-ins reveal over time.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Avg readiness"
          value={readiness.avgReadiness !== null ? readiness.avgReadiness.toFixed(0) : "—"}
        />
        <StatTile
          label="Avg readiness — winning days"
          value={
            readiness.avgReadinessWinningDays !== null
              ? readiness.avgReadinessWinningDays.toFixed(0)
              : "—"
          }
          intent="positive"
        />
        <StatTile
          label="Avg readiness — losing days"
          value={
            readiness.avgReadinessLosingDays !== null
              ? readiness.avgReadinessLosingDays.toFixed(0)
              : "—"
          }
          intent="negative"
        />
        <StatTile label="Check-ins logged" value={String(readiness.sampleSize)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most frequent biases</CardTitle>
          <CardDescription>Share of check-in days each bias was detected.</CardDescription>
        </CardHeader>
        <CardContent>
          {biasFreq.length === 0 ? (
            <p className="text-sm text-muted-foreground">No biases detected yet.</p>
          ) : (
            <div className="space-y-3">
              {biasFreq.slice(0, 6).map((b) => {
                const pnl = biasPnlByTag.get(b.tag);
                return (
                  <div key={b.tag} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{BIAS_LABELS[b.tag]}</span>
                      <span className="text-muted-foreground">
                        {formatPercent(b.percentDays, 0)} of days
                        {pnl?.avgPnl !== null && pnl?.avgPnl !== undefined && (
                          <> · avg PnL {pnlText(pnl.avgPnl, currency)}</>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${b.percentDays}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Readiness vs expectancy</CardTitle>
            <CardDescription>
              Average R-multiple when readiness scored above {readinessExpectancy.threshold}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <StatTile
              label={`Above ${readinessExpectancy.threshold}`}
              value={formatRR(readinessExpectancy.avgAbove)}
              hint={`${readinessExpectancy.sampleAbove} days`}
              intent={expectancyIntent(readinessExpectancy.avgAbove)}
            />
            <StatTile
              label={`At or below ${readinessExpectancy.threshold}`}
              value={formatRR(readinessExpectancy.avgAtOrBelow)}
              hint={`${readinessExpectancy.sampleAtOrBelow} days`}
              intent={expectancyIntent(readinessExpectancy.avgAtOrBelow)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outcome attachment vs expectancy</CardTitle>
            <CardDescription>
              Average R-multiple when outcome attachment scored above {outcomeExpectancy.threshold}/10.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <StatTile
              label="High attachment days"
              value={formatRR(outcomeExpectancy.avgAbove)}
              hint={`${outcomeExpectancy.sampleAbove} days`}
              intent={expectancyIntent(outcomeExpectancy.avgAbove)}
            />
            <StatTile
              label="Low attachment days"
              value={formatRR(outcomeExpectancy.avgAtOrBelow)}
              hint={`${outcomeExpectancy.sampleAtOrBelow} days`}
              intent={expectancyIntent(outcomeExpectancy.avgAtOrBelow)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Process focus vs PnL</CardTitle>
            <CardDescription>
              Average PnL when process orientation scores above {process.threshold}/10.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <StatTile
              label="High process days"
              value={pnlText(process.avgPnlHighProcess, currency)}
              intent={
                process.avgPnlHighProcess !== null && process.avgPnlHighProcess >= 0
                  ? "positive"
                  : "negative"
              }
            />
            <StatTile
              label="Low process days"
              value={pnlText(process.avgPnlLowProcess, currency)}
              intent={
                process.avgPnlLowProcess !== null && process.avgPnlLowProcess >= 0
                  ? "positive"
                  : "negative"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discipline by weekday</CardTitle>
            <CardDescription>Where you're sharpest, and where you're not.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <StatTile
              label="Most disciplined"
              value={mostDisciplined?.weekday ?? "—"}
              hint={
                mostDisciplined?.avgDiscipline !== null && mostDisciplined?.avgDiscipline !== undefined
                  ? `${Math.round(mostDisciplined.avgDiscipline)}/10 discipline`
                  : undefined
              }
            />
            <StatTile
              label="Least disciplined"
              value={leastDisciplined?.weekday ?? "—"}
              hint={
                leastDisciplined?.avgDiscipline !== null && leastDisciplined?.avgDiscipline !== undefined
                  ? `${Math.round(leastDisciplined.avgDiscipline)}/10 discipline`
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
