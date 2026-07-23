import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useSettings } from "@/data";

/**
 * Approximate session windows, expressed in each financial centre's *local*
 * time and re-projected onto the viewer's chosen timezone. City offsets come
 * from `Intl` so DST is handled per-city; the viewer's own clock is either the
 * device's local time or a fixed UTC offset from Settings.
 */
const SESSIONS = [
  { name: "Sydney", code: "AU", tz: "Australia/Sydney", open: 7, close: 16, color: "var(--calm-low)" },
  { name: "Tokyo", code: "JP", tz: "Asia/Tokyo", open: 9, close: 18, color: "var(--primary)" },
  { name: "London", code: "GB", tz: "Europe/London", open: 8, close: 17, color: "var(--warning)" },
  { name: "New York", code: "US", tz: "America/New_York", open: 8, close: 17, color: "var(--success)" },
] as const;

// Fixed block heights keep the left detail column aligned with the right
// timeline column, and give the absolute overlays (cursor, clock) a frame.
const HEADER_H = 56;
const ROW_H = 72;
const VOL_H = 120;

/** Minutes the given IANA zone is ahead of UTC at `date` (DST-aware). */
function tzOffsetMin(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = dtf.formatToParts(date).reduce<Record<string, string>>((a, x) => {
    a[x.type] = x.value;
    return a;
  }, {});
  const h = p.hour === "24" ? 0 : Number(p.hour);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    h,
    Number(p.minute),
    Number(p.second),
  );
  return (asUtc - date.getTime()) / 60000;
}

function ordinal(d: number): string {
  if (d > 3 && d < 21) return "th";
  return ["th", "st", "nd", "rd"][d % 10] ?? "th";
}

