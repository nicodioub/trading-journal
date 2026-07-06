import { Target } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatTile,
} from "@/components/ui";
import { useAccounts } from "@/data";
import { buildWeeklyPlan } from "@/domain";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export function PlanningPage() {
  const { data: accounts = [] } = useAccounts();
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [weeklyGrowthPercent, setWeeklyGrowthPercent] = useState(2);
  const [weeks, setWeeks] = useState(12);

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];

  const plan = useMemo(() => {
    if (!account) return [];
    return buildWeeklyPlan(account.currentBalance, weeklyGrowthPercent, weeks);
  }, [account, weeklyGrowthPercent, weeks]);

  const finalWeek = plan.at(-1);

  return (
    <div>
      <PageHeader
        title="Planning"
        description="Set a weekly growth objective and project where an account lands over time."
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No accounts yet"
          description="Add an account before building a growth plan."
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Account</Label>
                <Select
                  value={account?.id}
                  onValueChange={(value) => setAccountId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Weekly objective (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={weeklyGrowthPercent}
                  onChange={(e) => setWeeklyGrowthPercent(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Number of weeks</Label>
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={weeks}
                  onChange={(e) =>
                    setWeeks(Math.max(1, Math.round(Number(e.target.value))))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {account && finalWeek && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile
                label="Starting balance"
                value={formatCurrency(account.currentBalance, account.currency)}
              />
              <StatTile
                label={`Projected balance (week ${weeks})`}
                value={formatCurrency(finalWeek.balance, account.currency)}
                intent="positive"
              />
              <StatTile
                label="Total projected growth"
                value={formatPercent(finalWeek.cumulativePercent)}
                intent="positive"
              />
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Week</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Target balance</th>
                      <th className="py-2 pr-4 font-medium">Gain this week</th>
                      <th className="py-2 pr-4 font-medium">Cumulative growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.map((row) => (
                      <tr key={row.week} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 tabular-nums">{row.week}</td>
                        <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-2 pr-4 tabular-nums font-medium">
                          {formatCurrency(row.balance, account?.currency)}
                        </td>
                        <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                          {row.week === 0 ? (
                            "—"
                          ) : (
                            <>
                              {formatCurrency(row.weekGainAmount, account?.currency, {
                                signed: true,
                              })}{" "}
                              ({formatPercent(row.weekGainPercent)})
                            </>
                          )}
                        </td>
                        <td className="py-2 pr-4 tabular-nums text-success">
                          {row.week === 0 ? "—" : formatPercent(row.cumulativePercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
