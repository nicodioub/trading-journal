import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const firstThoughtStatusSchema = z.enum(["ready", "caution", "high_risk", "no_trade"]);
export type FirstThoughtStatus = z.infer<typeof firstThoughtStatusSchema>;

export const biasTagSchema = z.enum([
  "outcome_attachment",
  "revenge_trading",
  "fomo",
  "fear_of_failure",
  "need_for_validation",
  "overconfidence",
  "perfectionism",
  "need_to_recover",
  "impatience",
  "discipline",
  "acceptance",
  "process_focus",
]);
export type BiasTag = z.infer<typeof biasTagSchema>;

export const biasSchema = z.object({
  tag: biasTagSchema,
  /** Confidence the model has in this tag, 0-100. */
  confidence: z.number().min(0).max(100),
});
export type Bias = z.infer<typeof biasSchema>;

/** Six psychological dimensions scored 0-10 by the AI from the day's inputs. */
export const psychDimensionsSchema = z.object({
  emotionalCharge: z.number().min(0).max(10),
  outcomeAttachment: z.number().min(0).max(10),
  processOrientation: z.number().min(0).max(10),
  impulsivity: z.number().min(0).max(10),
  egoInvolvement: z.number().min(0).max(10),
  discipline: z.number().min(0).max(10),
});
export type PsychDimensions = z.infer<typeof psychDimensionsSchema>;

/**
 * Snapshot of the Cognitive Thermometer data actually sent to the model at
 * analysis time — stored (not recomputed later) so the UI can truthfully
 * show what evidence informed a given day's assessment.
 */
export const chessContextSnapshotSchema = z
  .object({
    today: z
      .object({
        played: z.number(),
        won: z.number(),
        lost: z.number(),
        winRate: z.number(),
      })
      .nullable(),
    avg7d: z.number().nullable(),
    avg30d: z.number().nullable(),
    gamesPlayed7d: z.number(),
    gamesPlayed30d: z.number(),
  })
  .nullable();
export type ChessContextSnapshot = z.infer<typeof chessContextSnapshotSchema>;

/**
 * Snapshot of this week's realized trading performance sent to the model at
 * analysis time — same rationale as chessContextSnapshotSchema: stored, not
 * recomputed later, so the UI can truthfully show what evidence informed a
 * given day's assessment.
 */
export const weeklyContextSnapshotSchema = z
  .object({
    weekStart: z.string(),
    weekEnd: z.string(),
    trades: z.number(),
    wins: z.number(),
    losses: z.number(),
    breakevens: z.number(),
    winRate: z.number(),
    netR: z.number().nullable(),
    netPnl: z.number(),
    largestLoss: z.number().nullable(),
    currentStreak: z.object({
      type: z.enum(["win", "loss", "none"]),
      count: z.number(),
    }),
    breakevenStreak: z.number(),
    daysSinceLastTrade: z.number().nullable(),
  })
  .nullable();
export type WeeklyContextSnapshot = z.infer<typeof weeklyContextSnapshotSchema>;

/** Deterministic 0-100 "psychological load" index and its active drivers, computed alongside the weekly context. */
export const psychologicalLoadSnapshotSchema = z
  .object({
    score: z.number().min(0).max(100),
    drivers: z.array(z.string()),
  })
  .nullable();
export type PsychologicalLoadSnapshot = z.infer<typeof psychologicalLoadSnapshotSchema>;

export const behaviorPatternSchema = z.enum([
  "Disciplined",
  "Revenge Trading",
  "Forcing Trades",
  "Patient",
  "Outcome Attached",
  "Fearful",
  "Overconfident",
]);
export type BehaviorPattern = z.infer<typeof behaviorPatternSchema>;

/**
 * Snapshot of the deterministic Behavior Engine output — the trailing 7-day
 * rolling read on discipline and self-trust — sent to the model at analysis
 * time and stored (not recomputed later) for the same reason as the other
 * context snapshots: the UI must be able to truthfully show what evidence
 * informed a given day's assessment.
 */
export const trajectoryStateSchema = z.enum([
  "Identity Stable",
  "Rebuilding Discipline",
  "Losing Consistency",
  "Breaking Self Trust",
]);
export type TrajectoryState = z.infer<typeof trajectoryStateSchema>;

