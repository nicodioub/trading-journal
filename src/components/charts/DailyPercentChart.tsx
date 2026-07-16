import { eachDayOfInterval, endOfYear, format, startOfYear } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPercentPoint } from "@/domain";
import { formatSignedPercent } from "@/lib/format";
import { ChartTooltip } from "./ChartTooltip";
import { useChartTokens } from "./useChartTokens";

interface DailyPercentChartProps {
  data: DailyPercentPoint[];
  year: number;
}

function axisPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${Number(value.toFixed(2))}%`;
}

/** Daily net return across all accounts for one calendar year. */
export function DailyPercentChart({ data, year }: DailyPercentChartProps) {
  const c = useChartTokens();
  const yearDate = new Date(year, 0, 1);
  const pointsByDay = new Map(data.map((point) => [point.key, point]));
  const timeline = eachDayOfInterval({
    start: startOfYear(yearDate),
    end: endOfYear(yearDate),
  }).map((date) => {
    const key = format(date, "yyyy-MM-dd");
    return (
      pointsByDay.get(key) ?? {
        key,
        label: format(date, "dd MMM"),
        percent: 0,
        trades: 0,
        accounts: 0,
      }
    );
  });
  const monthTicks = Array.from({ length: 12 }, (_, month) =>
    format(new Date(year, month, 1), "yyyy-MM-dd"),
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis
          dataKey="key"
          ticks={monthTicks}
          tickFormatter={(key: string) =>
            format(new Date(`${key}T00:00:00`), "MMM")
          }
          tick={{ fill: c.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={axisPercent}
          tick={{ fill: c.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <ReferenceLine y={0} stroke={c.axis} strokeOpacity={0.5} />
        <Tooltip
          cursor={{ fill: c.muted, fillOpacity: 0.08 }}
          content={(props: any) => {
            if (!props.active || !props.payload?.length) return null;
            const point = props.payload[0].payload as DailyPercentPoint;
            return (
              <ChartTooltip
                label={point.label}
                rows={[
                  {
                    label: "Net return",
                    value: formatSignedPercent(point.percent),
                    color: point.percent >= 0 ? c.success : c.danger,
                  },
                  { label: "Trades", value: String(point.trades) },
                  { label: "Accounts", value: String(point.accounts) },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="percent" radius={[3, 3, 0, 0]} maxBarSize={18}>
          {timeline.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.percent >= 0 ? c.success : c.danger}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
