import { Brain, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { useChessStatsDay, useSaveChessStats, useSettings } from "@/data";
import { chessWinRate, currentChessDay } from "@/domain";
import { formatPercent } from "@/lib/format";
import { fetchChessComDailyResult } from "../chessCom";

const DEFAULT = { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 };

/**
 * Guards the automatic sync so it runs at most once per app launch (module
 * state resets on a full reload / app reopen), not on every remount as the
 * user navigates back to the dashboard.
 */
let autoSyncedThisLaunch = false;

/**
 * The "cognitive thermometer" — today's chess performance, tracked so it can be
 * correlated with trading performance later.
 */
export function ChessThermometerCard() {
  const date = currentChessDay();
  const { data: existing } = useChessStatsDay(date);
  const { data: settings } = useSettings();
  const save = useSaveChessStats();
  const [form, setForm] = useState(DEFAULT);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const username = settings?.chessComUsername;

  const handleSync = useCallback(async () => {
    if (!username) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await fetchChessComDailyResult(username, date);
      setForm(result);
      // Persist immediately — otherwise a synced-but-unsaved result is only in
      // local state and both disappears on reload and stays invisible to the
      // First Thought analysis, which reads chess data from the saved table.
      await save.mutateAsync({ date, ...result });
    } catch {
      setSyncError("Couldn't reach Chess.com. Check the username and your connection.");
    } finally {
      setSyncing(false);
    }
  }, [username, date, save]);

  // Auto-refresh today's chess result from Chess.com once each time the app is
  // opened (a username must be linked). The synced result is saved immediately,
  // so no button press is needed to keep the day's data current.
  useEffect(() => {
    if (autoSyncedThisLaunch || !username) return;
    autoSyncedThisLaunch = true;
    void handleSync();
  }, [username, handleSync]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle>Cognitive Thermometer</CardTitle>
          </div>
          {settings?.chessComUsername && (
            <Button variant="ghost" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Updating…" : "Update chess data"}
            </Button>
          )}
        </div>
        <CardDescription>
          Estimated cognitive sharpness based on today's chess performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background/40 py-5">
          <div className="text-4xl font-semibold tabular-nums text-primary">
            {formatPercent(winRate, 0)}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            Win rate today
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

        {syncError && <p className="text-xs text-danger">{syncError}</p>}

        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() => save.mutate({ date, ...form })}
            disabled={save.isPending}
          >
            Save today
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
