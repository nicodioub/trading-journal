import { History } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { useAccounts, useTrades } from "@/data";
import { formatCurrency, formatDate } from "@/lib/format";
import { DirectionTag, OutcomeBadge } from "@/features/trades/components/TradeBits";

export function RecentTradesWidget() {
  const { data: trades = [] } = useTrades();
  const { data: accounts = [] } = useAccounts();
  const currencyOf = (accountId: string) =>
    accounts.find((a) => a.id === accountId)?.currency ?? "USD";

  const recent = trades.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent trades</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState
            icon={History}
            title="No trades logged"
            description="Your most recent trades will appear here."
          />
        ) : (
          <div className="divide-y divide-border">
            {recent.map((trade) => (
              <Link
                key={trade.id}
                to={`/trades/${trade.id}`}
                className="flex items-center justify-between py-3 transition-colors hover:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {trade.pair}
                      <DirectionTag direction={trade.direction} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(trade.date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "text-sm font-semibold tabular-nums " +
                      ((trade.resultAmount ?? 0) >= 0
                        ? "text-success"
                        : "text-danger")
                    }
                  >
                    {formatCurrency(trade.resultAmount ?? 0, currencyOf(trade.accountId), {
                      signed: true,
                    })}
                  </span>
                  <OutcomeBadge trade={trade} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
