import { format } from "date-fns";

/** Parse a text input into a number, treating blank as null. */
export function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Value for a <input type="datetime-local"> representing now (local time). */
export function datetimeLocalNow(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

/** Convert a datetime-local value to an ISO-8601 string. */
export function toIso(local: string): string {
  return new Date(local).toISOString();
}

/** Split a comma-separated tag string into a clean array. */
export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
