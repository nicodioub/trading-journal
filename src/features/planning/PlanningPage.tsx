import { Lock, Target, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
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
import {
  useAccounts,
  useDeletePlanningObjective,
  usePlanningObjective,
  useSavePlanningObjective,
  useTrades,
} from "@/data";
import {
  buildEquityCurve,
  buildWeeklyPlan,
  computeAccountSummary,
  computePlanProgress,
} from "@/domain";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export function PlanningPage() {
  const { data: accounts = [] } = useAccounts();
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [weeklyGrowthPercent, setWeeklyGrowthPercent] = useState(2);
  const [weeks, setWeeks] = useState(12);

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const { data: trades = [] } = useTrades({ accountId: account?.id });
  const { data: objective } = usePlanningObjective(account?.id);
  const saveObjective = useSavePlanningObjective();
  const deleteObjective = useDeletePlanningObjective();

  const currentBalance = useMemo(() => {
    if (!account) return 0;
    return account.initialCapital + computeAccountSummary(account, trades).totalPnl;
  }, [account, trades]);

  // The saved objective, if any, drives the plan; otherwise use the draft form.
  const draftMode = !objective;

  const plan = useMemo(() => {
    if (!account) return [];
    if (objective) {
      return buildWeeklyPlan(
        objective.startBalance,
        objective.weeklyGrowthPercent,
        objective.weeks,
        new Date(objective.startDate),
      );
    }
    return buildWeeklyPlan(currentBalance, weeklyGrowthPercent, weeks);
  }, [account, objective, currentBalance, weeklyGrowthPercent, weeks]);

  const equityCurve = useMemo(() => {
    if (!account) return [];
    return buildEquityCurve(account.initialCapital, trades);
  }, [account, trades]);

  const progress = useMemo(
    () => computePlanProgress(plan, equityCurve),
    [plan, equityCurve],
  );

  const finalWeek = plan.at(-1);

  // Reset the draft inputs whenever the account or its objective changes, so
  // stale numbers from a previous account don't linger in the form.
  useEffect(() => {
    if (objective) {
      setWeeklyGrowthPercent(objective.weeklyGrowthPercent);
      setWeeks(objective.weeks);
    }
  }, [objective]);

  return (
    <div>
      <PageHeader
        title="Planning"
        description="Set a weekly growth objective and track real progress against it over time."
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
                  disabled={!draftMode}
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
                  disabled={!draftMode}
                  onChange={(e) =>
                    setWeeks(Math.max(1, Math.round(Number(e.target.value))))
                  }
                />
              </div>
            </CardContent>

            {account && (
              <CardContent className="flex items-center justify-between gap-3 pt-0">
                {objective ? (
                  <>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      Objective saved on {formatDate(objective.createdAt)}. Delete it to
                      set a new one.
                    </p>
                    <ConfirmDialog
                      title="Delete this objective?"
                      description="This removes the saved plan for this account. You can set a new one right after."
                      onConfirm={() => deleteObjective.mutate(account.id)}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-danger" />
                          Delete objective
                        </Button>
                      }
                    />
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() =>
                      saveObjective.mutate({
                        accountId: account.id,
                        startBalance: currentBalance,
                        weeklyGrowthPercent,
                        weeks,
                        startDate: new Date().toISOString(),
                      })
                    }
                  >
                    <Target className="h-4 w-4" />
                    Save as objective
                  </Button>
                )}
              </CardContent>
            )}
          </Card>

          {account && finalWeek && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile
                label="Current balance"
                value={formatCurrency(currentBalance, account.currency)}
              />
              <StatTile
                label={`Target balance (week ${plan.length - 1})`}
                value={formatCurrency(finalWeek.balance, account.currency)}
                intent="positive"
              />
              <StatTile
                label="Total target growth"
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
                      {objective && (
                        <th className="py-2 pr-4 font-medium">Actual vs. target</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((row) => (
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
                        {objective && (
                          <td className="py-2 pr-4 tabular-nums">
                            {row.actualBalance === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={
                                  (row.aheadPercent ?? 0) >= 0 ? "text-success" : "text-danger"
                                }
                              >
                                {formatCurrency(row.actualBalance, account?.currency)} (
                                {formatPercent(row.aheadPercent ?? 0)})
                              </span>
                            )}
                          </td>
                        )}
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
