import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { fetchWeeklyNews, type NewsEvent, type NewsImpact } from "./forexFactory";

const IMPACT_META: Record<NewsImpact, { badge: "danger" | "warning" | "default"; label: string }> = {
  High: { badge: "danger", label: "High" },
  Medium: { badge: "warning", label: "Medium" },
  Low: { badge: "default", label: "Low" },
  Holiday: { badge: "default", label: "Holiday" },
  "Non-Economic": { badge: "default", label: "Non-Economic" },
};

const FILTERS: Array<{ value: NewsImpact | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

function groupByDay(events: NewsEvent[]): Array<[string, NewsEvent[]]> {
  const map = new Map<string, NewsEvent[]>();
  for (const event of events) {
    const day = format(new Date(event.date), "yyyy-MM-dd");
    const list = map.get(day) ?? [];
    list.push(event);
    map.set(day, list);
  }
  return [...map.entries()];
}

export function NewsPage() {
  const [filter, setFilter] = useState<NewsImpact | "all">("all");
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ["forexFactoryNews"],
    queryFn: fetchWeeklyNews,
    staleTime: 15 * 60_000,
  });

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.impact === filter)),
    [events, filter],
  );
  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div>
      <PageHeader
        title="News"
        description="This week's economic calendar — what's happening, and when."
      />

      <div className="space-y-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading this week's calendar…</p>}

        {isError && (
          <EmptyState
            icon={Newspaper}
            title="Couldn't load the calendar"
            description="The Forex Factory feed didn't respond. Check your connection and try again shortly."
          />
        )}

        {!isLoading && !isError && grouped.length === 0 && (
          <EmptyState
            icon={Newspaper}
            title="Nothing matches this filter"
            description="Try a different impact level."
          />
        )}

        {grouped.map(([day, dayEvents]) => (
          <Card key={day}>
            <CardContent className="space-y-2 pt-6">
              <h2 className="text-sm font-semibold tracking-tight">
                {format(new Date(day), "EEEE, dd MMM yyyy")}
              </h2>
              <div className="divide-y divide-border">
                {dayEvents.map((event, i) => (
                  <div key={`${event.title}-${i}`} className="flex items-center justify-between gap-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {format(new Date(event.date), "HH:mm")}
                      </span>
                      <span className="w-10 shrink-0 text-xs font-medium uppercase text-muted-foreground">
                        {event.country}
                      </span>
                      <span className="text-sm">{event.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {(event.forecast || event.previous) && (
                        <span className="text-xs text-muted-foreground">
                          {event.forecast && `F: ${event.forecast}`}
                          {event.forecast && event.previous && " · "}
                          {event.previous && `P: ${event.previous}`}
                        </span>
                      )}
                      <Badge variant={IMPACT_META[event.impact].badge}>
                        {IMPACT_META[event.impact].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
