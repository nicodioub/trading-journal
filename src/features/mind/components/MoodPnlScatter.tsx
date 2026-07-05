import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip, useChartTokens } from "@/components/charts";
import type { DailyPsychologyPoint } from "@/domain";
import { formatCurrency } from "@/lib/format";

interface MoodPnlScatterProps {
  data: DailyPsychologyPoint[];
  currency?: string;
}

/** Each dot is one day: mood (x) against that day's realized PnL (y). */
export function MoodPnlScatter({ data, currency = "USD" }: MoodPnlScatterProps) {
  const c = useChartTokens();

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={c.grid} />
          <XAxis
            type="number"
            dataKey="mood"
            name="Mood"
            domain={[1, 10]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            tick={{ fill: c.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="pnl"
            name="PnL"
            tick={{ fill: c.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                style: "currency",
                currency,
                maximumFractionDigits: 1,
              }).format(v)
            }
          />
          <ReferenceLine y={0} stroke={c.axis} strokeOpacity={0.5} />
          <Tooltip
            cursor={{ stroke: c.axis, strokeDasharray: "4 4" }}
            content={(props: any) => {
              const p: DailyPsychologyPoint | undefined = props.payload?.[0]?.payload;
              if (!props.active || !p) return null;
              return (
                <ChartTooltip
                  label={p.date}
                  rows={[
                    { label: "Mood", value: `${p.mood}/10` },
                    {
                      label: "Day PnL",
                      value: formatCurrency(p.pnl, currency, { signed: true }),
                      color: p.pnl >= 0 ? c.success : c.danger,
                    },
                  ]}
                />
              );
            }}
          />
          <Scatter data={data} fill={c.primary}>
            {data.map((p) => (
              <Cell key={p.date} fill={p.pnl >= 0 ? c.success : c.danger} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
