import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import {
  useChessStatsList,
  useFirstThought,
  useFirstThoughts,
  useSaveFirstThought,
  useSettings,
  useTrades,
} from "@/data";
import type { FirstThoughtStatus, PsychDimensions } from "@/domain";
import {
  applyChessAdjustment,
  computeChessContext,
  computePsychologicalLoad,
  computeReadinessComparison,
  computeReadinessScore,
  computeWeeklyTradingContext,
  deriveRisks,
  statusForScore,
} from "@/domain";
import { todayKey } from "../utils";
import { analyzeFirstThought } from "../openai";

const STATUS_META: Record<
  FirstThoughtStatus,
  { emoji: string; label: string; description: string; tone: string; ring: string }
> = {
  ready: {
    emoji: "🟢",
    label: "READY",
    description: "Trading psychology appears stable. Proceed normally.",
    tone: "border-success/40 bg-success/10 text-success",
    ring: "hsl(var(--success))",
  },
  caution: {
    emoji: "🟡",
    label: "CAUTION",
    description: "Minor emotional bias detected. Reduce position size and strictly follow your checklist.",
    tone: "border-warning/40 bg-warning/10 text-warning",
    ring: "hsl(var(--warning))",
  },
  high_risk: {
    emoji: "🟠",
    label: "HIGH RISK",
    description: "Emotional state may interfere with decision making. Consider waiting 30 minutes.",
    tone: "border-danger/30 bg-danger/5 text-danger/90",
    ring: "hsl(var(--danger) / 0.7)",
  },
  no_trade: {
    emoji: "🔴",
    label: "DO NOT TRADE",
    description: "Strong psychological biases detected. Trading today has a significantly increased probability of breaking your process.",
    tone: "border-danger/50 bg-danger/10 text-danger",
    ring: "hsl(var(--danger))",
  },
};

const DIMENSION_META: Array<{ key: keyof PsychDimensions; label: string }> = [
  { key: "outcomeAttachment", label: "Outcome Attachment" },
  { key: "processOrientation", label: "Process Orientation" },
  { key: "emotionalCharge", label: "Emotional Charge" },
  { key: "impulsivity", label: "Impulsivity Risk" },
  { key: "egoInvolvement", label: "Ego Involvement" },
  { key: "discipline", label: "Discipline" },
];

