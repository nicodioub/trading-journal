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
import type { PeriodPnl } from "@/domain";
import { formatCurrency } from "@/lib/format";
import { ChartTooltip } from "./ChartTooltip";
import { useChartTokens } from "./useChartTokens";

interface PnlBarChartProps {
  data: PeriodPnl[];
  currency?: string;
}

function compact(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    style: "currency",
    currency,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * PnL per period. Color encodes polarity (profit vs loss) — a status use of
 * green/red, not a categorical series — with a zero reference line and rounded
 * bar ends.
 */
export function PnlBarChart({ data, currency = "USD" }: PnlBarChartProps) {
  const c = useChartTokens();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: c.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={12}
        />
        <YAxis
          tickFormatter={(v: number) => compact(v, currency)}
          tick={{ fill: c.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <ReferenceLine y={0} stroke={c.axis} strokeOpacity={0.5} />
        <Tooltip
          cursor={{ fill: c.muted, fillOpacity: 0.08 }}
          // Loosely typed at this single boundary (see EquityChart note).
          content={(props: any) => {
            if (!props.active || !props.payload?.length) return null;
            const point = props.payload[0];
            return (
              <ChartTooltip
                label={point.payload.label}
                rows={[
                  {
                    label: "PnL",
                    value: formatCurrency(point.value, currency, { signed: true }),
                    color: point.value >= 0 ? c.success : c.danger,
                  },
                  { label: "Trades", value: String(point.payload.trades) },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.pnl >= 0 ? c.success : c.danger}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
