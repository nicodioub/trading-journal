import type { ReactNode } from "react";

interface ChartTooltipProps {
  label?: ReactNode;
  rows: { label: string; value: string; color?: string }[];
}

/** Shared tooltip surface for all charts — consistent, legible on dark. */
export function ChartTooltip({ label, rows }: ChartTooltipProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 shadow-lg">
      {label != null && (
        <div className="mb-1 text-xs font-medium text-muted-foreground">
          {label}
        </div>
      )}
      <div className="space-y-0.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {row.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
