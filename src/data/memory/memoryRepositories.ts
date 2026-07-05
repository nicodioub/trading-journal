import {
  accountSchema,
  chessStatsSchema,
  DEFAULT_SETTINGS,
  getOutcome,
  mentalCheckSchema,
  settingsSchema,
  tradeImageSchema,
  tradeNoteSchema,
  tradeSchema,
  type Account,
  type ChessStats,
  type MentalCheck,
  type Settings,
  type Trade,
  type TradeImage,
  type TradeNote,
} from "@/domain";
import { createId } from "@/lib/utils";
import type {
  ImageStorage,
  Repositories,
  TradeFilters,
} from "../repositories";

/**
 * In-memory data layer used when NOT running inside Tauri (e.g. `pnpm dev` in a
 * browser, or tests). Implements the exact same `Repositories` interface as the
 * SQLite adapter, so features behave identically. DB rows persist to
 * localStorage; images are session-scoped object URLs.
 */

const STORAGE_KEY = "tj:data";

interface Snapshot {
  accounts: Account[];
  trades: Trade[];
  tradeImages: TradeImage[];
  tradeNotes: TradeNote[];
  mentalChecks: MentalCheck[];
  chessStats: ChessStats[];
  settings: Settings | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

class MemoryStore {
  accounts: Account[] = [];
  trades: Trade[] = [];
  tradeImages: TradeImage[] = [];
  tradeNotes: TradeNote[] = [];
  mentalChecks: MentalCheck[] = [];
  chessStats: ChessStats[] = [];
  settings: Settings | null = null;
  images = new Map<string, string>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw) as Snapshot;
      Object.assign(this, snap);
    } catch {
      // Corrupt/unavailable storage — start clean.
    }
  }

  persist(): void {
    const snap: Snapshot = {
      accounts: this.accounts,
      trades: this.trades,
      tradeImages: this.tradeImages,
      tradeNotes: this.tradeNotes,
      mentalChecks: this.mentalChecks,
      chessStats: this.chessStats,
      settings: this.settings,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch {
      // Ignore quota/availability errors in dev.
    }
  }

  isEmpty(): boolean {
    return this.accounts.length === 0 && this.trades.length === 0;
  }
}

