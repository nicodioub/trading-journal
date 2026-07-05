import { useMemo } from "react";

export interface ChartTokens {
  primary: string;
  success: string;
  danger: string;
  grid: string;
  axis: string;
  muted: string;
}

const FALLBACK: ChartTokens = {
  primary: "hsl(250 70% 62%)",
  success: "hsl(150 55% 48%)",
  danger: "hsl(0 72% 58%)",
  grid: "hsl(220 12% 16%)",
  axis: "hsl(220 8% 58%)",
  muted: "hsl(220 8% 58%)",
};

function readToken(name: string): string | null {
  if (typeof window === "undefined") return null;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return raw ? `hsl(${raw})` : null;
}

/**
 * Resolves the design-token colors into concrete `hsl(...)` strings that
 * Recharts can apply to SVG marks — so charts follow the same palette as the
 * rest of the app and stay theme-aware.
 */
export function useChartTokens(): ChartTokens {
  return useMemo(
    () => ({
      primary: readToken("--primary") ?? FALLBACK.primary,
      success: readToken("--success") ?? FALLBACK.success,
      danger: readToken("--danger") ?? FALLBACK.danger,
      grid: readToken("--border") ?? FALLBACK.grid,
      axis: readToken("--muted-foreground") ?? FALLBACK.axis,
      muted: readToken("--muted-foreground") ?? FALLBACK.muted,
    }),
    [],
  );
}
