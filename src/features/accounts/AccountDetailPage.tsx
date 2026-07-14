import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EquityChart } from "@/components/charts";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  StatTile,
} from "@/components/ui";
import { useAccount, useDeleteAccount, useTrades } from "@/data";
import { computeAccountSummary, computeWeeklyAccountStat } from "@/domain";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatRR,
  formatSignedPercent,
} from "@/lib/format";
import { DirectionTag, OutcomeBadge } from "@/features/trades/components/TradeBits";
import { AccountFormDialog } from "./components/AccountFormDialog";

export function AccountDetailPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { data: account, isLoading } = useAccount(accountId);
  const { data: trades = [] } = useTrades({ accountId });
  const deleteAccount = useDeleteAccount();

  const summary = useMemo(
    () => (account ? computeAccountSummary(account, trades) : null),
    [account, trades],
  );
  const weekly = useMemo(
    () => (account ? computeWeeklyAccountStat(account, trades) : null),
    [account, trades],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!account || !summary) {
    return (
      <EmptyState
        title="Account not found"
        description="This account may have been deleted."
        action={
          <Button asChild variant="secondary">
            <Link to="/accounts">Back to accounts</Link>
          </Button>
        }
      />
    );
  }

  const perf = summary.performance;
  const currency = account.currency;
  const balance = account.initialCapital + summary.totalPnl;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{account.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[account.broker, account.platform].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AccountFormDialog
            account={account}
            trigger={
              <Button variant="secondary" size="sm">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            }
          />
          <ConfirmDialog
            title="Delete account?"
            description="This permanently deletes the account and all of its trades."
            onConfirm={async () => {
              await deleteAccount.mutateAsync(account.id);
              navigate("/accounts");
            }}
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Balance" value={formatCurrency(balance, currency)} />
        {weekly && (
          <StatTile
            label="This week"
            value={formatSignedPercent(weekly.returnPct)}
            hint={`${formatCurrency(weekly.pnl, currency, { signed: true })} · ${formatDate(weekly.weekStart)}–${formatDate(weekly.weekEnd)}`}
            intent={weekly.pnl >= 0 ? "positive" : "negative"}
          />
        )}
        <StatTile
          label="Total PnL"
          value={formatCurrency(summary.totalPnl, currency, { signed: true })}
          hint={formatSignedPercent(summary.totalReturnPct)}
          intent={summary.totalPnl >= 0 ? "positive" : "negative"}
        />
        <StatTile label="Win rate" value={formatPercent(perf.winRate, 0)} hint={`${perf.wins}W · ${perf.losses}L`} />
        <StatTile label="Avg RR" value={formatRR(perf.averageRR)} />
        <StatTile label="Trades" value={String(perf.closedTrades)} />
        <StatTile label="Best trade" value={perf.bestTrade !== null ? formatCurrency(perf.bestTrade, currency, { signed: true }) : "—"} intent="positive" />
        <StatTile label="Worst trade" value={perf.worstTrade !== null ? formatCurrency(perf.worstTrade, currency, { signed: true }) : "—"} intent="negative" />
        <StatTile label="Current drawdown" value={formatPercent(summary.currentDrawdownPct, 1)} intent={summary.currentDrawdownPct > 0 ? "negative" : "neutral"} />
      </div>

      {account.targetProfit > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Target profit</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const progressPct = Math.max(0, (summary.totalPnl / account.targetProfit) * 100);
              const reached = summary.totalPnl >= account.targetProfit;
              return (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-semibold tabular-nums">
                      {formatCurrency(summary.totalPnl, currency, { signed: true })}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      of {formatCurrency(account.targetProfit, currency)} target
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${reached ? "bg-success" : "bg-primary"}`}
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reached
                      ? "Target reached 🎯"
                      : `${formatPercent(progressPct, 0)} of the way there`}
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account evolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {summary.equityCurve.length > 1 ? (
              <EquityChart data={summary.equityCurve} currency={currency} />
            ) : (
              <EmptyState title="Not enough data" description="Log a few trades to see your equity curve." />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <EmptyState title="No trades yet" description="This account has no trades logged." />
          ) : (
            <div className="divide-y divide-border">
              {trades.slice(0, 12).map((trade) => (
                <Link
                  key={trade.id}
                  to={`/trades/${trade.id}`}
                  className="flex items-center justify-between py-3 hover:opacity-80"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {trade.pair}
                    <DirectionTag direction={trade.direction} />
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatDate(trade.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "text-sm font-semibold tabular-nums " +
                        ((trade.resultAmount ?? 0) >= 0 ? "text-success" : "text-danger")
                      }
                    >
                      {formatCurrency(trade.resultAmount ?? 0, currency, { signed: true })}
                    </span>
                    <OutcomeBadge trade={trade} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
