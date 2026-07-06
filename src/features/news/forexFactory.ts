export type NewsImpact = "High" | "Medium" | "Low" | "Holiday" | "Non-Economic";

export interface NewsEvent {
  title: string;
  country: string;
  date: string;
  impact: NewsImpact;
  forecast: string;
  previous: string;
  url: string;
}

/**
 * FairEconomy publishes the Forex Factory economic calendar as a public JSON
 * feed intended for third-party consumption — this is the sanctioned way to
 * pull "what's happening this week", as opposed to scraping forexfactory.com
 * directly (which their ToS doesn't allow).
 */
const CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

export async function fetchWeeklyNews(): Promise<NewsEvent[]> {
  const res = await fetch(CALENDAR_URL);
  if (!res.ok) {
    throw new Error(`Calendar feed returned ${res.status}`);
  }
  const data = (await res.json()) as NewsEvent[];
  return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
