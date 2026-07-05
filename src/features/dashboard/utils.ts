import { format } from "date-fns";

/** Today's date as the yyyy-MM-dd key used for the daily mental check. */
export function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}
