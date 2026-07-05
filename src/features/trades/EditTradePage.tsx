import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import { Button, EmptyState } from "@/components/ui";
import { useTrade } from "@/data";
import { TradeForm } from "./components/TradeForm";

export function EditTradePage() {
  const { tradeId } = useParams();
  const { data: trade, isLoading } = useTrade(tradeId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!trade) {
    return (
      <EmptyState
        title="Trade not found"
        description="This trade may have been deleted."
        action={
          <Button asChild variant="secondary">
            <Link to="/trades">Back to history</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${trade.pair}`}
        description="Update the trade details, screenshots and notes."
      />
      <TradeForm trade={trade} />
    </div>
  );
}
