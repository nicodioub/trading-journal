import { format, formatDistanceStrict } from "date-fns";

/**
 * Formatting helpers. Convention across the codebase:
 * percentages are stored and passed as 0–100 numbers (72 means 72%).
 */

export function formatCurrency(
  value: number,
  currency = "USD",
  { signed = false }: { signed?: boolean } = {},
): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return signed && value > 0 ? `+${formatted}` : formatted;
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  // Compounding projections can produce astronomically large percentages;
  // switch to compact notation (e.g. "3.36B%") instead of an unreadable
  // wall of digits.
  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value)}%`;
  }
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Risk/reward ratio, e.g. 2.5 -> "2.5R". */
export function formatRR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}R`;
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

/** Human-friendly duration between two instants, e.g. "3h", "2d". */
export function formatDuration(from: Date | string, to: Date | string): string {
  return formatDistanceStrict(new Date(from), new Date(to));
}