function fmtOffset(hours: number): string {
  const sign = hours >= 0 ? "+" : "−";
  const total = Math.round(Math.abs(hours) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `UTC ${sign}${hh}${mm ? `:${String(mm).padStart(2, "0")}` : ""}`;
}

/** Local clock, weekday/date line and zone abbreviation for a financial centre. */
function cityInfo(date: Date, timeZone: string) {
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const mo = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(date);
  const day = Number(new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(date));
  const offH = tzOffsetMin(date, timeZone) / 60;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(
    date,
  );
  const tn = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  const abbr = /^[A-Za-z]{2,5}$/.test(tn) ? `${tn} ` : "";
  return { time, dateLine: `${wd} ${mo} ${day}${ordinal(day)} ${abbr}(${fmtOffset(offH)})` };
}

/** Relative trading volume (0–1) as a function of the UTC hour of day. */
function volumeAt(utcHour: number): number {
  const syd = utcHour >= 21 || utcHour < 6 ? 1 : 0;
  const tok = utcHour >= 0 && utcHour < 9 ? 1 : 0;
  const lon = utcHour >= 7 && utcHour < 16 ? 1 : 0;
  const ny = utcHour >= 12 && utcHour < 21 ? 1 : 0;
  const raw = syd + tok + lon + ny + (lon && ny ? 1.4 : 0) + (tok && lon ? 0.4 : 0);
  return Math.max(0.08, Math.min(1, raw / 3.8));
}

function to12h(hour24: number): string {
  const x = hour24 % 12;
  return String(x === 0 ? 12 : x);
}

function clockLabel(hourFloat: number): string {
  const hr = Math.floor(hourFloat) % 24;
  const m = Math.round((hourFloat - Math.floor(hourFloat)) * 60);
  const ap = hr < 12 ? "am" : "pm";
  const x = hr % 12 === 0 ? 12 : hr % 12;
  return `${x}:${String(m).padStart(2, "0")} ${ap}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TICK_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

/** Live timeline of Sydney/Tokyo/London/New York sessions in the viewer's timezone. */
export function MarketSessionsCard() {
  const { data: settings } = useSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);

  // Display offset: "auto" follows the device (DST included); otherwise a fixed
  // UTC offset chosen in Settings.
  const raw = settings?.utcOffset ?? "auto";
  const isAuto = raw === "auto";
  const dispOffsetH = isAuto ? -now.getTimezoneOffset() / 60 : Number(raw) || 0;
  const zoneLabel = isAuto ? "Local time" : fmtOffset(dispOffsetH);

  const epochH = now.getTime() / 3_600_000;
  const nowH = (((epochH + dispOffsetH) % 24) + 24) % 24;
  const nowPct = (nowH / 24) * 100;
  const weekday = WEEKDAYS[new Date(now.getTime() + dispOffsetH * 3_600_000).getUTCDay()];

  const sessions = SESSIONS.map((s) => {
    const cityOffH = tzOffsetMin(now, s.tz) / 60;
    const start = (((s.open - cityOffH + dispOffsetH) % 24) + 24) % 24;
    const end = (((s.close - cityOffH + dispOffsetH) % 24) + 24) % 24;
    const len = s.close - s.open;
    const isOpen = (((nowH - start) % 24) + 24) % 24 < len;
    const segments =
      start <= end
        ? [{ left: (start / 24) * 100, width: ((end - start) / 24) * 100 }]
        : [
            { left: (start / 24) * 100, width: ((24 - start) / 24) * 100 },
            { left: 0, width: (end / 24) * 100 },
          ];
    return { ...s, ...cityInfo(now, s.tz), isOpen, segments };
  });

  const openNames = sessions.filter((s) => s.isOpen).map((s) => s.name);

  // Volume curve sampled across the displayed 24h, projected back to UTC.
  const points: Array<[number, number]> = [];
  for (let x = 0; x <= 24; x += 0.5) {
    const utc = (((x - dispOffsetH) % 24) + 24) % 24;
    points.push([x * 10, 95 - volumeAt(utc) * 82]);
  }
  const volPath = `M ${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}`;
  const volArea = `${volPath} L 240 100 L 0 100 Z`;
  const nowUtc = (((nowH - dispOffsetH) % 24) + 24) % 24;
  const vNow = volumeAt(nowUtc);
  const volMarkerTop = 95 - vNow * 82;
  const level =
    vNow > 0.6
      ? { word: "high", label: "High", color: "var(--success)" }
      : vNow > 0.32
        ? { word: "moderate", label: "Medium", color: "var(--warning)" }
        : { word: "low", label: "Low", color: "var(--danger)" };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Market sessions</CardTitle>
          <p className="text-xs text-muted-foreground">
            {openNames.length > 0
              ? `Open now: ${openNames.join(", ")}`
              : "All major sessions closed"}
          </p>
        </div>
        <span className="rounded-md bg-muted/60 px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {zoneLabel}
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto">
          {/* LEFT — per-city detail, one block per session at matching heights */}
          <div className="w-[196px] shrink-0">
            <div style={{ height: HEADER_H }} className="flex items-end pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Timezone · {zoneLabel}
              </span>
            </div>
            {sessions.map((s) => (
              <div key={s.name} style={{ height: ROW_H }} className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: `hsl(${s.color})`, opacity: s.isOpen ? 1 : 0.55 }}
                >
                  {s.code}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.time}</div>
                  <div className="truncate text-[10px] text-muted-foreground/80">{s.dateLine}</div>
                </div>
              </div>
            ))}
            <div style={{ height: VOL_H }} className="flex flex-col justify-center">
              <p className="text-sm font-medium leading-snug">
                Trading volume is usually {level.word} at this time of day.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-muted/60 px-3 py-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: `hsl(${level.color})` }}
                />
                <span className="text-xs font-semibold">{level.label} volume</span>
              </div>
            </div>
          </div>

          {/* RIGHT — timeline: ticks, session tracks, volume curve, now-cursor */}
          <div className="relative min-w-[520px] flex-1">
            {/* now cursor spanning tracks + volume */}
            <div
              className="pointer-events-none absolute z-20 w-px"
              style={{
                left: `${nowPct}%`,
                top: HEADER_H - 14,
                bottom: 6,
                background: "hsl(var(--primary))",
              }}
            />
            {/* now clock bubble */}
            <div
              className="pointer-events-none absolute z-30 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${nowPct}%`, top: 0 }}
            >
              <div
                className="rounded-md px-2 py-1 text-center text-white shadow-md"
                style={{ background: "hsl(var(--primary))" }}
              >
                <div className="text-xs font-bold leading-tight tabular-nums">
                  {clockLabel(nowH)}
                </div>
                <div className="text-[9px] opacity-85">{weekday}</div>
              </div>
              <div
                className="h-0 w-0"
                style={{
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "6px solid hsl(var(--primary))",
                }}
              />
            </div>

            {/* hour axis */}
            <div style={{ height: HEADER_H }} className="relative">
              <div className="absolute inset-x-0 bottom-1 h-4">
                {TICK_HOURS.map((hour) => (
                  <span
                    key={hour}
                    className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground"
                    style={{ left: `${(hour / 24) * 100}%` }}
                  >
                    {hour === 0 || hour === 24
                      ? "12a"
                      : hour === 12
                        ? "12p"
                        : `${to12h(hour)}${hour < 12 ? "a" : "p"}`}
                  </span>
                ))}
              </div>
            </div>

            {/* session tracks, with faint hourly gridlines */}
            <div
              className="relative rounded-lg"
              style={{
                background:
                  "repeating-linear-gradient(to right, hsl(var(--border) / 0.5) 0 1px, transparent 1px calc(100% / 24))",
              }}
            >
              {sessions.map((s) => (
                <div key={s.name} style={{ height: ROW_H }} className="relative">
                  <span
                    className="absolute left-0 top-2 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: `hsl(${s.color})`, opacity: s.isOpen ? 1 : 0.55 }}
                  >
                    {s.name} · {s.isOpen ? "Open" : "Closed"}
                  </span>
                  {s.segments.map((seg, j) => (
                    <div
                      key={j}
                      className="absolute rounded-md"
                      style={{
                        left: `${seg.left}%`,
                        width: `${seg.width}%`,
                        top: 26,
                        height: 30,
                        background: `hsl(${s.color})`,
                        opacity: s.isOpen ? 0.95 : 0.4,
                        boxShadow: s.isOpen ? `0 2px 8px hsl(${s.color} / 0.35)` : "none",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* volume curve */}
            <div style={{ height: VOL_H }} className="relative">
              <svg
                viewBox="0 0 240 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                <defs>
                  <linearGradient id="ms-volgrad" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="hsl(var(--danger))" />
                    <stop offset="50%" stopColor="hsl(var(--warning))" />
                    <stop offset="100%" stopColor="hsl(var(--success))" />
                  </linearGradient>
                </defs>
                <path d={volArea} fill="hsl(var(--muted-foreground) / 0.08)" />
                <path
                  d={volPath}
                  fill="none"
                  stroke="url(#ms-volgrad)"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div
                className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background"
                style={{
                  left: `${nowPct}%`,
                  top: `${volMarkerTop}%`,
                  background: `hsl(${level.color})`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
