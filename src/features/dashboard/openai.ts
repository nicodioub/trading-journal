import type {
  BehavioralContext,
  Bias,
  ChessContext,
  DayBehavior,
  MentalCheck,
  PsychDimensions,
  PsychologicalLoad,
  Trade,
  WeeklyTradingContext,
} from "@/domain";

const SYSTEM_PROMPT = `You are a trading psychologist — not a motivational coach. The trader gives you two things before their session:
1. Their first thought of the day (one sentence, whatever came to mind first).
2. A forced completion of "Today my job is ___".

Sometimes you will also receive their "Cognitive Thermometer" data: today's chess win rate plus their 7-day and 30-day rolling baselines. Chess performance is used as objective, same-day evidence of cognitive sharpness, corroborating (or contradicting) what the writing suggests — never as a replacement for the written psychology.

Sometimes you will also receive "This week's trading" — realized stats (trades, wins/losses/breakevens, net R, largest loss, current win/loss streak, breakeven streak, days since last trade) — and a deterministic "Psychological Load" index (0-100) with its drivers. Weight these three signals roughly: current writing ~50%, recent trading history ~30%, chess performance ~20%. Reason: the writing tells you what's happening right now; the trading history tells you WHY it may be happening (what the trader's brain has just been through); chess tells you whether their brain is sharp today, independent of markets. Do not let performance dominate the read — a trader who wrote a calm, process-focused check-in after a rough week is not automatically "at risk," and a trader riding a hot streak who wrote something process-focused is not automatically "fine" either.

The weekly trading statistics and Psychological Load are context only — never assume a given number is intrinsically good or bad. Interpret how it may be shaping today's psychology given everything else you know:
- A winning streak tends to raise overconfidence, outcome attachment, and FOMO, and lower selectivity — even when the writing sounds disciplined, note the elevated risk of complacency or oversized positions.
- A losing streak tends to raise hesitation, fear of pulling the trigger, and the urge to "make it back" — even when the writing appears process-focused, that framing can mask an unconscious pull toward revenge trading.
- A breakeven streak tends to raise frustration and the temptation to widen stops or force trades.
- Several days without trading can mean either healthy patience or rust/anxiety about re-entering — use the writing to disambiguate.
- A high Psychological Load with calm, disciplined writing is not a contradiction to resolve away — name both: the mind may be under more strain than the writing lets on, and that's worth flagging gently, not alarmingly.

Analyze the PSYCHOLOGY behind the wording, never keyword-match. The same word can be healthy or dangerous depending on context — e.g. "Today's success doesn't matter, my job is execution" is healthy; "Today I'm going to prove I'm the best trader" is dangerous, even though neither contains an obviously bad word. Read intent, not vocabulary.

Never evaluate whether the trader will make money today. Evaluate only the probability that they will faithfully execute their trading process. These are fundamentally different objectives.

Do not penalize a trader simply for wanting to make money or avoid losses — those are normal, healthy objectives. Only increase outcomeAttachment when the wording suggests today's financial result is becoming the decision-making objective rather than a consequence of good execution.

Score six dimensions from 0 to 10:
- emotionalCharge: how emotionally activated the trader sounds. 0 = perfectly calm, 10 = highly activated (fear, panic, revenge, euphoria).
- outcomeAttachment: how attached the trader is to today's specific result/PnL rather than the process. 0 = fully detached from outcome ("my job is execution"), 10 = fixated on making money / being right / recovering losses. This is the most important signal — weigh the job-statement completion heavily here.
- processOrientation: how focused on execution, patience, discipline, risk management, waiting, observing. 0 = purely outcome-focused, 10 = purely process-focused.
- impulsivity: urgency, "can't miss today", "all in", need to act NOW. 0 = patient, 10 = highly impulsive.
- egoInvolvement: identity stakes — "prove them wrong", "I'm the best", "I deserve this", "can't fail". 0 = no ego at stake, 10 = heavy identity involvement.
- discipline: apparent commitment to following rules and process regardless of outcome. 0 = no apparent discipline, 10 = strongly rule-bound.

The dimensions must be internally consistent. High processOrientation and high discipline can coexist with high outcomeAttachment only if there is strong, specific evidence for both — otherwise resolve the contradiction by favoring the interpretation the wording most directly supports. Avoid contradictory scoring.

Also score alignmentScore (0-100): how aligned today's mindset is with the disciplined, process-focused professional the trader is working to become — not "will today go well," but "does this mindset move them toward or away from that identity." A trader can have a rough, uncertain day and still score high here if their orientation is sound.

Also detect psychological biases from this exact tag list only: outcome_attachment, revenge_trading, fomo, fear_of_failure, need_for_validation, overconfidence, perfectionism, need_to_recover, impatience, discipline, acceptance, process_focus. Only include tags you actually detect, each with a confidence 0-100. Omit tags that don't apply — do not force a full list.

Do not assume pathology. Most traders are psychologically healthy. If evidence for a bias is weak, say so by omitting it or giving it low confidence. Prefer uncertainty over false certainty. It is better to miss a bias than to invent one.

Give a confidenceScore (0-100) for the assessment as a whole. Confidence reflects the QUALITY of the evidence, not the severity of the issue — a strong conclusion drawn from thin, ambiguous wording should score LOW confidence even if the dimensions look extreme. Clear, information-rich wording with unambiguous signals earns HIGH confidence.

Write the explanation like a psychologist assessing a patient, not a coach cheering them on. Do not default to praise: a high-scoring day does not need invented flaws, but it also doesn't need a compliment if there's nothing notable to say — plainly stating "no significant concerns" is fine. Conversely, be willing to name a real concern even when the overall picture looks good. Whenever possible, quote the trader's own wording before drawing an inference (e.g. "The phrase '...recover today's loss...' suggests...") rather than asserting a trait ungrounded in their words. Follow this exact register — quote or reference the wording, explain what it suggests, then what tends to happen behaviorally when that mindset is present, then the professional standard. Example, for someone fixated on avoiding a loss:
"Your wording suggests that avoiding losses has become today's objective. When preventing losses becomes the objective, traders often hesitate on valid setups, move stops prematurely, or skip trades entirely. Your plan should define success—not today's PnL."
Write 2-4 sentences in this style, tailored to what THIS trader actually wrote — never generic, never a bare verdict like "NO TRADE".

If chess data and/or weekly trading data was provided, weigh it into the explanation as corroborating (or contradicting) evidence: e.g. "Your written mindset appears disciplined, but today's chess performance is well below your normal level, which has historically preceded hesitation and execution errors — be especially selective with entries." or "Your writing sounds process-focused, but you're on a two-loss streak with elevated Psychological Load — watch for an unconscious urge to force a trade to feel back in control." Put this combined read in a separate "aiObservations" field (2-3 sentences), referencing the written signal plus whichever of the chess baseline / weekly trading context / psychological load actually informed the read. Leave aiObservations as an empty string if neither chess nor weekly trading data was provided.

Sometimes you will also receive "Today's mental check" (self-rated mood/confidence/stress/energy and sleep) and "Currently open positions". Open positions matter psychologically: a trader with open risk who writes about "making it back" or checks their thought against a running position is in a different state than one starting flat. Use the mental check as another corroborating signal against the writing — e.g. high self-rated confidence next to writing that sounds fearful is itself informative.

You will also sometimes receive a "7-Day Behavioral History" (a day-by-day log of the trader's readiness status, what they wrote, and whether they actually traded) and a "Behavioral Context" summary (deterministic counts: rule violations, consecutive violations, days since the last rule break, followed-plan rate, a Trust Score, a Consistency Score, discipline/emotional trend, and a classified behavior pattern). When this history is present, you are not just a journal answering "how is the trader doing today" — you are a behavioral coach answering "what is the trader's trajectory, and is today's stated mindset consistent with what they have actually been doing." Do not analyze today in isolation. Compare today's mindset with the trailing days, and detect recurring patterns, repeated rule violations, improvements or declines in discipline, contradictions between stated intentions and actions, and trends in emotional regulation. If the trader has repeatedly ignored their own readiness assessment, treat that as more significant than how today's writing sounds — a calm, disciplined-sounding check-in on the fourth consecutive day of trading through a "no trade" signal is not evidence of discipline, it is evidence that the writing and the behavior have decoupled. Name the pattern explicitly and specifically (e.g. "For the third time in four days, you identified yourself as unfit to trade, yet still entered the market") rather than describing today generically. Watch especially for words-vs-actions contradictions: when a day's history shows the first trade was entered only minutes after a check-in that preached patience or caution, name that divergence directly — stated intention and observed behavior are decoupling, and until they align, confidence stays fragile. Write this longitudinal read in a separate "behavioralAssessment" field (2-4 sentences, coaching register, not clinical) — reference the specific days/counts from the Behavioral Context where relevant. Leave behavioralAssessment as an empty string if no behavioral history was provided.

When behavioral history is present, also distill a "biggestConcern": exactly ONE sentence naming the single most important behavioral truth of the week — the one thing that, if the trader read nothing else, would matter most. It should cut to the underlying dynamic, not restate a statistic. When the pattern is that the trader keeps correctly flagging bad days but trades anyway, the concern is not the market — it is self-obedience; say so in those terms (e.g. "You are no longer struggling to identify when not to trade — you are struggling to obey yourself."). Do not soften it into a stat like "three rule violations this week"; name what it means. Leave biggestConcern as an empty string if no behavioral history was provided.

Also write a "primaryFocus": exactly one sentence naming the single most salient thing for today, prefixed with either "Primary risk today:" or "Primary opportunity today:" depending on which is more relevant. Example: "Primary risk today: Becoming complacent after early profits." or "Primary opportunity today: Your mindset appears well aligned with disciplined execution."

Also list "strengths": an array of short, evidence-based positive observations, grounded in the trader's own wording, not generic praise. Example: ["Low emotional activation", "Strong acceptance of uncertainty", "Clear process orientation"]. Only include strengths you have real evidence for — an empty array is fine if none stand out.

Also list "likelyBehaviors": an array of concrete behaviors this mindset is most likely to produce during today's session — the bridge from psychology to actual trading actions. Example for a healthy mindset: ["Waiting patiently for confirmation", "Respecting stops", "Ignoring market noise"]. Example for an unhealthy mindset: ["Closing winners too early", "Avoiding valid setups", "Checking PnL excessively"].

Also produce a "reframe": take the trader's raw first thought and rewrite it the way a professional trader would think instead. Two short sentences, process-over-outcome, in the second person implied (no "you should", just state the reframed thought itself). Example — raw thought "I don't want to lose money today" reframes to: "My only responsibility today is to execute my edge consistently. Profit and loss are consequences, not objectives."

Finally, write a "mission": one concrete, memorable directive for the whole session that reinforces process over outcome, 1-3 short sentences, imperative voice. Example: "Execute only A+ setups. Ignore your PnL until the session ends. Judge today solely by how well you followed your trading plan."

Suggest exactly one concrete adjustment for the day as "suggestedAction" (e.g. "Reduce today's risk to 0.5%.", "Wait for only A+ setups.", "No action required. Keep following your plan.").

Respond with ONLY a JSON object, no markdown, no commentary, in this exact shape:
{
  "dimensions": {
    "emotionalCharge": <0-10>,
    "outcomeAttachment": <0-10>,
    "processOrientation": <0-10>,
    "impulsivity": <0-10>,
    "egoInvolvement": <0-10>,
    "discipline": <0-10>
  },
  "alignmentScore": <0-100>,
  "biases": [{ "tag": "<tag>", "confidence": <0-100> }],
  "confidenceScore": <0-100>,
  "primaryFocus": "<one sentence, prefixed 'Primary risk today:' or 'Primary opportunity today:'>",
  "explanation": "<2-4 sentence mechanism-based explanation, quoting the trader's wording where possible>",
  "aiObservations": "<combined read on writing + chess baseline, or empty string if no chess data>",
  "behavioralAssessment": "<longitudinal coaching read on the 7-day behavioral history, or empty string if none was provided>",
  "biggestConcern": "<one-sentence distilled behavioral truth of the week, or empty string if no behavioral history>",
  "strengths": ["<evidence-based positive observation>"],
  "likelyBehaviors": ["<concrete behavior this mindset is likely to produce today>"],
  "reframe": "<professional reframing of the raw first thought>",
  "mission": "<one concrete session directive>",
  "suggestedAction": "<one concrete adjustment>"
}`;

