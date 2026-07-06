import { z } from "zod";
import { timestampSchema } from "./common";

export const themeSchema = z.enum(["dark", "light", "system"]);
export type Theme = z.infer<typeof themeSchema>;

/** Application settings — a single row keyed by the literal "default". */
export const settingsSchema = z.object({
  id: z.literal("default"),
  motivationalQuote: z.string().default("Trade your plan, not your emotions."),
  defaultCurrency: z.string().default("USD"),
  defaultRiskPercent: z.number().nonnegative().default(1),
  theme: themeSchema.default("dark"),
  /** Chess.com username used to auto-sync the daily cognitive thermometer. */
  chessComUsername: z.string().default(""),
  /** OpenAI API key used to analyze the daily first-thought check-in. */
  openaiApiKey: z.string().default(""),
  updatedAt: timestampSchema,
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Omit<Settings, "updatedAt"> = {
  id: "default",
  motivationalQuote: "Trade your plan, not your emotions.",
  defaultCurrency: "USD",
  defaultRiskPercent: 1,
  theme: "dark",
  chessComUsername: "",
  openaiApiKey: "",
};
