import { CalendarOff, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import {
  useCreateReadinessRule,
  useDeleteReadinessRule,
  useReadinessRuleForDate,
  useReadinessRules,
} from "@/data";
import type { ReadinessRule, ReadinessStatus } from "@/domain";
import { readinessRuleInputSchema } from "@/domain";
import { todayIso } from "./utils";

const STATUS_META: Record<
  ReadinessStatus,
  { label: string; badge: "danger" | "warning" | "success" }
> = {
  no_trade: { label: "No-Trade", badge: "danger" },
  caution: { label: "Caution", badge: "warning" },
  ok: { label: "OK to Trade", badge: "success" },
};

const BANNER_STYLES: Record<ReadinessStatus, string> = {
  no_trade: "border-danger/40 bg-danger/10 text-danger",
  caution: "border-warning/40 bg-warning/10 text-warning",
  ok: "border-success/40 bg-success/10 text-success",
};

const BANNER_HEADLINE: Record<ReadinessStatus, string> = {
  no_trade: "Do not trade today",
  caution: "Trade with caution today",
  ok: "You're clear to trade today",
};

function formatRange(rule: ReadinessRule): string {
  return rule.startDate === rule.endDate
    ? rule.startDate
    : `${rule.startDate} → ${rule.endDate}`;
}

export function ReadinessPage() {
  const today = todayIso();
  const { data: rules = [] } = useReadinessRules();
  const { data: todayRule } = useReadinessRuleForDate(today);
  const createRule = useCreateReadinessRule();
  const deleteRule = useDeleteReadinessRule();

  const [status, setStatus] = useState<ReadinessStatus>("no_trade");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const parsed = readinessRuleInputSchema.safeParse({
      startDate: today,
      endDate: today,
      status,
      reason,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review the window.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createRule.mutateAsync(parsed.data);
      setReason("");
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...rules].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div>
      <PageHeader
        title="Readiness"
        description="Declare the windows you shouldn't trade — and the ones where you're at your best."
      />

      <div className="space-y-6">
        {(() => {
          const status = todayRule?.status ?? "ok";
          return (
            <div className={`rounded-xl border-2 px-6 py-5 ${BANNER_STYLES[status]}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold tracking-tight">
                    {BANNER_HEADLINE[status]}
                  </p>
                  {todayRule?.reason && (
                    <p className="mt-1 text-sm opacity-90">{todayRule.reason}</p>
                  )}
                  {!todayRule && (
                    <p className="mt-1 text-sm opacity-90">
                      No window declared for today — defaulting to OK to trade.
                    </p>
                  )}
                </div>
                <Badge variant={STATUS_META[status].badge}>{STATUS_META[status].label}</Badge>
              </div>
            </div>
          );
        })()}

        <Card>
          <CardHeader>
            <CardTitle>Log today's status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ReadinessStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_trade">No-Trade</SelectItem>
                  <SelectItem value="caution">Caution</SelectItem>
                  <SelectItem value="ok">OK to Trade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                placeholder="e.g. Luteal phase — low patience, prone to revenge trading"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save for today"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Windows</CardTitle>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="No windows logged yet"
                description="Add your first no-trade or ok-to-trade window above."
              />
            ) : (
              <div className="space-y-2">
                {sorted.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface/40 px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_META[rule.status].badge}>
                          {STATUS_META[rule.status].label}
                        </Badge>
                        <span className="text-sm font-medium">{formatRange(rule)}</span>
                      </div>
                      {rule.reason && (
                        <p className="text-sm text-muted-foreground">{rule.reason}</p>
                      )}
                    </div>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Delete this window?"
                      description="This can't be undone."
                      onConfirm={() => deleteRule.mutateAsync(rule.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
