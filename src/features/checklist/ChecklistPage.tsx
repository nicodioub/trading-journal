import { ListChecks, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Input,
} from "@/components/ui";
import {
  useChecklistItems,
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useResetChecklist,
  useUpdateChecklistItem,
} from "@/data";
import type { ChecklistItem } from "@/domain";
import { cn } from "@/lib/utils";

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const [label, setLabel] = useState(item.label);

  // Commit the edited label on blur; an emptied field reverts instead of saving.
  const commitLabel = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setLabel(item.label);
      return;
    }
    if (trimmed !== item.label) {
      updateItem.mutate({ id: item.id, patch: { label: trimmed } });
    }
    setLabel(trimmed);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/40 px-4 py-2.5">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) =>
          updateItem.mutate({ id: item.id, patch: { checked: e.target.checked } })
        }
        className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
        aria-label={`Mark "${item.label}" as done`}
      />
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setLabel(item.label);
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "h-8 flex-1 border-transparent bg-transparent shadow-none hover:border-input",
          item.checked && "text-muted-foreground line-through",
        )}
      />
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
        title="Delete this item?"
        description="This can't be undone."
        onConfirm={() => deleteItem.mutateAsync(item.id)}
      />
    </div>
  );
}

export function ChecklistPage() {
  const { data: items = [] } = useChecklistItems();
  const createItem = useCreateChecklistItem();
  const resetChecklist = useResetChecklist();
  const [label, setLabel] = useState("");

  const doneCount = items.filter((i) => i.checked).length;
  const allDone = items.length > 0 && doneCount === items.length;

  const handleAdd = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    await createItem.mutateAsync({ label: trimmed, checked: false });
    setLabel("");
  };

  return (
    <div>
      <PageHeader
        title="Pre-Trade Checklist"
        description="What you do before entering the market. Checks stay until you reset them."
        actions={
          <Button
            variant="outline"
            onClick={() => resetChecklist.mutate()}
            disabled={doneCount === 0 || resetChecklist.isPending}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        }
      />

      <div className="space-y-6">
        {items.length > 0 && (
          <div
            className={cn(
              "rounded-xl border px-5 py-3 text-sm font-medium",
              allDone
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-surface/40 text-muted-foreground",
            )}
          >
            {allDone
              ? "All set — you're clear to enter."
              : `${doneCount} of ${items.length} done`}
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No checklist items yet"
            description="Add the steps you want to complete before every entry."
          />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ChecklistRow key={item.id} item={item} />
            ))}
          </div>
        )}

        <Card>
          <CardContent className="flex gap-2 pt-6">
            <Input
              placeholder="e.g. Check the economic calendar"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAdd();
              }}
            />
            <Button onClick={handleAdd} disabled={createItem.isPending || !label.trim()}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
