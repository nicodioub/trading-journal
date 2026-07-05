import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Textarea,
} from "@/components/ui";
import {
  useAccount,
  useDeleteTrade,
  useTrade,
  useTradeImages,
  useTradeNote,
  useSaveTradeNote,
} from "@/data";
import { formatCurrency, formatDate, formatRR } from "@/lib/format";
import { DirectionTag, OutcomeBadge } from "./components/TradeBits";
import { TradeImageView } from "./components/TradeImageView";

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <p className="whitespace-pre-wrap text-sm" data-selectable>
        {value}
      </p>
    </div>
  );
}

export function TradeDetailPage() {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const { data: trade, isLoading } = useTrade(tradeId);
  const { data: account } = useAccount(trade?.accountId);
  const { data: images = [] } = useTradeImages(tradeId);
  const { data: note } = useTradeNote(tradeId);
  const saveNote = useSaveTradeNote(tradeId ?? "");
  const deleteTrade = useDeleteTrade();

  const [noteDraft, setNoteDraft] = useState("");
  useEffect(() => {
    setNoteDraft(note?.content ?? "");
  }, [note]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!trade) {
    return (
      <EmptyState
        title="Trade not found"
        description="This trade may have been deleted."
        action={
          <Button asChild variant="secondary">
            <Link to="/trades">Back to history</Link>
          </Button>
        }
      />
    );
  }

  const currency = account?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/trades">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{trade.pair}</h1>
              <DirectionTag direction={trade.direction} />
              <OutcomeBadge trade={trade} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(trade.date)} · {account?.name ?? "—"}
              {trade.strategy ? ` · ${trade.strategy}` : ""}
            </p>
          </div>
        </div>
        <ConfirmDialog
          title="Delete trade?"
          description="This permanently deletes the trade, its screenshots and notes."
          onConfirm={async () => {
            await deleteTrade.mutateAsync(trade.id);
            navigate("/trades");
          }}
          trigger={
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          <InfoItem label="Entry" value={trade.entryPrice.toString()} />
          <InfoItem label="Exit" value={trade.exitPrice?.toString() ?? "—"} />
          <InfoItem label="Stop loss" value={trade.stopLoss?.toString() ?? "—"} />
          <InfoItem label="Take profit" value={trade.takeProfit?.toString() ?? "—"} />
          <InfoItem label="Risk %" value={trade.riskPercent !== null ? `${trade.riskPercent}%` : "—"} />
          <InfoItem label="RR achieved" value={formatRR(trade.rrAchieved)} />
          <InfoItem
            label="Result"
            value={formatCurrency(trade.resultAmount ?? 0, currency, { signed: true })}
          />
          <InfoItem
            label="Result %"
            value={trade.resultPercent !== null ? `${trade.resultPercent.toFixed(2)}%` : "—"}
          />
        </CardContent>
      </Card>

      {(trade.setup ||
        trade.reasonEntry ||
        trade.reasonExit ||
        trade.emotionBefore ||
        trade.emotionAfter ||
        trade.lessons ||
        trade.tags.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Context & psychology</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <TextBlock label="Trade setup" value={trade.setup} />
            <TextBlock label="Reason for entry" value={trade.reasonEntry} />
            <TextBlock label="Reason for exit" value={trade.reasonExit} />
            <TextBlock label="Lessons learned" value={trade.lessons} />
            <TextBlock label="Emotion before" value={trade.emotionBefore} />
            <TextBlock label="Emotion after" value={trade.emotionAfter} />
            {trade.tags.length > 0 && (
              <div className="space-y-1.5 sm:col-span-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {trade.tags.map((tag) => (
                    <Badge key={tag} variant="primary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Screenshots</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <TradeImageView key={image.id} image={image} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Market context, bias, mistakes, lessons, things to improve… (markdown)"
            className="min-h-[160px] font-mono text-xs"
          />
          <div className="flex items-center justify-end gap-3">
            {saveNote.isSuccess && (
              <span className="text-xs text-success">Saved</span>
            )}
            <Button
              variant="secondary"
              onClick={() => saveNote.mutate(noteDraft)}
              disabled={saveNote.isPending}
            >
              <Save className="h-4 w-4" />
              Save notes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
