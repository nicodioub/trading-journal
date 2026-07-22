import { Anchor, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Textarea,
} from "@/components/ui";
import {
  useCreateMentorConversation,
  useDeleteMentorConversation,
  useFirstThought,
  useMentorConversations,
  useSettings,
  useTrades,
  useUpdateMentorConversation,
} from "@/data";
import {
  computeGuardrails,
  computePerformanceStats,
  type InternalState,
  type MentorConversation,
  type MentorMessage,
  type PlanStatus,
  tradeTime,
} from "@/domain";
import { todayKey } from "@/features/dashboard/utils";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getMentorReply, type MentorReply } from "./mentor";

/** Badge tone for each internal state — all calm, none alarming. */
const INTERNAL_STATE_META: Record<
  InternalState,
  { badge: "calm" | "calmMuted" | "calmHigh" | "default" }
> = {
  Settled: { badge: "calm" },
  "Emotionally activated": { badge: "calmHigh" },
  Conflicted: { badge: "calmMuted" },
  "Outcome-attached": { badge: "calmMuted" },
  "Seeking stimulation": { badge: "calmHigh" },
  Protective: { badge: "calm" },
  "Processing a significant result": { badge: "calmMuted" },
};

const PLAN_STATUS_META: Record<
  PlanStatus,
  { label: string; badge: "calm" | "calmMuted" | "calmHigh" }
> = {
  INTACT: { label: "Plan intact", badge: "calm" },
  UNCERTAIN: { label: "Plan uncertain", badge: "calmMuted" },
  INVALIDATED: { label: "Plan needs a look", badge: "calmHigh" },
};

function nowIso(): string {
  return new Date().toISOString();
}

/** A short label for the history list, derived from the opening message. */
function deriveTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
}

/**
 * A labelled 0-100 meter, read like a calm thermometer: cool at the low end,
 * neutral in the middle, a warm (never red) tone at the high end. `invert`
 * flips which end is "high" so plan alignment reads the same direction.
 */
