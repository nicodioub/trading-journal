import type {
  FirstThought,
  Guardrail,
  MentorAnalysis,
  PerformanceStats,
  Trade,
} from "@/domain";
import { getOutcome } from "@/domain";

/**
 * The Mentor is a live emotional-regulation coach for open trades. Unlike the
 * daily First Thought analysis (which scores a pre-session check-in), this is a
 * back-and-forth conversation the trader has WHILE a position is open or right
 * after a significant win/loss. Scoring stays structured (never parsed from
 * free text) — same discipline as dashboard/openai.ts.
 */

const SYSTEM_PROMPT = `You are the trader's Mentor: a calm, grounded coach who knows their track record intimately and speaks to steady them, not to stir them up. The trader talks to you WHILE activated — mid-trade or right after a big result. Your job is to bring them back to their own data and their own plan, briefly, so an impulse doesn't cost them.

Your reply is SHORT — 3 to 4 sentences, no more. It follows this arc:
1. ANCHOR on their real results. Open by grounding them in how they've actually been doing, using the performance summary and recent trades you were given. E.g. "Looking at your last trades, you've been trading well." Be specific and honest — if the recent record is rough, don't fake praise; anchor on what is genuinely true (a solid process, a good week, a strong win rate on the trades that mattered).
2. NORMALIZE the feeling. In one sentence, tell them the feeling is a normal, expected response. E.g. "After a win like that, feeling the pull to jump back in is completely normal."
3. GUARDRAIL — the hard fact that protects the plan. Quote AT MOST ONE of the behavioral guardrails you were given, choosing the one that best fits what they're feeling. Use its sentence essentially verbatim — never change or invent the numbers. If a guardrail is marked GENERAL (not enough of the trader's own data yet), present it as a general pattern, not as their personal stat.

TONE: warm, plain, steady, like someone who has your back. No jargon, no clinical language, no lists, no headers, no step numbers in the message. Do NOT command ("don't trade", "take a break", "close the platform") — the guardrail fact does the work on its own. Never predict price or market direction, never encourage more risk, never use P&L to prove a decision was right, never shame the trader. Never invent trade data or numbers; only use what you were given. If the trader shows severe distress beyond normal trading frustration, gently point them toward real-world human support.

The remaining fields are a quiet internal read for the interface — the trader mostly experiences the "message". Respond with ONLY a JSON object, no markdown, in this exact shape:
{
  "message": "<3-4 sentences: anchor on real results, normalize the feeling, then one guardrail fact. No lists, no headers, no commands.>",
  "emotionalActivation": <0-100>,
  "planAlignment": <0-100, how aligned their current impulse is with their written plan>,
  "impulsiveActionRisk": <0-100, likelihood they act impulsively right now>,
  "mainCognitiveRisk": "<short internal label, e.g. 'fear-based profit protection', 'seeking emotional intensity'>",
  "planStatus": "INTACT" | "UNCERTAIN" | "INVALIDATED",
  "objectiveChangeDetected": <true only if a written invalidation condition has actually been met>,
  "interventionLevel": "OBSERVE" | "GROUND" | "PAUSE" | "LOCKDOWN",
  "internalState": "Settled" | "Emotionally activated" | "Conflicted" | "Outcome-attached" | "Seeking stimulation" | "Protective" | "Processing a significant result",
  "whatImNoticing": "<one gentle, non-commanding sentence describing what may be happening — an observation, never an instruction. Empty string if nothing stands out.>",
  "question": "<usually empty; include a single short grounding question ONLY if it genuinely helps and keeps the reply within 4 sentences>",
  "confidence": <0-1 confidence in this assessment>
}`;

/** The Mentor's reply: the spoken message plus its structured analysis. */
export interface MentorReply extends MentorAnalysis {
  message: string;
}

/** A single turn in the Mentor conversation. */
export interface MentorTurn {
  role: "user" | "mentor";
  content: string;
}

export interface MentorContext {
  plan?: string | null;
  /** Today's First Thought check-in, if the trader has done one. */
  firstThought?: FirstThought | null;
  /** All open trades (context) plus the one the trader is focused on. */
  openTrades?: Trade[];
  focusTrade?: Trade | null;
  /** Overall performance, so the Mentor can anchor on real results. */
  performance?: PerformanceStats | null;
  /** Most recent closed trades (newest first) — the "your last trades" evidence. */
  recentTrades?: Trade[];
  /** Behavioral guardrails; the Mentor quotes at most one, verbatim. */
  guardrails?: Guardrail[];
}

