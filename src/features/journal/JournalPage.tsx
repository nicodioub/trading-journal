import { format } from "date-fns";
import { NotebookPen, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Input,
  Textarea,
} from "@/components/ui";
import {
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useJournalEntries,
} from "@/data";

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function JournalPage() {
  const { data: entries = [] } = useJournalEntries();
  const createEntry = useCreateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const [date, setDate] = useState(todayIso());
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createEntry.mutateAsync({ date, content: trimmed });
      setContent("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Journal"
        description="Free-form space to write — separate from your per-trade notes."
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="w-40">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[140px]"
            />
            <div className="flex justify-end">
              <Button onClick={handleAdd} disabled={saving || !content.trim()}>
                Save entry
              </Button>
            </div>
          </CardContent>
        </Card>

        {entries.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No journal entries yet"
            description="Write your first entry above."
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {format(new Date(entry.date), "dd MMM yyyy")}
                    </span>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Delete this entry?"
                      description="This can't be undone."
                      onConfirm={() => deleteEntry.mutateAsync(entry.id)}
                    />
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{entry.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
