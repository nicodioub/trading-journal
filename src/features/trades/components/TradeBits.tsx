import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { getOutcome, type Direction, type Trade } from "@/domain";

/** Win / Loss / BE / Open pill derived from a trade's result. */
export function OutcomeBadge({ trade }: { trade: Trade }) {
  const outcome = getOutcome(trade);
  if (outcome === "open") return <Badge variant="primary">Open</Badge>;
  if (outcome === "win") return <Badge variant="success">Win</Badge>;
  if (outcome === "loss") return <Badge variant="danger">Loss</Badge>;
  return <Badge>Breakeven</Badge>;
}

/** Long / Short indicator with a directional arrow. */
export function DirectionTag({ direction }: { direction: Direction }) {
  return direction === "long" ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
      <ArrowUpRight className="h-3.5 w-3.5" />
      Long
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
      <ArrowDownRight className="h-3.5 w-3.5" />
      Short
    </span>
  );
}
