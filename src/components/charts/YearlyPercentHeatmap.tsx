import {
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import type { DailyPercentPoint } from "@/domain";
import { formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface YearlyPercentHeatmapProps {
  data: DailyPercentPoint[];
  year: number;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function heatTone(percent: number, maxAbsolute: number, hasTrades: boolean): string {
  if (!hasTrades) return "bg-muted/15 hover:bg-muted/30";
  if (percent === 0 || maxAbsolute === 0) return "bg-muted/70 ring-1 ring-border";

  const intensity = Math.abs(percent) / maxAbsolute;
  if (percent > 0) {
    if (intensity > 0.75) return "bg-success/80 hover:bg-success";
    if (intensity > 0.5) return "bg-success/60 hover:bg-success/75";
    if (intensity > 0.25) return "bg-success/40 hover:bg-success/55";
    return "bg-success/25 hover:bg-success/40";
  }
  if (intensity > 0.75) return "bg-danger/80 hover:bg-danger";
  if (intensity > 0.5) return "bg-danger/60 hover:bg-danger/75";
  if (intensity > 0.25) return "bg-danger/40 hover:bg-danger/55";
  return "bg-danger/25 hover:bg-danger/40";
}

/** Twelve compact monthly calendars, with daily return encoded by color intensity. */
export function YearlyPercentHeatmap({ data, year }: YearlyPercentHeatmapProps) {
  const pointsByDay = new Map(data.map((point) => [point.key, point]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>Daily intensity within each month</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success/60" /> Profit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-danger/60" /> Loss
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted/30" /> No trades
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }, (_, month) => {
          const monthDate = new Date(year, month, 1);
          const days = eachDayOfInterval({
            start: startOfMonth(monthDate),
            end: endOfMonth(monthDate),
          });
          const monthPoints = days
            .map((day) => pointsByDay.get(format(day, "yyyy-MM-dd")))
            .filter((point): point is DailyPercentPoint => point !== undefined);
          const monthTotal = monthPoints.reduce(
            (sum, point) => sum + point.percent,
            0,
          );
          const maxAbsolute = monthPoints.reduce(
            (max, point) => Math.max(max, Math.abs(point.percent)),
            0,
          );
          const leadingBlanks = (startOfMonth(monthDate).getDay() + 6) % 7;

          return (
            <div
              key={month}
              className="rounded-lg border border-border bg-background/30 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{format(monthDate, "MMMM")}</span>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    monthTotal > 0
                      ? "text-success"
                      : monthTotal < 0
                        ? "text-danger"
                        : "text-muted-foreground",
                  )}
                >
                  {monthPoints.length > 0 ? formatSignedPercent(monthTotal) : "—"}
                </span>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((weekday, index) => (
                  <span
                    key={`${weekday}-${index}`}
                    className="text-center text-[9px] text-muted-foreground"
                  >
                    {weekday}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: leadingBlanks }, (_, blank) => (
                  <span key={`blank-${blank}`} className="h-5" />
                ))}
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const point = pointsByDay.get(key);
                  const title = point
                    ? `${format(day, "dd MMM yyyy")}: ${formatSignedPercent(point.percent)} · ${point.trades} trade${point.trades === 1 ? "" : "s"}`
                    : `${format(day, "dd MMM yyyy")}: no trades`;
                  return (
                    <span
                      key={key}
                      title={title}
                      aria-label={title}
                      className={cn(
                        "h-5 rounded-sm transition-colors",
                        heatTone(point?.percent ?? 0, maxAbsolute, Boolean(point?.trades)),
                      )}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