function ReadinessGauge({ score, color }: { score: number; color: string }) {
  const angle = (score / 100) * 360;
  return (
    <div
      className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${angle}deg, hsl(var(--muted)) ${angle}deg)`,
      }}
    >
      <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-surface">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{Math.round(score)}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ComparisonDelta({ current, reference }: { current: number; reference: number | null }) {
  if (reference === null) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const diff = current - reference;
  if (Math.abs(diff) < 1) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  return diff > 0 ? (
    <TrendingUp className="h-3.5 w-3.5 text-success" />
  ) : (
    <TrendingDown className="h-3.5 w-3.5 text-danger" />
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-2.5 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/**
 * The daily "first thought" check-in — a free thought plus a forced
 * completion of "Today my job is ___", analyzed into six psychological
 * dimensions and rolled into a single Trading Readiness score. Purely
 * informational: it never blocks the app, it just tells you plainly whether
 * today looks like a trading day.
 */
export function FirstThoughtCard() {
  const date = todayKey();
  const { data: settings } = useSettings();
  const { data: existing } = useFirstThought(date);
  const { data: history = [] } = useFirstThoughts();
  const { data: chessStats = [] } = useChessStatsList();
  const { data: trades = [] } = useTrades();
  const save = useSaveFirstThought();
  const [thought, setThought] = useState("");
  const [jobStatement, setJobStatement] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = existing;
  const comparison = result ? computeReadinessComparison(history, date) : null;
  const risks = result ? deriveRisks(result.dimensions, result.biases) : [];

  const handleAnalyze = async () => {
    const trimmedThought = thought.trim();
    const trimmedJob = jobStatement.trim();
    if (!trimmedThought || !trimmedJob) return;
    if (!settings?.openaiApiKey) {
      setError("Add an OpenAI API key in Settings first.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const chessContext = computeChessContext(chessStats, date);
      const weeklyContext = computeWeeklyTradingContext(trades, date);
      const psychologicalLoad = computePsychologicalLoad(weeklyContext, chessContext);
      const analysis = await analyzeFirstThought(
        trimmedThought,
        trimmedJob,
        settings.openaiApiKey,
        chessContext,
        weeklyContext.trades > 0 ? weeklyContext : null,
        weeklyContext.trades > 0 ? psychologicalLoad : null,
      );
      const baseScore = computeReadinessScore(analysis.dimensions);
      const readinessScore = applyChessAdjustment(baseScore, chessContext);
      const status = statusForScore(readinessScore);
      await save.mutateAsync({
        date,
        thought: trimmedThought,
        jobStatement: trimmedJob,
        dimensions: analysis.dimensions,
        readinessScore,
        status,
        alignmentScore: analysis.alignmentScore,
        confidenceScore: analysis.confidenceScore,
        primaryFocus: analysis.primaryFocus,
        explanation: analysis.explanation,
        aiObservations: analysis.aiObservations,
        chessContext,
        weeklyContext: weeklyContext.trades > 0 ? weeklyContext : null,
        psychologicalLoad: weeklyContext.trades > 0 ? psychologicalLoad : null,
        biases: analysis.biases,
        strengths: analysis.strengths,
        likelyBehaviors: analysis.likelyBehaviors,
        reframe: analysis.reframe,
        mission: analysis.mission,
        suggestedAction: analysis.suggestedAction,
      });
      setThought("");
      setJobStatement("");
    } catch {
      setError("Couldn't analyze that check-in. Check your API key and connection.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>What's your first thought today?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Textarea
          placeholder="The first thing on your mind, in one sentence…"
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          className="min-h-[64px]"
        />

        <div className="space-y-1.5">
          <Label>Finish this sentence</Label>
          <div className="flex items-center gap-2 text-sm">
            <span className="whitespace-nowrap text-muted-foreground">Today my job is</span>
            <Input
              value={jobStatement}
              onChange={(e) => setJobStatement(e.target.value)}
              placeholder="execute my plan"
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !thought.trim() || !jobStatement.trim()}
          >
            {analyzing ? "Analyzing…" : "Analyze"}
          </Button>
        </div>

        {result && (
          <div className="space-y-5 border-t border-border pt-5">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <ReadinessGauge score={result.readinessScore} color={STATUS_META[result.status].ring} />
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <span className="text-xl">{STATUS_META[result.status].emoji}</span>
                  <span className="text-xl font-bold tracking-tight">
                    {STATUS_META[result.status].label}
                  </span>
                </div>
                {result.primaryFocus && (
                  <p className="text-base font-medium">{result.primaryFocus}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {STATUS_META[result.status].description}
                </p>

                <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                  <StatChip label="Alignment" value={String(Math.round(result.alignmentScore))} />
                  <StatChip
                    label="Assessment confidence"
                    value={`${Math.round(result.confidenceScore)}%`}
                  />
                </div>
              </div>
            </div>

            {comparison && (comparison.monthAverage !== null || comparison.yesterday !== null) && (
              <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-background/40 px-4 py-3 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Today</div>
                  <div className="text-lg font-semibold tabular-nums">{comparison.today}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Avg this month</div>
                  <div className="flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">
                    {comparison.monthAverage !== null ? Math.round(comparison.monthAverage) : "—"}
                    <ComparisonDelta current={comparison.today} reference={comparison.monthAverage} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Yesterday</div>
                  <div className="flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">
                    {comparison.yesterday ?? "—"}
                    <ComparisonDelta current={comparison.today} reference={comparison.yesterday} />
                  </div>
                </div>
              </div>
            )}

            <div className={`rounded-lg border px-4 py-3 text-sm ${STATUS_META[result.status].tone}`}>
              {result.explanation}
            </div>

            <p className="text-xs text-muted-foreground">
              {result.chessContext?.today ? (
                <>
                  ♟ Cognitive Thermometer included in this analysis: {result.chessContext.today.winRate.toFixed(0)}%
                  today ({result.chessContext.today.won}W-{result.chessContext.today.lost}L)
                  {result.chessContext.avg30d !== null && (
                    <> vs {result.chessContext.avg30d.toFixed(0)}% 30-day baseline</>
                  )}
                  .
                </>
              ) : (
                <>♟ No chess data was available for this day — analysis is based on writing alone.</>
              )}
            </p>

            {result.weeklyContext && result.weeklyContext.trades > 0 && (
              <div className="space-y-2 rounded-lg border border-border bg-background/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    This Week's Trading
                  </p>
                  {result.psychologicalLoad && (
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      Psychological Load: {result.psychologicalLoad.score}/100
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  {result.weeklyContext.trades} trades · {result.weeklyContext.wins}W-
                  {result.weeklyContext.losses}L-{result.weeklyContext.breakevens}BE ·{" "}
                  {result.weeklyContext.winRate.toFixed(0)}% win rate
                  {result.weeklyContext.currentStreak.type !== "none" && (
                    <>
                      {" "}
                      · {result.weeklyContext.currentStreak.count} consecutive{" "}
                      {result.weeklyContext.currentStreak.type}
                      {result.weeklyContext.currentStreak.count > 1 ? "s" : ""}
                    </>
                  )}
                </p>
                {result.psychologicalLoad && result.psychologicalLoad.drivers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Drivers: {result.psychologicalLoad.drivers.join(" · ")}
                  </p>
                )}
              </div>
            )}

            {result.aiObservations && (
              <div className="space-y-1 rounded-lg border border-border bg-background/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  AI Observations
                </p>
                <p className="text-sm">{result.aiObservations}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {DIMENSION_META.map(({ key, label }) => (
                <DimensionBar key={key} label={label} value={result.dimensions[key]} />
              ))}
            </div>

            {(result.strengths.length > 0 || risks.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {result.strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Detected Strengths
                    </p>
                    <ul className="space-y-1 text-sm">
                      {result.strengths.map((s) => (
                        <li key={s} className="flex items-start gap-2 text-success">
                          <span>✓</span>
                          <span className="text-foreground">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {risks.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Detected Risks
                    </p>
                    <ul className="space-y-1 text-sm">
                      {risks.map((r) => (
                        <li key={r} className="flex items-start gap-2 text-warning">
                          <span>⚠</span>
                          <span className="text-foreground">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {result.likelyBehaviors.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-border bg-background/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Likely Behaviors Today
                </p>
                <ul className="space-y-1 text-sm">
                  {result.likelyBehaviors.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.reframe && (
              <div className="space-y-2 rounded-lg border border-border bg-background/40 px-4 py-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Raw Thought
                  </p>
                  <p className="mt-0.5 italic text-muted-foreground">"{result.thought}"</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Professional Reframing
                  </p>
                  <p className="mt-0.5">{result.reframe}</p>
                </div>
              </div>
            )}

            {result.suggestedAction && (
              <div className="space-y-1 rounded-lg border border-border bg-background/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommended Adjustment
                </p>
                <p className="text-sm">{result.suggestedAction}</p>
              </div>
            )}

            {result.mission && (
              <div className="space-y-1 rounded-xl border-2 border-primary/40 bg-primary/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Today's Mission
                </p>
                <p className="text-sm font-medium">{result.mission}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
