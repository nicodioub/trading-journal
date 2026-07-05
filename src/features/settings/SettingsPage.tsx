import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { isTauri, useSettings, useUpdateSettings } from "@/data";
import type { Theme } from "@/domain";

export function SettingsPage() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();

  const [motivationalQuote, setQuote] = useState("");
  const [defaultCurrency, setCurrency] = useState("USD");
  const [defaultRiskPercent, setRisk] = useState("1");
  const [theme, setTheme] = useState<Theme>("dark");

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

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Trading Journal v0.1.0</p>
            <p>
              Storage: {isTauri() ? "Local SQLite database (offline)" : "Browser (dev preview)"}
            </p>
            <p>All your data stays on this device.</p>
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
      </div>
    </div>
  );
}