export const behavioralContextSnapshotSchema = z
  .object({
    trustScore: z.number().min(0).max(100),
    // Defaults on the fields below keep older stored snapshots (written before
    // these were added) parseable — they simply read as neutral.
    trustDelta: z.number().default(0),
    trustBuilders: z.array(z.string()).default([]),
    trustDestroyers: z.array(z.string()).default([]),
    consistencyScore: z.number().min(0).max(100),
    disciplineTrend: z.enum(["improving", "stable", "declining"]),
    emotionalMomentum: z.number(),
    noTradeViolations: z.number(),
    highRiskViolations: z.number(),
    consecutiveViolations: z.number(),
    recoveryAttempts: z.number(),
    daysSinceLastRuleBreak: z.number().nullable(),
    followedPlanRate: z.number().min(0).max(100),
    averageReadiness: z.number().nullable(),
    averagePsychologicalLoad: z.number().nullable(),
    currentBehaviorPattern: behaviorPatternSchema,
    trajectory: trajectoryStateSchema.default("Identity Stable"),
  })
  .nullable();
export type BehavioralContextSnapshot = z.infer<typeof behavioralContextSnapshotSchema>;

/**
 * Daily "first thought" check-in — a free-form first thought plus a forced
 * "today my job is ___" completion, analyzed by an LLM into psychological
 * dimensions and rolled up into a single Trading Readiness score (0-100).
 */
export const firstThoughtSchema = z.object({
  id: idSchema,
  /** The calendar day this check belongs to (ISO date, one per day). */
  date: timestampSchema,
  thought: z.string().min(1),
  jobStatement: z.string().min(1),
  dimensions: psychDimensionsSchema,
  readinessScore: z.number().min(0).max(100),
  status: firstThoughtStatusSchema,
  /** How aligned today's mindset is with the disciplined trader the user is working to become, 0-100. */
  alignmentScore: z.number().min(0).max(100).default(100),
  /** How confident the model is in this assessment, 0-100. */
  confidenceScore: z.number().min(0).max(100).default(100),
  /** The single most salient risk or opportunity for the session, one sentence. */
  primaryFocus: z.string().default(""),
  explanation: z.string().default(""),
  biases: z.array(biasSchema).default([]),
  /** Evidence-based positive traits the model detected, in plain language. */
  strengths: z.array(z.string()).default([]),
  /** Behaviors this mindset is likely to produce during the session. */
  likelyBehaviors: z.array(z.string()).default([]),
  /** A professional-trader reframing of the raw first thought. */
  reframe: z.string().default(""),
  /** One concrete, memorable directive for the session. */
  mission: z.string().default(""),
  suggestedAction: z.string().default(""),
  /** Combined read on written psychology + today's cognitive thermometer, when chess data is available. */
  aiObservations: z.string().default(""),
  /** Exact chess data sent to the model, or null if none was available at analysis time. */
  chessContext: chessContextSnapshotSchema.default(null),
  /** Exact weekly trading performance data sent to the model, or null if no closed trades existed yet. */
  weeklyContext: weeklyContextSnapshotSchema.default(null),
  /** Deterministic psychological load index derived from the weekly context, or null if not computed. */
  psychologicalLoad: psychologicalLoadSnapshotSchema.default(null),
  /** Deterministic Behavior Engine output over the trailing 7 days, or null if there wasn't enough history. */
  behavioralContext: behavioralContextSnapshotSchema.default(null),
  /** The model's longitudinal, coach-style read on the trailing behavioral window — how today's mindset compares to recent days, not just today in isolation. */
  behavioralAssessment: z.string().default(""),
  /** The single most important behavioral truth of the week, one sentence, pinned above everything else. */
  biggestConcern: z.string().default(""),
  createdAt: timestampSchema,
});
export type FirstThought = z.infer<typeof firstThoughtSchema>;

export const firstThoughtInputSchema = firstThoughtSchema.omit({
  id: true,
  createdAt: true,
});
export type FirstThoughtInput = z.infer<typeof firstThoughtInputSchema>;
