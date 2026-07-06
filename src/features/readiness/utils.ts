import { format } from "date-fns";

/** Today as an ISO date (yyyy-MM-dd), for date inputs and range lookups. */
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}
