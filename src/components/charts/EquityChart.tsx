import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/domain";
import { formatCurrency } from "@/lib/format";
import { ChartTooltip } from "./ChartTooltip";
import { useChartTokens } from "./useChartTokens";

interface EquityChartProps {
  data: EquityPoint[];
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
 * Account equity over time — a single-series area line. Per the viz method a
 * single series needs no legend (the surrounding title names it); the fill is a
 * subtle top-lit gradient, the stroke a 2px line, grid recessive and horizontal.
 */
export function EquityChart({ data, currency = "USD" }: EquityChartProps) {
  const c = useChartTokens();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.primary} stopOpacity={0.28} />
            <stop offset="100%" stopColor={c.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => format(new Date(d), "dd MMM")}
          tick={{ fill: c.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={32}
        />
        <YAxis
          tickFormatter={(v: number) => compact(v, currency)}
          tick={{ fill: c.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          domain={["auto", "auto"]}
        />
        <Tooltip
          cursor={{ stroke: c.axis, strokeDasharray: "4 4" }}
          // Recharts' Tooltip generics reject a narrowed callback signature, so
          // we type the render props loosely at this single boundary.
          content={(props: any) =>
            props.active && props.payload?.length ? (
              <ChartTooltip
                label={format(new Date(props.label as string), "dd MMM yyyy")}
                rows={[
                  {
                    label: "Balance",
                    value: formatCurrency(props.payload[0].value, currency),
                    color: c.primary,
                  },
                ]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={c.primary}
          strokeWidth={2}
          fill="url(#equityFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