function Meter({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const level = invert ? 100 - value : value;
  const color = level >= 66 ? "bg-calm-high" : level >= 33 ? "bg-calm-mid" : "bg-calm-low";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function AnalysisCard({ a }: { a: MentorMessage["analysis"] }) {
  if (!a) return null;
  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-surface/40 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={INTERNAL_STATE_META[a.internalState].badge}>{a.internalState}</Badge>
        <Badge variant={PLAN_STATUS_META[a.planStatus].badge}>
          {PLAN_STATUS_META[a.planStatus].label}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Meter label="Emotional activation" value={a.emotionalActivation} />
        <Meter label="Urge to act" value={a.impulsiveActionRisk} />
        <Meter label="Plan alignment" value={a.planAlignment} invert />
      </div>
      {a.whatImNoticing && (
        <p className="text-sm">
          <span className="font-medium text-foreground">What I'm noticing: </span>
          <span className="text-muted-foreground">{a.whatImNoticing}</span>
        </p>
      )}
    </div>
  );
}

export function MentorPage() {
  const today = todayKey();
  const { data: settings } = useSettings();
  const { data: firstThought } = useFirstThought(today);
  const { data: trades = [] } = useTrades();
  const { data: conversations = [] } = useMentorConversations();
  const createConversation = useCreateMentorConversation();
  const updateConversation = useUpdateMentorConversation();
  const deleteConversation = useDeleteMentorConversation();

  const openTrades = trades.filter((t) => t.status === "open");

  // Real-results context the Mentor anchors on: overall stats, the last handful
  // of closed trades, and the behavioral guardrails computed from history.
  const performance = useMemo(() => computePerformanceStats(trades), [trades]);
  const recentTrades = useMemo(
    () =>
      trades
        .filter((t) => t.status === "closed")
        .sort((a, b) => tradeTime(b) - tradeTime(a))
        .slice(0, 8),
    [trades],
  );
  const guardrails = useMemo(() => computeGuardrails(trades), [trades]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusTradeId, setFocusTradeId] = useState<string>("");
  const [entries, setEntries] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const focusTrade = openTrades.find((t) => t.id === focusTradeId) ?? null;
  const lastAnalysis = [...entries].reverse().find((e) => e.analysis)?.analysis ?? null;

  const scrollToBottom = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));

  const loadConversation = (c: MentorConversation) => {
    setActiveId(c.id);
    setEntries(c.messages);
    setFocusTradeId(c.focusTradeId ?? "");
    setInput("");
    setError(null);
    scrollToBottom();
  };

  const startNew = () => {
    setActiveId(null);
    setEntries([]);
    setFocusTradeId("");
    setInput("");
    setError(null);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (!settings?.openaiApiKey) {
      setError("Add an OpenAI API key in Settings first.");
      return;
    }
    setError(null);

    const priorEntries = entries;
    const userMsg: MentorMessage = {
      role: "user",
      content: trimmed,
      createdAt: nowIso(),
      analysis: null,
    };
    const withUser = [...priorEntries, userMsg];
    setEntries(withUser);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      const reply = await getMentorReply(
        withUser.map((m) => ({ role: m.role, content: m.content })),
        settings.openaiApiKey,
        {
          plan: settings.tradingPlan,
          firstThought,
          openTrades,
          focusTrade,
          performance,
          recentTrades,
          guardrails,
        },
      );
      const { message, ...analysis } = reply satisfies MentorReply;
      const mentorMsg: MentorMessage = {
        role: "mentor",
        content: message,
        createdAt: nowIso(),
        analysis,
      };
      const full = [...withUser, mentorMsg];
      setEntries(full);

      const focus = focusTradeId || null;
      if (activeId) {
        await updateConversation.mutateAsync({
          id: activeId,
          patch: { messages: full, focusTradeId: focus },
        });
      } else {
        const created = await createConversation.mutateAsync({
          date: userMsg.createdAt,
          title: deriveTitle(trimmed),
          focusTradeId: focus,
          messages: full,
        });
        setActiveId(created.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong talking to the Mentor.");
      // Roll the failed user turn back so they can retry.
      setEntries(priorEntries);
      setInput(trimmed);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <div>
      <PageHeader
        title="Mentor"
        description="Talk it through while a trade is open. The Mentor separates what you feel from what your plan actually says — emotions are data about you, not about the market."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3">
            {lastAnalysis ? (
              <>
                <Badge variant={INTERNAL_STATE_META[lastAnalysis.internalState].badge}>
                  {lastAnalysis.internalState}
                </Badge>
                <div className="flex-1 min-w-[8rem]">
                  <Meter label="Emotional activation" value={lastAnalysis.emotionalActivation} />
                </div>
                <div className="flex-1 min-w-[8rem]">
                  <Meter label="Plan alignment" value={lastAnalysis.planAlignment} invert />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                A calm read on where your head is — it appears once you check in.
              </p>
            )}
          </div>

          {/* Conversation */}
          <Card>
            <CardContent className="p-0">
              <div ref={scrollRef} className="max-h-[52vh] space-y-4 overflow-y-auto p-4">
                {entries.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nothing here yet. Say how you're feeling below, in your own words.
                  </p>
                ) : (
                  entries.map((e, i) => (
                    <div
                      key={i}
                      className={cn("flex", e.role === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                          e.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{e.content}</p>
                        {e.analysis && <AnalysisCard a={e.analysis} />}
                        {e.analysis?.question && (
                          <p className="mt-2 text-sm italic text-muted-foreground">
                            {e.analysis.question}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-accent px-4 py-2.5 text-sm text-muted-foreground">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="space-y-2 border-t border-border p-3">
                <p className="text-sm font-medium text-foreground">
                  What are you feeling right now?
                </p>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="In your own words…"
                  rows={2}
                />
                {error && <p className="text-sm text-calm-high">{error}</p>}
                <div className="flex justify-end">
                  <Button onClick={() => send(input)} disabled={sending || !input.trim()}>
                    <Send className="h-4 w-4" />
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* History */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">History</p>
                <Button variant="ghost" size="sm" onClick={startNew}>
                  <MessageSquarePlus className="h-4 w-4" />
                  New
                </Button>
              </div>
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Your saved conversations will appear here.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        c.id === activeId ? "border-primary bg-accent" : "border-border hover:bg-accent/60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => loadConversation(c)}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate">{c.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.date)}</p>
                      </button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Delete this conversation?"
                        description="This can't be undone."
                        onConfirm={async () => {
                          await deleteConversation.mutateAsync(c.id);
                          if (c.id === activeId) startNew();
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Focused trade */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Focused trade</p>
              {openTrades.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No open positions. You can still talk through how you're feeling.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setFocusTradeId("")}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      focusTradeId === "" ? "border-primary bg-accent" : "border-border hover:bg-accent/60",
                    )}
                  >
                    None in particular
                  </button>
                  {openTrades.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFocusTradeId(t.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        focusTradeId === t.id ? "border-primary bg-accent" : "border-border hover:bg-accent/60",
                      )}
                    >
                      <span className="font-medium">
                        {t.pair} {t.direction}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        since {t.date.slice(0, 10)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {lastAnalysis?.planStatus === "INVALIDATED" && (
            <Card>
              <CardContent className="flex gap-2 p-4 text-sm text-calm-high">
                <Anchor className="h-4 w-4 shrink-0" />
                <span>
                  Something you wrote may line up with one of your own pre-entry invalidation
                  conditions — worth sitting with whether that's objectively true, or how it feels.
                </span>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">This is a regulation tool.</p>
              <p>
                It never predicts price or tells you a position is safe. Its only job is to protect the
                plan you wrote while calm.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
