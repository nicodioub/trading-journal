import { Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { useAccounts, useTrades } from "@/data";
import { computePerformanceStats } from "@/domain";
import { formatCurrency, formatSignedPercent } from "@/lib/format";

export function AccountBalancesWidget() {
  const { data: accounts = [] } = useAccounts();
  const { data: trades = [] } = useTrades();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account balances</CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            description="Create your first trading account to start tracking."
          />
        ) : (
          <div className="divide-y divide-border">
            {accounts.map((account) => {
              const accountTrades = trades.filter((t) => t.accountId === account.id);
              const { totalPnl } = computePerformanceStats(accountTrades);
              const balance = account.initialCapital + totalPnl;
              const returnPct =
                account.initialCapital > 0
                  ? (totalPnl / account.initialCapital) * 100
                  : 0;
              return (
                <Link
                  key={account.id}
                  to={`/accounts/${account.id}`}
                  className="flex items-center justify-between py-3 transition-colors hover:opacity-80"
                >
                  <div>
                    <div className="text-sm font-medium">{account.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {account.broker || account.type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatCurrency(balance, account.currency)}
                    </div>
                    <div
                      className={
                        "text-xs tabular-nums " +
                        (totalPnl >= 0 ? "text-success" : "text-danger")
                      }
                    >
                      {formatSignedPercent(returnPct)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
