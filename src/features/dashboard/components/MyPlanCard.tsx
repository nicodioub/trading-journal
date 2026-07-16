import { Pencil, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
} from "@/components/ui";
import { useSettings, useUpdateSettings } from "@/data";

/** One standing trading plan, persisted until the user explicitly edits it. */
export function MyPlanCard() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const savedPlan = settings?.tradingPlan ?? "";

  useEffect(() => {
    setDraft(savedPlan);
  }, [savedPlan]);

  const handleSave = async () => {
    await update.mutateAsync({ tradingPlan: draft.trim() });
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(savedPlan);
    setEditing(false);
  };

  const showEditor = editing || !savedPlan;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>My plan</CardTitle>
          <CardDescription>
            Your standing plan. It stays here and informs every First Thought analysis.
          </CardDescription>
        </div>
        {!showEditor && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showEditor ? (
          <div className="space-y-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write the trading plan you want to follow every session…"
              className="min-h-[120px]"
            />
            {update.isError && (
              <p className="text-sm text-danger">Could not save your plan.</p>
            )}
            <div className="flex justify-end gap-2">
              {savedPlan && (
                <Button variant="ghost" onClick={handleCancel} disabled={update.isPending}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => void handleSave()}
                disabled={update.isPending || (!savedPlan && !draft.trim())}
              >
                <Save className="h-4 w-4" />
                {update.isPending ? "Saving…" : "Save plan"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {savedPlan}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
