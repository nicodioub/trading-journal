import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { useAccounts, useCreateTrade, useRepositories, useSettings } from "@/data";
import {
  computePlannedRR,
  tradeInputSchema,
  type Direction,
  type TradeStatus,
} from "@/domain";
import { formatRR } from "@/lib/format";
import type { PendingImage } from "./components/ImageDropzone";
import { ImageDropzone } from "./components/ImageDropzone";
import { datetimeLocalNow, parseNum, parseTags, toIso } from "./utils";

interface TradeFormState {
  accountId: string;
  date: string;
  pair: string;
  direction: Direction;
  status: TradeStatus;
  entryPrice: string;
  exitPrice: string;
  stopLoss: string;
  takeProfit: string;
  riskPercent: string;
  resultAmount: string;
  resultPercent: string;
  rrAchieved: string;
  strategy: string;
  setup: string;
  reasonEntry: string;
  reasonExit: string;
  emotionBefore: string;
  emotionAfter: string;
  lessons: string;
  tags: string;
  notes: string;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function NewTradePage() {
  const navigate = useNavigate();
  const repos = useRepositories();
  const { data: accounts = [] } = useAccounts();
  const { data: settings } = useSettings();
  const createTrade = useCreateTrade();

  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<TradeFormState>({
    accountId: "",
    date: datetimeLocalNow(),
    pair: "",
    direction: "long",
    status: "closed",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    riskPercent: settings ? String(settings.defaultRiskPercent) : "1",
    resultAmount: "",
    resultPercent: "",
    rrAchieved: "",
    strategy: "",
    setup: "",
    reasonEntry: "",
    reasonExit: "",
    emotionBefore: "",
    emotionAfter: "",
    lessons: "",
    tags: "",
    notes: "",
  });

  const set = <K extends keyof TradeFormState>(key: K, value: TradeFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Live RR preview from entry / stop / target (planned) or exit (achieved).
  const previewRR = useMemo(() => {
    const entry = parseNum(form.entryPrice);
    const stop = parseNum(form.stopLoss);
    const exit = parseNum(form.exitPrice);
    const target = parseNum(form.takeProfit);
    return {
      planned: computePlannedRR(entry, stop, target, form.direction),
      achieved: computePlannedRR(entry, stop, exit, form.direction),
    };
  }, [form.entryPrice, form.stopLoss, form.exitPrice, form.takeProfit, form.direction]);

  const handleSubmit = async () => {
    const entry = parseNum(form.entryPrice);
    if (!form.accountId) return setError("Select an account for this trade.");
    if (!form.pair.trim()) return setError("Enter the traded pair.");
    if (entry === null) return setError("Enter a valid entry price.");

    const exit = parseNum(form.exitPrice);
    const stop = parseNum(form.stopLoss);
    const rr =
      parseNum(form.rrAchieved) ??
      computePlannedRR(entry, stop, exit, form.direction);

    const candidate = {
      accountId: form.accountId,
      date: toIso(form.date),
      closedAt: form.status === "closed" ? toIso(form.date) : null,
      pair: form.pair.trim().toUpperCase(),
      direction: form.direction,
      status: form.status,
      entryPrice: entry,
      exitPrice: exit,
      stopLoss: stop,
      takeProfit: parseNum(form.takeProfit),
      riskPercent: parseNum(form.riskPercent),
      resultPercent: parseNum(form.resultPercent),
      resultAmount: parseNum(form.resultAmount),
      rrAchieved: rr,
      strategy: form.strategy,
      setup: form.setup,
      reasonEntry: form.reasonEntry,
      reasonExit: form.reasonExit,
      emotionBefore: form.emotionBefore,
      emotionAfter: form.emotionAfter,
      lessons: form.lessons,
      tags: parseTags(form.tags),
    };

    const parsed = tradeInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review the trade details.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const trade = await createTrade.mutateAsync(parsed.data);

      // Persist screenshots (bytes to storage, metadata to DB).
      for (const img of images) {
        const bytes = new Uint8Array(await img.file.arrayBuffer());
        const ref = await repos.images.save(img.file.name, bytes);
        await repos.tradeImages.create({
          tradeId: trade.id,
          path: ref,
          category: img.category,
          caption: "",
        });
      }

      if (form.notes.trim()) {
        await repos.tradeNotes.save(trade.id, form.notes);
      }

      navigate(`/trades/${trade.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader title="New trade" />
        <EmptyState
          title="Create an account first"
          description="Trades belong to an account. Add one to start logging trades."
          action={
            <Button asChild>
              <Link to="/accounts">Go to accounts</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New trade"
        description="Log a trade with full context, psychology and screenshots."
        actions={
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save trade"}
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Trade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Account">
              <Select value={form.accountId} onValueChange={(v) => set("accountId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date & time">
              <Input
                type="datetime-local"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field label="Pair">
              <Input
                placeholder="EURUSD"
                value={form.pair}
                onChange={(e) => set("pair", e.target.value)}
              />
            </Field>
            <Field label="Direction">
              <Select
                value={form.direction}
                onValueChange={(v) => set("direction", v as Direction)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as TradeStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Strategy">
              <Input
                placeholder="Breakout"
                value={form.strategy}
                onChange={(e) => set("strategy", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prices & risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Entry price">
                <Input type="number" value={form.entryPrice} onChange={(e) => set("entryPrice", e.target.value)} />
              </Field>
              <Field label="Exit price">
                <Input type="number" value={form.exitPrice} onChange={(e) => set("exitPrice", e.target.value)} />
              </Field>
              <Field label="Stop loss">
                <Input type="number" value={form.stopLoss} onChange={(e) => set("stopLoss", e.target.value)} />
              </Field>
              <Field label="Take profit">
                <Input type="number" value={form.takeProfit} onChange={(e) => set("takeProfit", e.target.value)} />
              </Field>
              <Field label="Risk %">
                <Input type="number" value={form.riskPercent} onChange={(e) => set("riskPercent", e.target.value)} />
              </Field>
              <Field label="Result $">
                <Input type="number" value={form.resultAmount} onChange={(e) => set("resultAmount", e.target.value)} />
              </Field>
              <Field label="Result %">
                <Input type="number" value={form.resultPercent} onChange={(e) => set("resultPercent", e.target.value)} />
              </Field>
              <Field label="RR achieved">
                <Input
                  type="number"
                  placeholder={previewRR.achieved !== null ? previewRR.achieved.toFixed(2) : "auto"}
                  value={form.rrAchieved}
                  onChange={(e) => set("rrAchieved", e.target.value)}
                />
              </Field>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Planned RR: {formatRR(previewRR.planned)}</span>
              <span>Achieved RR: {formatRR(previewRR.achieved)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Context & psychology</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Trade setup">
              <Textarea value={form.setup} onChange={(e) => set("setup", e.target.value)} />
            </Field>
            <Field label="Reason for entry">
              <Textarea value={form.reasonEntry} onChange={(e) => set("reasonEntry", e.target.value)} />
            </Field>
            <Field label="Reason for exit">
              <Textarea value={form.reasonExit} onChange={(e) => set("reasonExit", e.target.value)} />
            </Field>
            <Field label="Lessons learned">
              <Textarea value={form.lessons} onChange={(e) => set("lessons", e.target.value)} />
            </Field>
            <Field label="Emotion before trade">
              <Input value={form.emotionBefore} onChange={(e) => set("emotionBefore", e.target.value)} />
            </Field>
            <Field label="Emotion after trade">
              <Input value={form.emotionAfter} onChange={(e) => set("emotionAfter", e.target.value)} />
            </Field>
            <Field label="Tags (comma separated)">
              <Input placeholder="A+ setup, news" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageDropzone value={images} onChange={setImages} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Market context, bias, mistakes, things to improve… (markdown supported)"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="min-h-[160px] font-mono text-xs"
            />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save trade"}
          </Button>
        </div>
      </div>
    </div>
  );
}
