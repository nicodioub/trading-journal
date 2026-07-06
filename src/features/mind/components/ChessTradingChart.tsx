import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip, useChartTokens } from "@/components/charts";
import type { DailyChessPoint } from "@/domain";
import { formatPercent } from "@/lib/format";

/**
 * Chess win-rate vs trading win-rate, day by day. Both are percentages on one
 * shared 0–100 axis (never a dual axis). Two categorical series — a blue/amber
 * pair chosen for colorblind separation — each named in the legend.
 */
export function ChessTradingChart({ data }: { data: DailyChessPoint[] }) {
  const c = useChartTokens();
  const series = [
    { key: "chessWinRate", label: "Chess", color: c.primary },
    { key: "tradingWinRate", label: "Trading", color: c.warning },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} win rate
          </span>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => format(new Date(d), "dd MMM")}
              tick={{ fill: c.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: c.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: c.axis, strokeDasharray: "4 4" }}
              content={(props: any) =>
                props.active && props.payload?.length ? (
                  <ChartTooltip
                    label={format(new Date(props.label), "dd MMM yyyy")}
                    rows={[
                      { label: "Chess", value: formatPercent(props.payload[0]?.value ?? 0, 0), color: c.primary },
                      { label: "Trading", value: formatPercent(props.payload[1]?.value ?? 0, 0), color: c.warning },
                    ]}
                  />
                ) : null
              }
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
