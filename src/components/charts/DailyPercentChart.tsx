import { eachDayOfInterval, endOfYear, format, startOfYear } from "date-fns";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
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
  let cumulativePercent = 0;
  const timeline = eachDayOfInterval({
    start: startOfYear(yearDate),
    end: endOfYear(yearDate),
  }).map((date) => {
    const key = format(date, "yyyy-MM-dd");
    const point =
      pointsByDay.get(key) ?? {
        key,
        label: format(date, "dd MMM"),
        percent: 0,
        trades: 0,
        accounts: 0,
      };
    cumulativePercent += point.percent;
    return { ...point, cumulativePercent };
  });
  const monthTicks = Array.from({ length: 12 }, (_, month) =>
    format(new Date(year, month, 1), "yyyy-MM-dd"),
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={timeline}
        margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
      >
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
          yAxisId="daily"
          tickFormatter={axisPercent}
          tick={{ fill: c.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <YAxis
          yAxisId="cumulative"
          orientation="right"
          tickFormatter={axisPercent}
          tick={{ fill: c.primary, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <ReferenceLine
          yAxisId="daily"
          y={0}
          stroke={c.axis}
          strokeOpacity={0.5}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconSize={9}
          wrapperStyle={{ color: c.axis, fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: c.muted, fillOpacity: 0.08 }}
          content={(props: any) => {
            if (!props.active || !props.payload?.length) return null;
            const point = props.payload[0].payload as DailyPercentPoint;
            const runningTotal = Number(
              props.payload[0].payload.cumulativePercent ?? 0,
            );
            return (
              <ChartTooltip
                label={point.label}
                rows={[
                  {
                    label: "Net return",
                    value: formatSignedPercent(point.percent),
                    color: point.percent >= 0 ? c.success : c.danger,
                  },
                  {
                    label: "Cumulative",
                    value: formatSignedPercent(runningTotal),
                    color: c.primary,
                  },
                  { label: "Trades", value: String(point.trades) },
                  { label: "Accounts", value: String(point.accounts) },
                ]}
              />
            );
          }}
        />
        <Bar
          yAxisId="daily"
          dataKey="percent"
          name="Daily return"
          fill={c.success}
          radius={[3, 3, 0, 0]}
          maxBarSize={18}
        >
          {timeline.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.percent >= 0 ? c.success : c.danger}
            />
          ))}
        </Bar>
        <Line
          yAxisId="cumulative"
          type="monotone"
          dataKey="cumulativePercent"
          name="Cumulative return"
          stroke={c.primary}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: c.primary, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