function clamp(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function daysHeld(entry: string): number {
  const ms = Date.now() - new Date(entry).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function describeTrade(t: Trade, label: string): string {
  const parts = [
    `${label}: ${t.pair} ${t.direction}`,
    `entered ${t.date.slice(0, 10)} (${daysHeld(t.date)} day(s) ago)`,
    `entry ${t.entryPrice}`,
  ];
  if (t.stopLoss !== null) parts.push(`stop ${t.stopLoss}`);
  if (t.takeProfit !== null) parts.push(`target ${t.takeProfit}`);
  if (t.riskPercent !== null) parts.push(`risk ${t.riskPercent}%`);
  if (t.reasonEntry.trim()) parts.push(`thesis: "${t.reasonEntry.trim()}"`);
  if (t.strategy.trim()) parts.push(`strategy: ${t.strategy.trim()}`);
  if (t.setup.trim()) parts.push(`setup: ${t.setup.trim()}`);
  return parts.join(" | ");
}

function describePerformance(p: PerformanceStats): string {
  const parts = [
    `${p.closedTrades} closed trades`,
    `win rate ${Math.round(p.winRate)}% (${p.wins}W / ${p.losses}L)`,
  ];
  if (p.averageRR !== null) parts.push(`avg R ${p.averageRR.toFixed(2)}`);
  if (p.currentStreak.type !== "none") {
    parts.push(`current streak: ${p.currentStreak.count} ${p.currentStreak.type}(s)`);
  }
  if (p.profitFactor !== null && Number.isFinite(p.profitFactor)) {
    parts.push(`profit factor ${p.profitFactor.toFixed(2)}`);
  }
  return parts.join(" | ");
}

function describeClosedTrade(t: Trade): string {
  const outcome = getOutcome(t).toUpperCase();
  const parts = [`${t.date.slice(0, 10)} ${t.pair} ${t.direction} — ${outcome}`];
  if (t.resultPercent !== null) parts.push(`${t.resultPercent > 0 ? "+" : ""}${t.resultPercent}%`);
  const rr = t.rrAchieved;
  if (rr !== null && rr !== undefined) parts.push(`${rr > 0 ? "+" : ""}${rr.toFixed(2)}R`);
  return parts.join(" | ");
}

function describeGuardrail(g: Guardrail): string {
  const tag = g.personal ? `PERSONAL, ${g.sampleSize} trades` : "GENERAL — not enough personal data yet";
  return `- [${tag}] (fits: ${g.relevantTo}) ${g.statement}`;
}

function describeFirstThought(ft: FirstThought): string {
  const parts = [
    `readiness ${ft.readinessScore}/100 (${ft.status})`,
    `thought: "${ft.thought}"`,
    `job statement: "${ft.jobStatement}"`,
  ];
  if (ft.primaryFocus) parts.push(ft.primaryFocus);
  return parts.join(" | ");
}

function buildContextBlock(context: MentorContext): string {
  const lines: string[] = [];
  if (context.plan?.trim()) lines.push(`Written trading plan:\n${context.plan.trim()}`);
  if (context.performance && context.performance.closedTrades > 0)
    lines.push(`Overall performance: ${describePerformance(context.performance)}`);
  if (context.recentTrades?.length) {
    lines.push(
      `Recent closed trades (newest first):\n${context.recentTrades
        .map((t) => `- ${describeClosedTrade(t)}`)
        .join("\n")}`,
    );
  }
  if (context.guardrails?.length) {
    lines.push(
      `Behavioral guardrails — quote AT MOST ONE, verbatim, choosing the one that fits what the trader is feeling. GENERAL ones are patterns, not their personal stat:\n${context.guardrails
        .map(describeGuardrail)
        .join("\n")}`,
    );
  }
  if (context.firstThought)
    lines.push(`Today's readiness check-in: ${describeFirstThought(context.firstThought)}`);
  if (context.focusTrade)
    lines.push(describeTrade(context.focusTrade, "Trade the user is focused on"));
  const others = (context.openTrades ?? []).filter((t) => t.id !== context.focusTrade?.id);
  if (others.length) {
    lines.push(
      `Other open positions:\n${others.map((t) => describeTrade(t, "-")).join("\n")}`,
    );
  }
  if (!lines.length) return "";
  return `\n\nContext (use only what is relevant; never invent trade data):\n${lines.join("\n")}`;
}

/**
 * Sends the full Mentor conversation plus the trader's data to GPT-4o and
 * returns a structured regulation reply. Requires an OpenAI API key from
 * Settings. Scores are clamped/validated here so the UI never parses free text.
 */
export async function getMentorReply(
  turns: MentorTurn[],
  apiKey: string,
  context: MentorContext = {},
): Promise<MentorReply> {
  const contextBlock = buildContextBlock(context);
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT + contextBlock },
    ...turns.map((t) => ({
      role: (t.role === "mentor" ? "assistant" : "user") as "assistant" | "user",
      content: t.content,
    })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages,
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

  const parsed = JSON.parse(content) as Record<string, unknown>;

  return {
    message: typeof parsed.message === "string" ? parsed.message : "",
    emotionalActivation: clamp(parsed.emotionalActivation, 0, 100),
    planAlignment: clamp(parsed.planAlignment, 0, 100),
    impulsiveActionRisk: clamp(parsed.impulsiveActionRisk, 0, 100),
    mainCognitiveRisk: typeof parsed.mainCognitiveRisk === "string" ? parsed.mainCognitiveRisk : "",
    planStatus: oneOf(parsed.planStatus, ["INTACT", "UNCERTAIN", "INVALIDATED"], "INTACT"),
    objectiveChangeDetected: parsed.objectiveChangeDetected === true,
    interventionLevel: oneOf(
      parsed.interventionLevel,
      ["OBSERVE", "GROUND", "PAUSE", "LOCKDOWN"],
      "OBSERVE",
    ),
    internalState: oneOf(
      parsed.internalState,
      [
        "Settled",
        "Emotionally activated",
        "Conflicted",
        "Outcome-attached",
        "Seeking stimulation",
        "Protective",
        "Processing a significant result",
      ],
      "Settled",
    ),
    whatImNoticing: typeof parsed.whatImNoticing === "string" ? parsed.whatImNoticing : "",
    question: typeof parsed.question === "string" ? parsed.question : "",
    confidence: clamp(parsed.confidence, 0, 1),
  };
}