export function createMemoryRepositories(): Repositories {
  const store = new MemoryStore();

  const images: ImageStorage = {
    async save(fileName, data) {
      const ref = `mem://${createId()}-${fileName}`;
      const url = URL.createObjectURL(new Blob([data as BlobPart]));
      store.images.set(ref, url);
      return ref;
    },
    async resolveUrl(ref) {
      return store.images.get(ref) ?? ref;
    },
    async delete(ref) {
      const url = store.images.get(ref);
      if (url) URL.revokeObjectURL(url);
      store.images.delete(ref);
    },
  };

  const repositories: Repositories = {
    accounts: {
      async list() {
        return [...store.accounts];
      },
      async get(id) {
        return store.accounts.find((a) => a.id === id) ?? null;
      },
      async create(input) {
        const account = accountSchema.parse({
          ...input,
          id: createId(),
          currentBalance: input.currentBalance ?? input.initialCapital,
          currentEquity: input.currentEquity ?? input.initialCapital,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        store.accounts.push(account);
        store.persist();
        return account;
      },
      async update(id, patch) {
        const existing = store.accounts.find((a) => a.id === id);
        if (!existing) throw new Error(`Account ${id} not found`);
        const merged = accountSchema.parse({ ...existing, ...patch, id, updatedAt: nowIso() });
        store.accounts = store.accounts.map((a) => (a.id === id ? merged : a));
        store.persist();
        return merged;
      },
      async delete(id) {
        store.accounts = store.accounts.filter((a) => a.id !== id);
        store.trades = store.trades.filter((t) => t.accountId !== id);
        store.persist();
      },
    },

    trades: {
      async list(filters: TradeFilters = {}) {
        let trades = [...store.trades].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        if (filters.accountId) trades = trades.filter((t) => t.accountId === filters.accountId);
        if (filters.strategy) trades = trades.filter((t) => t.strategy === filters.strategy);
        if (filters.pair) trades = trades.filter((t) => t.pair === filters.pair);
        if (filters.direction) trades = trades.filter((t) => t.direction === filters.direction);
        if (filters.from) trades = trades.filter((t) => t.date >= filters.from!);
        if (filters.to) trades = trades.filter((t) => t.date <= filters.to!);
        if (filters.outcome) trades = trades.filter((t) => getOutcome(t) === filters.outcome);
        if (filters.tag) trades = trades.filter((t) => t.tags.includes(filters.tag!));
        return trades;
      },
      async get(id) {
        return store.trades.find((t) => t.id === id) ?? null;
      },
      async create(input) {
        const trade = tradeSchema.parse({
          ...input,
          id: createId(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        store.trades.push(trade);
        store.persist();
        return trade;
      },
      async update(id, patch) {
        const existing = store.trades.find((t) => t.id === id);
        if (!existing) throw new Error(`Trade ${id} not found`);
        const merged = tradeSchema.parse({ ...existing, ...patch, id, updatedAt: nowIso() });
        store.trades = store.trades.map((t) => (t.id === id ? merged : t));
        store.persist();
        return merged;
      },
      async delete(id) {
        store.trades = store.trades.filter((t) => t.id !== id);
        store.tradeImages = store.tradeImages.filter((img) => img.tradeId !== id);
        store.tradeNotes = store.tradeNotes.filter((n) => n.tradeId !== id);
        store.persist();
      },
    },

    tradeImages: {
      async listByTrade(tradeId) {
        return store.tradeImages.filter((img) => img.tradeId === tradeId);
      },
      async create(input) {
        const image = tradeImageSchema.parse({ ...input, id: createId(), createdAt: nowIso() });
        store.tradeImages.push(image);
        store.persist();
        return image;
      },
      async delete(id) {
        const image = store.tradeImages.find((img) => img.id === id);
        if (image) await images.delete(image.path);
        store.tradeImages = store.tradeImages.filter((img) => img.id !== id);
        store.persist();
      },
    },

    tradeNotes: {
      async getByTrade(tradeId) {
        return store.tradeNotes.find((n) => n.tradeId === tradeId) ?? null;
      },
      async save(tradeId, content) {
        const existing = store.tradeNotes.find((n) => n.tradeId === tradeId);
        if (existing) {
          const updated: TradeNote = { ...existing, content, updatedAt: nowIso() };
          store.tradeNotes = store.tradeNotes.map((n) => (n.tradeId === tradeId ? updated : n));
          store.persist();
          return updated;
        }
        const note = tradeNoteSchema.parse({
          id: createId(),
          tradeId,
          content,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        store.tradeNotes.push(note);
        store.persist();
        return note;
      },
    },

    mentalChecks: {
      async list() {
        return [...store.mentalChecks].sort((a, b) => b.date.localeCompare(a.date));
      },
      async getByDate(date) {
        return store.mentalChecks.find((c) => c.date === date) ?? null;
      },
      async getLatest() {
        return [...store.mentalChecks].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
      },
      async save(input) {
        const existing = store.mentalChecks.find((c) => c.date === input.date);
        if (existing) {
          const merged: MentalCheck = { ...existing, ...input };
          store.mentalChecks = store.mentalChecks.map((c) => (c.date === input.date ? merged : c));
          store.persist();
          return merged;
        }
        const check = mentalCheckSchema.parse({ ...input, id: createId(), createdAt: nowIso() });
        store.mentalChecks.push(check);
        store.persist();
        return check;
      },
    },

    chessStats: {
      async list() {
        return [...store.chessStats].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      },
      async getByWeek(weekStart) {
        return store.chessStats.find((s) => s.weekStart === weekStart) ?? null;
      },
      async getLatest() {
        return [...store.chessStats].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0] ?? null;
      },
      async save(input) {
        const existing = store.chessStats.find((s) => s.weekStart === input.weekStart);
        if (existing) {
          const merged: ChessStats = { ...existing, ...input, updatedAt: nowIso() };
          store.chessStats = store.chessStats.map((s) => (s.weekStart === input.weekStart ? merged : s));
          store.persist();
          return merged;
        }
        const stats = chessStatsSchema.parse({
          ...input,
          id: createId(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        store.chessStats.push(stats);
        store.persist();
        return stats;
      },
    },

    settings: {
      async get() {
        if (store.settings) return store.settings;
        const seeded = settingsSchema.parse({ ...DEFAULT_SETTINGS, updatedAt: nowIso() });
        store.settings = seeded;
        store.persist();
        return seeded;
      },
      async update(patch) {
        const current = store.settings ?? settingsSchema.parse({ ...DEFAULT_SETTINGS, updatedAt: nowIso() });
        const merged = settingsSchema.parse({ ...current, ...patch, id: "default", updatedAt: nowIso() });
        store.settings = merged;
        store.persist();
        return merged;
      },
    },

    images,
  };

  // Populate a realistic sample dataset the first time in dev, so the UI and
  // statistics are demonstrable without manual entry. Never runs in production.
  if (import.meta.env.DEV && store.isEmpty()) {
    void seedDemoData(repositories);
  }

  return repositories;
}

/** Seeds a demo account with a spread of trades. Dev-only convenience. */
async function seedDemoData(repos: Repositories): Promise<void> {
  const account = await repos.accounts.create({
    name: "FTMO Challenge",
    broker: "FTMO",
    platform: "MetaTrader 5",
    type: "prop",
    currency: "USD",
    initialCapital: 100_000,
    maxDrawdown: 10,
    targetProfit: 10_000,
    status: "active",
  });

  const pairs = ["EURUSD", "GBPUSD", "XAUUSD", "US30", "BTCUSD"];
  const strategies = ["Breakout", "Reversal", "Trend Continuation"];
  const now = Date.now();

  for (let i = 0; i < 24; i += 1) {
    const daysAgo = 24 - i;
    const date = new Date(now - daysAgo * 24 * 3600 * 1000).toISOString();
    const isWin = Math.random() > 0.42;
    const rr = isWin ? 1.5 + Math.random() * 2 : 1;
    const riskAmount = 500;
    const resultAmount = isWin ? riskAmount * rr : -riskAmount;
    const direction = Math.random() > 0.5 ? "long" : "short";

    await repos.trades.create({
      accountId: account.id,
      date,
      closedAt: date,
      pair: pairs[i % pairs.length],
      direction,
      status: "closed",
      entryPrice: 100,
      exitPrice: isWin ? 102 : 99,
      stopLoss: 99,
      takeProfit: 103,
      riskPercent: 0.5,
      resultPercent: (resultAmount / 100_000) * 100,
      resultAmount,
      rrAchieved: isWin ? rr : -1,
      strategy: strategies[i % strategies.length],
      setup: "",
      reasonEntry: "",
      reasonExit: "",
      emotionBefore: isWin ? "Calm" : "Anxious",
      emotionAfter: isWin ? "Confident" : "Frustrated",
      lessons: "",
      tags: i % 3 === 0 ? ["A+ setup"] : [],
    });
  }
}
