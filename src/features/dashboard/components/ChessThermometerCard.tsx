import { Brain } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";
import { useChessStatsWeek, useSaveChessStats } from "@/data";
import { chessWinRate, currentWeekStart } from "@/domain";
import { formatPercent } from "@/lib/format";

const DEFAULT = { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 };

/**
 * The "cognitive thermometer" — weekly chess performance, tracked so it can be
 * correlated with trading performance later.
 */
export function ChessThermometerCard() {
  const weekStart = currentWeekStart();
  const { data: existing } = useChessStatsWeek(weekStart);
  const save = useSaveChessStats();
  const [form, setForm] = useState(DEFAULT);

  useEffect(() => {
    if (existing) {
      setForm({
        gamesPlayed: existing.gamesPlayed,
        gamesWon: existing.gamesWon,
        gamesLost: existing.gamesLost,
      });
    }
  }, [existing]);

  const winRate = chessWinRate(form);
  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: Math.max(0, Number(value) || 0) }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <CardTitle>Cognitive Thermometer</CardTitle>
        </div>
        <CardDescription>Your chess week — a proxy for mental sharpness.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background/40 py-5">
          <div className="text-4xl font-semibold tabular-nums text-primary">
            {formatPercent(winRate, 0)}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            Win rate this week
          </div>
          <div className="mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(winRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="chess-played">Played</Label>
            <Input
              id="chess-played"
              type="number"
              min={0}
              value={form.gamesPlayed}
              onChange={(e) => set("gamesPlayed", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chess-won">Won</Label>
            <Input
              id="chess-won"
              type="number"
              min={0}
              value={form.gamesWon}
              onChange={(e) => set("gamesWon", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chess-lost">Lost</Label>
            <Input
              id="chess-lost"
              type="number"
              min={0}
              value={form.gamesLost}
              onChange={(e) => set("gamesLost", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() => save.mutate({ weekStart, ...form })}
            disabled={save.isPending}
          >
            Save week
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
