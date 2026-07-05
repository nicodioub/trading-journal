import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Slider,
  Switch,
  Textarea,
} from "@/components/ui";
import { useMentalCheck, useSaveMentalCheck } from "@/data";
import type { MentalCheckInput } from "@/domain";
import { todayKey } from "../utils";

const DEFAULT: Omit<MentalCheckInput, "date"> = {
  mood: 5,
  confidence: 5,
  stress: 5,
  energy: 5,
  sleptWell: true,
  notes: "",
};

interface RatingRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function RatingRow({ label, value, onChange }: RatingRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{value}/10</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

/**
 * The daily mental check-in — the opening ritual before any trading.
 * Upserts one record per calendar day.
 */
export function MentalCheckCard() {
  const date = todayKey();
  const { data: existing } = useMentalCheck(date);
  const save = useSaveMentalCheck();
  const [form, setForm] = useState<Omit<MentalCheckInput, "date">>(DEFAULT);

  // Hydrate from an existing check for today, when present.
  useEffect(() => {
    if (existing) {
      setForm({
        mood: existing.mood,
        confidence: existing.confidence,
        stress: existing.stress,
        energy: existing.energy,
        sleptWell: existing.sleptWell,
        notes: existing.notes,
      });
    }
  }, [existing]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>How are you feeling today?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <RatingRow label="Mood" value={form.mood} onChange={(v) => set("mood", v)} />
          <RatingRow
            label="Confidence"
            value={form.confidence}
            onChange={(v) => set("confidence", v)}
          />
          <RatingRow
            label="Stress"
            value={form.stress}
            onChange={(v) => set("stress", v)}
          />
          <RatingRow
            label="Energy"
            value={form.energy}
            onChange={(v) => set("energy", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">Did you sleep well?</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{form.sleptWell ? "Yes" : "No"}</span>
            <Switch
              checked={form.sleptWell}
              onCheckedChange={(v) => set("sleptWell", v)}
            />
          </div>
        </div>

        <Textarea
          placeholder="Anything important on your mind?"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="min-h-[88px]"
        />

        <div className="flex items-center justify-end gap-3">
          {save.isSuccess && (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button
            onClick={() => save.mutate({ ...form, date })}
            disabled={save.isPending}
          >
            {existing ? "Update check-in" : "Save check-in"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
