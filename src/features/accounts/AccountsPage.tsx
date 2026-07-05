import { Plus, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  type BadgeProps,
} from "@/components/ui";
import { useAccounts, useTrades } from "@/data";
import {
  computePerformanceStats,
  type Account,
  type AccountStatus,
} from "@/domain";
import { formatCurrency, formatPercent, formatSignedPercent } from "@/lib/format";
import { AccountFormDialog } from "./components/AccountFormDialog";

const STATUS_VARIANT: Record<AccountStatus, BadgeProps["variant"]> = {
  active: "primary",
  passed: "success",
  failed: "danger",
  archived: "default",
};

function AccountCard({ account }: { account: Account }) {
  const { data: trades = [] } = useTrades({ accountId: account.id });
  const perf = computePerformanceStats(trades);
  const balance = account.initialCapital + perf.totalPnl;
  const returnPct =
    account.initialCapital > 0 ? (perf.totalPnl / account.initialCapital) * 100 : 0;

  return (
    <Link to={`/accounts/${account.id}`}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">{account.name}</div>
              <div className="text-xs text-muted-foreground">
                {[account.broker, account.platform].filter(Boolean).join(" · ") ||
                  "—"}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[account.status]}>{account.status}</Badge>
          </div>

          <div>
            <div className="text-2xl font-semibold tabular-nums">
              {formatCurrency(balance, account.currency)}
            </div>
            <div
              className={
                "text-sm tabular-nums " +
                (perf.totalPnl >= 0 ? "text-success" : "text-danger")
              }
            >
              {formatCurrency(perf.totalPnl, account.currency, { signed: true })} (
              {formatSignedPercent(returnPct)})
            </div>
          </div>

          <div className="flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{perf.closedTrades} trades</span>
            <span>{formatPercent(perf.winRate, 0)} win</span>
            <span>
              {perf.averageRR !== null ? `${perf.averageRR.toFixed(2)}R avg` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts();

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="All your trading accounts and their live performance."
        actions={
          <AccountFormDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                New account
              </Button>
            }
          />
        }
      />

      {!isLoading && accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Create your first account to begin tracking trades and statistics."
          action={
            <AccountFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  New account
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
