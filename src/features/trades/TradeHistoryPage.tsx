import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useAccounts, useTrades, type TradeFilters } from "@/data";
import type { Direction } from "@/domain";
import { formatCurrency, formatDate, formatRR } from "@/lib/format";
import { DirectionTag, OutcomeBadge } from "./components/TradeBits";

const ALL = "all";

export function TradeHistoryPage() {
  const { data: accounts = [] } = useAccounts();
  const [accountId, setAccountId] = useState<string>(ALL);
  const [direction, setDirection] = useState<string>(ALL);
  const [outcome, setOutcome] = useState<string>(ALL);
  const [search, setSearch] = useState("");

  const filters: TradeFilters = useMemo(
    () => ({
      accountId: accountId === ALL ? undefined : accountId,
      direction: direction === ALL ? undefined : (direction as Direction),
      outcome: outcome === ALL ? undefined : (outcome as "win" | "loss"),
    }),
    [accountId, direction, outcome],
  );

  const { data: trades = [], isLoading } = useTrades(filters);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trades;
    return trades.filter(
      (t) =>
        t.pair.toLowerCase().includes(q) ||
        t.strategy.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [trades, search]);

  const currencyOf = (id: string) =>
    accounts.find((a) => a.id === id)?.currency ?? "USD";
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Trade history"
        description="Every trade you've logged, filterable and searchable."
        actions={
          <Button asChild>
            <Link to="/trades/new">
              <Plus className="h-4 w-4" />
              New trade
            </Link>
          </Button>
        }
      />

      {/* Filter bar — one row above the data. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pair, strategy, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-8"
          />
        </div>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All directions</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All outcomes</SelectItem>
            <SelectItem value="win">Winners</SelectItem>
            <SelectItem value="loss">Losers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          title="No trades found"
          description="Adjust your filters or log a new trade."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Pair</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Strategy</th>
                  <th className="px-4 py-3 text-right font-medium">RR</th>
                  <th className="px-4 py-3 text-right font-medium">Result</th>
                  <th className="px-4 py-3 text-right font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      <Link to={`/trades/${trade.id}`} className="block">
                        {formatDate(trade.date)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/trades/${trade.id}`}
                        className="flex items-center gap-2 font-medium"
                      >
                        {trade.pair}
                        <DirectionTag direction={trade.direction} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {nameOf(trade.accountId)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {trade.strategy || "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatRR(trade.rrAchieved)}
                    </td>
                    <td
                      className={
                        "px-4 py-3 text-right font-semibold tabular-nums " +
                        ((trade.resultAmount ?? 0) >= 0 ? "text-success" : "text-danger")
                      }
                    >
                      {formatCurrency(trade.resultAmount ?? 0, currencyOf(trade.accountId), {
                        signed: true,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <OutcomeBadge trade={trade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