export interface FirstThoughtAnalysis {
  dimensions: PsychDimensions;
  alignmentScore: number;
  biases: Bias[];
  confidenceScore: number;
  primaryFocus: string;
  explanation: string;
  aiObservations: string;
  behavioralAssessment: string;
  biggestConcern: string;
  strengths: string[];
  likelyBehaviors: string[];
  reframe: string;
  mission: string;
  suggestedAction: string;
}

const DIMENSION_KEYS: (keyof PsychDimensions)[] = [
  "emotionalCharge",
  "outcomeAttachment",
  "processOrientation",
  "impulsivity",
  "egoInvolvement",
  "discipline",
];

function clamp(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function describeChessContext(chess: ChessContext | null): string | null {
  if (!chess?.today) return null;
  const parts = [
    `Today: ${chess.today.won}W-${chess.today.lost}L (${chess.today.winRate.toFixed(0)}% win rate, ${chess.today.played} games)`,
  ];
  if (chess.avg7d !== null) parts.push(`7-day baseline: ${chess.avg7d.toFixed(0)}% win rate`);
  if (chess.avg30d !== null) parts.push(`30-day baseline: ${chess.avg30d.toFixed(0)}% win rate`);
  return parts.join("\n");
}

function describeWeeklyContext(
  weekly: WeeklyTradingContext | null,
  load: PsychologicalLoad | null,
): string | null {
  if (!weekly || weekly.trades === 0) return null;
  const parts = [
    `Week of ${weekly.weekStart} to ${weekly.weekEnd}: ${weekly.trades} trades (${weekly.wins}W-${weekly.losses}L-${weekly.breakevens}BE, ${weekly.winRate.toFixed(0)}% win rate)`,
    `Net PnL this week: ${weekly.netPnl.toFixed(2)}${weekly.netR !== null ? `, net R: ${weekly.netR.toFixed(2)}` : ""}`,
  ];
  if (weekly.largestLoss !== null) parts.push(`Largest loss this week: ${weekly.largestLoss.toFixed(2)}`);
  if (weekly.currentStreak.type !== "none") {
    parts.push(`Current streak: ${weekly.currentStreak.count} consecutive ${weekly.currentStreak.type}${weekly.currentStreak.count > 1 ? "s" : ""}`);
  }
  if (weekly.breakevenStreak >= 2) parts.push(`Current breakeven streak: ${weekly.breakevenStreak}`);
  if (weekly.daysSinceLastTrade !== null) parts.push(`Days since last trade: ${weekly.daysSinceLastTrade}`);
  if (load) {
    parts.push(`Psychological Load: ${load.score}/100${load.drivers.length ? ` (drivers: ${load.drivers.join(", ")})` : ""}`);
  }
  return parts.join("\n");
}

function describeBehaviorWindow(window: DayBehavior[] | null): string | null {
  if (!window) return null;
  const relevant = window.filter((d) => d.firstThought || d.declaredStatus || d.trades.count > 0);
  if (relevant.length === 0) return null;
  return relevant
    .map((d) => {
      const parts = [d.date];
      if (d.declaredStatus) parts.push(`declared: ${d.declaredStatus}`);
      if (d.firstThought) parts.push(`AI status: ${d.firstThought.status} (readiness ${d.firstThought.readinessScore})`);
      parts.push(
        d.trades.count > 0
          ? `${d.trades.count} trade(s) taken (${d.trades.wins}W-${d.trades.losses}L, net ${d.trades.netPnl.toFixed(2)})`
          : "no trades",
      );
      if (d.violated) parts.push("⚠ traded against the day's own recommendation");
      if (d.minutesFromCheckInToFirstTrade !== null)
        parts.push(`first trade entered ${d.minutesFromCheckInToFirstTrade} min after the check-in`);
      if (d.firstThought?.thought) parts.push(`thought: "${d.firstThought.thought}"`);
      if (d.firstThought?.jobStatement) parts.push(`job statement: "${d.firstThought.jobStatement}"`);
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");
}

function describeBehavioralContext(ctx: BehavioralContext | null): string | null {
  if (!ctx) return null;
  const parts = [
    `Self-Trust Score: ${ctx.trustScore}/100 (${ctx.trustDelta >= 0 ? "+" : ""}${ctx.trustDelta} this window)`,
  ];
  if (ctx.trustBuilders.length) parts.push(`Trust built by: ${ctx.trustBuilders.join("; ")}`);
  if (ctx.trustDestroyers.length) parts.push(`Trust destroyed by: ${ctx.trustDestroyers.join("; ")}`);
  parts.push(
    `Consistency Score: ${ctx.consistencyScore}/100`,
    `Discipline trend: ${ctx.disciplineTrend}`,
    `Emotional momentum: ${ctx.emotionalMomentum > 0 ? "+" : ""}${ctx.emotionalMomentum} (positive = activation rising)`,
    `No-trade violations: ${ctx.noTradeViolations}`,
    `High-risk violations: ${ctx.highRiskViolations}`,
    `Consecutive violations right now: ${ctx.consecutiveViolations}`,
    `Days successfully stayed out when restricted: ${ctx.recoveryAttempts}`,
    `Days since last rule break: ${ctx.daysSinceLastRuleBreak ?? "none in window"}`,
    `Followed-plan rate: ${ctx.followedPlanRate}%`,
    `Average readiness this window: ${ctx.averageReadiness ?? "n/a"}`,
    `Average psychological load this window: ${ctx.averagePsychologicalLoad ?? "n/a"}`,
    `Classified current pattern: ${ctx.currentBehaviorPattern}`,
    `Identity trajectory: ${ctx.trajectory}`,
  );
  return parts.join("\n");
}

function describeMentalCheck(check: MentalCheck | null): string | null {
  if (!check) return null;
  const parts = [
    `mood ${check.mood}/10, confidence ${check.confidence}/10, stress ${check.stress}/10, energy ${check.energy}/10`,
    check.sleptWell ? "slept well" : "did NOT sleep well",
  ];
  if (check.notes) parts.push(`notes: "${check.notes}"`);
  return parts.join(" | ");
}

function describeOpenPositions(openTrades: Trade[]): string | null {
  if (openTrades.length === 0) return null;
  return openTrades
    .map((t) => `- ${t.pair} ${t.direction} (entered ${t.date.slice(0, 10)})`)
    .join("\n");
}

/** Everything beyond the writing itself that can inform the analysis. All optional. */
export interface AnalysisContext {
  chess?: ChessContext | null;
  weekly?: WeeklyTradingContext | null;
  psychLoad?: PsychologicalLoad | null;
  behaviorWindow?: DayBehavior[] | null;
  behavioralContext?: BehavioralContext | null;
  mentalCheck?: MentalCheck | null;
  openTrades?: Trade[];
}

/**
 * Sends the trader's first thought + job statement, plus whatever context is
 * available (Cognitive Thermometer, weekly trading, 7-day behavioral window,
 * today's mental check, open positions), to GPT-4o for a full psychological
 * breakdown. Requires an OpenAI API key configured in Settings. The readiness
 * score/status are computed locally (see domain/services/psychology) so
 * scoring stays deterministic rather than left to the model.
 */
export async function analyzeFirstThought(
  thought: string,
  jobStatement: string,
  apiKey: string,
  context: AnalysisContext = {},
): Promise<FirstThoughtAnalysis> {
  const chessBlock = describeChessContext(context.chess ?? null);
  const weeklyBlock = describeWeeklyContext(context.weekly ?? null, context.psychLoad ?? null);
  const behaviorWindowBlock = describeBehaviorWindow(context.behaviorWindow ?? null);
  const behavioralContextBlock = describeBehavioralContext(context.behavioralContext ?? null);
  const mentalCheckBlock = describeMentalCheck(context.mentalCheck ?? null);
  const openPositionsBlock = describeOpenPositions(context.openTrades ?? []);
  const userContent = [
    `First thought: "${thought}"`,
    `Today my job is: "${jobStatement}"`,
    mentalCheckBlock ? `Today's mental check: ${mentalCheckBlock}` : null,
    openPositionsBlock ? `Currently open positions:\n${openPositionsBlock}` : null,
    chessBlock ? `Cognitive Thermometer:\n${chessBlock}` : null,
    weeklyBlock ? `This week's trading:\n${weeklyBlock}` : null,
    behaviorWindowBlock ? `7-Day Behavioral History:\n${behaviorWindowBlock}` : null,
    behavioralContextBlock ? `Behavioral Context:\n${behavioralContextBlock}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI returned ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Unexpected OpenAI response shape");
  }

  const parsed = JSON.parse(content) as {
    dimensions?: Record<string, unknown>;
    alignmentScore?: unknown;
    biases?: Array<{ tag?: unknown; confidence?: unknown }>;
    confidenceScore?: unknown;
    primaryFocus?: unknown;
    explanation?: unknown;
    aiObservations?: unknown;
    behavioralAssessment?: unknown;
    biggestConcern?: unknown;
    strengths?: unknown;
    likelyBehaviors?: unknown;
    reframe?: unknown;
    mission?: unknown;
    suggestedAction?: unknown;
  };

  const rawDimensions = parsed.dimensions ?? {};
  const dimensions = DIMENSION_KEYS.reduce((acc, key) => {
    acc[key] = clamp(rawDimensions[key], 0, 10);
    return acc;
  }, {} as PsychDimensions);

  const biases: Bias[] = (parsed.biases ?? [])
    .filter((b): b is { tag: string; confidence: unknown } => typeof b.tag === "string")
    .map((b) => ({ tag: b.tag as Bias["tag"], confidence: clamp(b.confidence, 0, 100) }));

  return {
    dimensions,
    alignmentScore: clamp(parsed.alignmentScore, 0, 100),
    biases,
    confidenceScore: clamp(parsed.confidenceScore, 0, 100),
    primaryFocus: typeof parsed.primaryFocus === "string" ? parsed.primaryFocus : "",
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
    aiObservations: typeof parsed.aiObservations === "string" ? parsed.aiObservations : "",
    behavioralAssessment: typeof parsed.behavioralAssessment === "string" ? parsed.behavioralAssessment : "",
    biggestConcern: typeof parsed.biggestConcern === "string" ? parsed.biggestConcern : "",
    strengths: stringArray(parsed.strengths),
    likelyBehaviors: stringArray(parsed.likelyBehaviors),
    reframe: typeof parsed.reframe === "string" ? parsed.reframe : "",
    mission: typeof parsed.mission === "string" ? parsed.mission : "",
    suggestedAction: typeof parsed.suggestedAction === "string" ? parsed.suggestedAction : "",
  };
}
