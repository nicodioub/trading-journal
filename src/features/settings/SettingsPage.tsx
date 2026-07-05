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
  exportData,
  importData,
  isBackupData,
  type BackupData,
} from "./backup";

export function SettingsPage() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const repos = useRepositories();
  const qc = useQueryClient();

  const [motivationalQuote, setQuote] = useState("");
  const [defaultCurrency, setCurrency] = useState("USD");
  const [defaultRiskPercent, setRisk] = useState("1");
  const [theme, setTheme] = useState<Theme>("dark");

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setQuote(settings.motivationalQuote);
      setCurrency(settings.defaultCurrency);
      setRisk(String(settings.defaultRiskPercent));
      setTheme(settings.theme);
    }
  }, [settings]);

  const handleSave = () =>
    update.mutate({
      motivationalQuote,
      defaultCurrency,
      defaultRiskPercent: Number(defaultRiskPercent) || 0,
      theme,
    });

  const handleExport = async () => {
    downloadBackup(await exportData(repos));
    setMessage("Backup exported.");
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
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Trading Journal v0.1.0</p>
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
