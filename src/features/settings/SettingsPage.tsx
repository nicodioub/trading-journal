import { useQueryClient } from "@tanstack/react-query";
import { Check, Download, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { isTauri, useRepositories, useSettings, useUpdateSettings } from "@/data";
import type { Theme } from "@/domain";
import {
  downloadBackup,
  downloadPeriodExport,
  exportData,
  exportPeriodData,
  importData,
  isBackupData,
  type BackupData,
} from "./backup";

/** Whole-hour UTC offsets offered in the timezone picker, UTC-12 … UTC+14. */
const UTC_OFFSETS = Array.from({ length: 27 }, (_, i) => i - 12);

function utcOffsetLabel(offset: number): string {
  const sign = offset >= 0 ? "+" : "−";
  return `UTC${sign}${Math.abs(offset)}`;
}

export function SettingsPage() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const repos = useRepositories();
  const qc = useQueryClient();

  const [motivationalQuote, setQuote] = useState("");
  const [defaultCurrency, setCurrency] = useState("USD");
  const [defaultRiskPercent, setRisk] = useState("1");
  const [normalDailyRiskPercent, setNormalDailyRisk] = useState("2");
  const [maxDailyRiskPercent, setMaxDailyRisk] = useState("3");
  const [theme, setTheme] = useState<Theme>("dark");
  const [chessComUsername, setChessComUsername] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [utcOffset, setUtcOffset] = useState("auto");

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [periodFrom, setPeriodFrom] = useState(monthAgo);
  const [periodTo, setPeriodTo] = useState(today);

  useEffect(() => {
    if (settings) {
      setQuote(settings.motivationalQuote);
      setCurrency(settings.defaultCurrency);
      setRisk(String(settings.defaultRiskPercent));
      setNormalDailyRisk(String(settings.normalDailyRiskPercent));
      setMaxDailyRisk(String(settings.maxDailyRiskPercent));
      setTheme(settings.theme);
      setChessComUsername(settings.chessComUsername);
      setOpenaiApiKey(settings.openaiApiKey);
      setUtcOffset(settings.utcOffset);
    }
  }, [settings]);

  const handleSave = () =>
    update.mutate({
      motivationalQuote,
      defaultCurrency,
      defaultRiskPercent: Number(defaultRiskPercent) || 0,
      normalDailyRiskPercent: Math.max(0, Number(normalDailyRiskPercent) || 0),
      maxDailyRiskPercent: Math.max(0, Number(maxDailyRiskPercent) || 0),
      theme,
      chessComUsername: chessComUsername.trim(),
      openaiApiKey: openaiApiKey.trim(),
      utcOffset,
    });

  const handleExport = async () => {
    downloadBackup(await exportData(repos));
    setMessage("Backup exported.");
  };

  const handlePeriodExport = async () => {
    if (periodFrom > periodTo) {
      setMessage("The start date must be before the end date.");
      return;
    }
    downloadPeriodExport(await exportPeriodData(repos, periodFrom, periodTo));
    setMessage("Period export downloaded.");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isBackupData(parsed)) {
        setMessage("That file isn't a valid backup.");
        return;
      }
      setPendingImport(parsed);
    } catch {
      setMessage("Could not read that file.");
    }
  };

  const runImport = async (replace: boolean) => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      await importData(repos, pendingImport, { replace });
      await qc.invalidateQueries();
      setPendingImport(null);
      setMessage(replace ? "Backup restored." : "Backup imported.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    await repos.reset();
    await qc.invalidateQueries();
    setMessage("All data cleared.");
  };

  return (
    <div>
      <PageHeader title="Settings" description="Personalize your trading companion." />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily check-in</CardTitle>
            <CardDescription>
              The motivational line shown at the top of your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={motivationalQuote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Trade your plan, not your emotions."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trading defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="set-currency">Default currency</Label>
              <Input
                id="set-currency"
                value={defaultCurrency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-risk">Default risk %</Label>
              <Input
                id="set-risk"
                type="number"
                value={defaultRiskPercent}
                onChange={(e) => setRisk(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Your timezone</Label>
              <Select value={utcOffset} onValueChange={setUtcOffset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic (device time)</SelectItem>
                  {UTC_OFFSETS.map((offset) => (
                    <SelectItem key={offset} value={String(offset)}>
                      {utcOffsetLabel(offset)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sets the timezone for the market-sessions clock on your dashboard.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily risk budget</CardTitle>
            <CardDescription>
              How much of the account you allow yourself to lose in a single day.
              Your check-in measures every session against these limits, so a day
              that blew past the ceiling is weighed into the next morning's read.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="set-normal-daily-risk">Normal risk per day %</Label>
              <Input
                id="set-normal-daily-risk"
                type="number"
                min="0"
                step="0.1"
                value={normalDailyRiskPercent}
                onChange={(e) => setNormalDailyRisk(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                An ordinary day's allowance. Past this, the day is unusual.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-max-daily-risk">Max risk per day %</Label>
              <Input
                id="set-max-daily-risk"
                type="number"
                min="0"
                step="0.1"
                value={maxDailyRiskPercent}
                onChange={(e) => setMaxDailyRisk(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The hard ceiling. Past this, the day is over.
              </p>
            </div>
            {Number(maxDailyRiskPercent) < Number(normalDailyRiskPercent) && (
              <p className="text-xs text-warning sm:col-span-2">
                Your maximum is below your normal daily risk — every normal day
                would count as a breach.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chess.com</CardTitle>
            <CardDescription>
              Link your username to sync the day's games onto the cognitive
              thermometer instead of entering them by hand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="set-chesscom">Chess.com username</Label>
              <Input
                id="set-chesscom"
                value={chessComUsername}
                onChange={(e) => setChessComUsername(e.target.value)}
                placeholder="e.g. hikaru"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OpenAI</CardTitle>
            <CardDescription>
              Used to analyze your daily "first thought" check-in on the
              Dashboard with GPT-4o.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="set-openai-key">OpenAI API key</Label>
              <Input
                id="set-openai-key"
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {update.isSuccess && (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={update.isPending}>
            Save settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data & backup</CardTitle>
            <CardDescription>
              Everything is stored locally on this device. Export regularly to stay safe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export backup
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Import backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Screenshots aren't included in the JSON backup — accounts, trades,
              notes, mental checks and chess stats are.
            </p>
            {message && <p className="text-xs text-success">{message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export for analysis</CardTitle>
            <CardDescription>
              Every trade and "mind" record (journal, first thoughts, mental checks,
              chess, readiness windows) in a date range, bundled into one JSON file
              you can hand to a spreadsheet or an AI for analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="period-from">From</Label>
                <Input
                  id="period-from"
                  type="date"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="period-to">To</Label>
                <Input
                  id="period-to"
                  type="date"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                />
              </div>
              <Button variant="secondary" onClick={handlePeriodExport}>
                <Download className="h-4 w-4" />
                Export period
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Henledger v0.1.0</p>
            <p>
              Storage:{" "}
              {isTauri() ? "Local SQLite database (offline)" : "Browser (dev preview)"}
            </p>
            <p>All your data stays on this device.</p>
          </CardContent>
        </Card>

        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-danger">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete all data on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmDialog
              title="Delete all data?"
              description="This wipes every account, trade, note, mental check and chess record. Export a backup first."
              confirmLabel="Delete everything"
              onConfirm={handleReset}
              trigger={
                <Button variant="danger">
                  <Trash2 className="h-4 w-4" />
                  Reset all data
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import backup</DialogTitle>
            <DialogDescription>
              This file contains {pendingImport?.accounts.length ?? 0} account(s) and{" "}
              {pendingImport?.trades.length ?? 0} trade(s). Replace your current data
              with it, or merge it in?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => runImport(false)} disabled={busy}>
              Merge
            </Button>
            <Button variant="danger" onClick={() => runImport(true)} disabled={busy}>
              Replace all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
