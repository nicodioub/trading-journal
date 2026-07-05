import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  /** Optional sub-line (e.g. context or a delta). */
  hint?: string;
  icon?: LucideIcon;
  /** Colors the value for signed metrics; identity stays text-token elsewhere. */
  intent?: "neutral" | "positive" | "negative";
  className?: string;
}

/**
 * A "hero number" tile — the right form when the data's job is a single headline
 * figure rather than a plotted series. Values use tabular figures so columns of
 * tiles align.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  intent = "neutral",
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border surface-gradient p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight",
          intent === "positive" && "text-success",
          intent === "negative" && "text-danger",
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
