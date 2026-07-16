import { ScrollText, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Textarea,
} from "@/components/ui";
import { useCreateTradingRule, useDeleteTradingRule, useTradingRules } from "@/data";

export function RulesPage() {
  const { data: rules = [] } = useTradingRules();
  const createRule = useCreateTradingRule();
  const deleteRule = useDeleteTradingRule();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createRule.mutateAsync({ content: trimmed });
      setContent("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Rules"
        description="Your standing trading rules — the checklist you don't get to negotiate with mid-trade."
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Textarea
              placeholder="e.g. Never risk more than 1% on a single trade"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
              className="min-h-[72px]"
            />
            <div className="flex justify-end">
              <Button onClick={handleAdd} disabled={saving || !content.trim()}>
                Add rule
              </Button>
            </div>
          </CardContent>
        </Card>

        {rules.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No rules yet"
            description="Write down the rules you want to hold yourself to before you trade."
          />
        ) : (
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3"
              >
                <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <p className="flex-1 text-sm font-medium text-danger">
                  {rule.content}
                </p>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Delete this rule?"
                  description="This can't be undone."
                  onConfirm={() => deleteRule.mutateAsync(rule.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
