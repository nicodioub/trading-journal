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
  AccountRepository,
  ChessStatsRepository,
  MentalCheckRepository,
  Repositories,
  SettingsRepository,
  TradeFilters,
  TradeImageRepository,
  TradeNoteRepository,
  TradeRepository,
} from "../repositories";
import { getDb } from "./db";
import { tauriImageStorage } from "./imageStorage";

/* ------------------------------------------------------------------ *
 * Row types (snake_case, as stored) + mappers to domain models.
 * ------------------------------------------------------------------ */

function nowIso(): string {
  return new Date().toISOString();
}

interface AccountRow {
  id: string;
  name: string;
  broker: string;
  platform: string;
  type: string;
  currency: string;
  initial_capital: number;
  current_balance: number;
  current_equity: number;
  max_drawdown: number;
  target_profit: number;
  status: string;
  created_at: string;
  updated_at: string;
}

function rowToAccount(row: AccountRow): Account {
  return accountSchema.parse({
    id: row.id,
    name: row.name,
    broker: row.broker,
    platform: row.platform,
    type: row.type,
    currency: row.currency,
    initialCapital: row.initial_capital,
    currentBalance: row.current_balance,
    currentEquity: row.current_equity,
    maxDrawdown: row.max_drawdown,
    targetProfit: row.target_profit,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

interface TradeRow {
  id: string;
  account_id: string;
  date: string;
  closed_at: string | null;
  pair: string;
  direction: string;
  status: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_percent: number | null;
  result_percent: number | null;
  result_amount: number | null;
  rr_achieved: number | null;
  strategy: string;
  setup: string;
  reason_entry: string;
  reason_exit: string;
  emotion_before: string;
  emotion_after: string;
  lessons: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

function rowToTrade(row: TradeRow): Trade {
  return tradeSchema.parse({
    id: row.id,
    accountId: row.account_id,
    date: row.date,
    closedAt: row.closed_at,
    pair: row.pair,
    direction: row.direction,
    status: row.status,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    stopLoss: row.stop_loss,
    takeProfit: row.take_profit,
    riskPercent: row.risk_percent,
    resultPercent: row.result_percent,
    resultAmount: row.result_amount,
    rrAchieved: row.rr_achieved,
    strategy: row.strategy,
    setup: row.setup,
    reasonEntry: row.reason_entry,
    reasonExit: row.reason_exit,
    emotionBefore: row.emotion_before,
    emotionAfter: row.emotion_after,
    lessons: row.lessons,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

const accountRepository: AccountRepository = {
  async list() {
    const db = await getDb();
    const rows = await db.select<AccountRow[]>(
      "SELECT * FROM accounts ORDER BY created_at ASC",
    );
    return rows.map(rowToAccount);
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<AccountRow[]>(
      "SELECT * FROM accounts WHERE id = $1",
      [id],
    );
    return rows[0] ? rowToAccount(rows[0]) : null;
  },

  async create(input) {
    const db = await getDb();
    const parsed = accountSchema.parse({
      ...input,
      id: createId(),
      currentBalance: input.currentBalance ?? input.initialCapital,
      currentEquity: input.currentEquity ?? input.initialCapital,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await db.execute(
      `INSERT INTO accounts (id, name, broker, platform, type, currency,
        initial_capital, current_balance, current_equity, max_drawdown,
        target_profit, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        parsed.id, parsed.name, parsed.broker, parsed.platform, parsed.type,
        parsed.currency, parsed.initialCapital, parsed.currentBalance,
        parsed.currentEquity, parsed.maxDrawdown, parsed.targetProfit,
        parsed.status, parsed.createdAt, parsed.updatedAt,
      ],
    );
    return parsed;
  },

  async update(id, patch) {
    const existing = await this.get(id);
    if (!existing) throw new Error(`Account ${id} not found`);
    const merged = accountSchema.parse({
      ...existing,
      ...patch,
      id,
      updatedAt: nowIso(),
    });
    const db = await getDb();
    await db.execute(
      `UPDATE accounts SET name=$2, broker=$3, platform=$4, type=$5, currency=$6,
        initial_capital=$7, current_balance=$8, current_equity=$9, max_drawdown=$10,
        target_profit=$11, status=$12, updated_at=$13 WHERE id=$1`,
      [
        id, merged.name, merged.broker, merged.platform, merged.type,
        merged.currency, merged.initialCapital, merged.currentBalance,
        merged.currentEquity, merged.maxDrawdown, merged.targetProfit,
        merged.status, merged.updatedAt,
      ],
    );
    return merged;
  },

  async delete(id) {
    const db = await getDb();
    await db.execute("DELETE FROM accounts WHERE id = $1", [id]);
  },
};

/* ------------------------------------------------------------------ *
 * Trades
 * ------------------------------------------------------------------ */

const tradeRepository: TradeRepository = {
  async list(filters: TradeFilters = {}) {
    const db = await getDb();
    const where: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (filters.accountId) { where.push(`account_id = $${i++}`); params.push(filters.accountId); }
    if (filters.strategy) { where.push(`strategy = $${i++}`); params.push(filters.strategy); }
    if (filters.pair) { where.push(`pair = $${i++}`); params.push(filters.pair); }
    if (filters.direction) { where.push(`direction = $${i++}`); params.push(filters.direction); }
    if (filters.from) { where.push(`date >= $${i++}`); params.push(filters.from); }
    if (filters.to) { where.push(`date <= $${i++}`); params.push(filters.to); }

    const sql = `SELECT * FROM trades ${
      where.length ? `WHERE ${where.join(" AND ")}` : ""
    } ORDER BY date DESC`;
    const rows = await db.select<TradeRow[]>(sql, params);
    let trades = rows.map(rowToTrade);

    // Outcome and tag are derived/JSON, so filter these in memory.
    if (filters.outcome) {
      trades = trades.filter((t) => getOutcome(t) === filters.outcome);
    }
    if (filters.tag) {
      trades = trades.filter((t) => t.tags.includes(filters.tag as string));
    }
    return trades;
  },

  async get(id) {
    const db = await getDb();
    const rows = await db.select<TradeRow[]>(
      "SELECT * FROM trades WHERE id = $1",
      [id],
    );
    return rows[0] ? rowToTrade(rows[0]) : null;
  },

  async create(input) {
    const db = await getDb();
    const parsed = tradeSchema.parse({
      ...input,
      id: createId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await db.execute(
      `INSERT INTO trades (id, account_id, date, closed_at, pair, direction, status,
        entry_price, exit_price, stop_loss, take_profit, risk_percent, result_percent,
        result_amount, rr_achieved, strategy, setup, reason_entry, reason_exit,
        emotion_before, emotion_after, lessons, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
      tradeParams(parsed),
    );
    return parsed;
  },

  async update(id, patch) {
    const existing = await this.get(id);
    if (!existing) throw new Error(`Trade ${id} not found`);
    const merged = tradeSchema.parse({
      ...existing,
      ...patch,
      id,
      updatedAt: nowIso(),
    });
    const db = await getDb();
    await db.execute(
      `UPDATE trades SET account_id=$2, date=$3, closed_at=$4, pair=$5, direction=$6,
        status=$7, entry_price=$8, exit_price=$9, stop_loss=$10, take_profit=$11,
        risk_percent=$12, result_percent=$13, result_amount=$14, rr_achieved=$15,
        strategy=$16, setup=$17, reason_entry=$18, reason_exit=$19, emotion_before=$20,
        emotion_after=$21, lessons=$22, tags=$23, created_at=$24, updated_at=$25
       WHERE id=$1`,
      tradeParams(merged),
    );
    return merged;
  },

  async delete(id) {
    const db = await getDb();
    await db.execute("DELETE FROM trades WHERE id = $1", [id]);
  },
};

/** Positional params matching the trades column order (id first). */
function tradeParams(t: Trade): unknown[] {
  return [
    t.id, t.accountId, t.date, t.closedAt, t.pair, t.direction, t.status,
    t.entryPrice, t.exitPrice, t.stopLoss, t.takeProfit, t.riskPercent,
    t.resultPercent, t.resultAmount, t.rrAchieved, t.strategy, t.setup,
    t.reasonEntry, t.reasonExit, t.emotionBefore, t.emotionAfter, t.lessons,
    JSON.stringify(t.tags), t.createdAt, t.updatedAt,
  ];
}

/* ------------------------------------------------------------------ *
 * Trade images
 * ------------------------------------------------------------------ */

interface TradeImageRow {
  id: string;
  trade_id: string;
  path: string;
  caption: string;
  category: string;
  created_at: string;
}

function rowToTradeImage(row: TradeImageRow): TradeImage {
  return tradeImageSchema.parse({
    id: row.id,
    tradeId: row.trade_id,
    path: row.path,
    caption: row.caption,
    category: row.category,
    createdAt: row.created_at,
  });
}

const tradeImageRepository: TradeImageRepository = {
  async listByTrade(tradeId) {
    const db = await getDb();
    const rows = await db.select<TradeImageRow[]>(
      "SELECT * FROM trade_images WHERE trade_id = $1 ORDER BY created_at ASC",
      [tradeId],
    );
    return rows.map(rowToTradeImage);
  },

  async create(input) {
    const db = await getDb();
    const image = tradeImageSchema.parse({
      ...input,
      id: createId(),
      createdAt: nowIso(),
    });
    await db.execute(
      `INSERT INTO trade_images (id, trade_id, path, caption, category, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [image.id, image.tradeId, image.path, image.caption, image.category, image.createdAt],
    );
    return image;
  },

  async delete(id) {
    const db = await getDb();
    const rows = await db.select<TradeImageRow[]>(
      "SELECT * FROM trade_images WHERE id = $1",
      [id],
    );
    await db.execute("DELETE FROM trade_images WHERE id = $1", [id]);
    if (rows[0]) {
      await tauriImageStorage.delete(rows[0].path).catch(() => undefined);
    }
  },
};

/* ------------------------------------------------------------------ *
 * Trade notes (one per trade)
 * ------------------------------------------------------------------ */

interface TradeNoteRow {
  id: string;
  trade_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function rowToTradeNote(row: TradeNoteRow): TradeNote {
  return tradeNoteSchema.parse({
    id: row.id,
    tradeId: row.trade_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

const tradeNoteRepository: TradeNoteRepository = {
  async getByTrade(tradeId) {
    const db = await getDb();
    const rows = await db.select<TradeNoteRow[]>(
      "SELECT * FROM trade_notes WHERE trade_id = $1",
      [tradeId],
    );
    return rows[0] ? rowToTradeNote(rows[0]) : null;
  },

  async save(tradeId, content) {
    const db = await getDb();
    const existing = await this.getByTrade(tradeId);
    if (existing) {
      const updatedAt = nowIso();
      await db.execute(
        "UPDATE trade_notes SET content=$2, updated_at=$3 WHERE trade_id=$1",
        [tradeId, content, updatedAt],
      );
      return { ...existing, content, updatedAt };
    }
    const note = tradeNoteSchema.parse({
      id: createId(),
      tradeId,
      content,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await db.execute(
      `INSERT INTO trade_notes (id, trade_id, content, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [note.id, note.tradeId, note.content, note.createdAt, note.updatedAt],
    );
    return note;
  },
};

/* ------------------------------------------------------------------ *
 * Mental checks (one per day)
 * ------------------------------------------------------------------ */

interface MentalCheckRow {
  id: string;
  date: string;
  mood: number;
  confidence: number;
  stress: number;
  energy: number;
  slept_well: number;
  notes: string;
  created_at: string;
}

function rowToMentalCheck(row: MentalCheckRow): MentalCheck {
  return mentalCheckSchema.parse({
    id: row.id,
    date: row.date,
    mood: row.mood,
    confidence: row.confidence,
    stress: row.stress,
    energy: row.energy,
    sleptWell: row.slept_well === 1,
    notes: row.notes,
    createdAt: row.created_at,
  });
}

const mentalCheckRepository: MentalCheckRepository = {
  async list() {
    const db = await getDb();
    const rows = await db.select<MentalCheckRow[]>(
      "SELECT * FROM mental_checks ORDER BY date DESC",
    );
    return rows.map(rowToMentalCheck);
  },

  async getByDate(date) {
    const db = await getDb();
    const rows = await db.select<MentalCheckRow[]>(
      "SELECT * FROM mental_checks WHERE date = $1",
      [date],
    );
    return rows[0] ? rowToMentalCheck(rows[0]) : null;
  },

  async getLatest() {
    const db = await getDb();
    const rows = await db.select<MentalCheckRow[]>(
      "SELECT * FROM mental_checks ORDER BY date DESC LIMIT 1",
    );
    return rows[0] ? rowToMentalCheck(rows[0]) : null;
  },

  async save(input) {
    const db = await getDb();
    const existing = await this.getByDate(input.date);
    const slept = input.sleptWell ? 1 : 0;
    if (existing) {
      await db.execute(
        `UPDATE mental_checks SET mood=$2, confidence=$3, stress=$4, energy=$5,
          slept_well=$6, notes=$7 WHERE date=$1`,
        [input.date, input.mood, input.confidence, input.stress, input.energy, slept, input.notes ?? ""],
      );
      return { ...existing, ...input };
    }
    const check = mentalCheckSchema.parse({
      ...input,
      id: createId(),
      createdAt: nowIso(),
    });
    await db.execute(
      `INSERT INTO mental_checks (id, date, mood, confidence, stress, energy, slept_well, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [check.id, check.date, check.mood, check.confidence, check.stress, check.energy, check.sleptWell ? 1 : 0, check.notes, check.createdAt],
    );
    return check;
  },
};

/* ------------------------------------------------------------------ *
 * Chess stats (one per week)
 * ------------------------------------------------------------------ */

interface ChessStatsRow {
  id: string;
  week_start: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  created_at: string;
  updated_at: string;
}

function rowToChessStats(row: ChessStatsRow): ChessStats {
  return chessStatsSchema.parse({
    id: row.id,
    weekStart: row.week_start,
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    gamesLost: row.games_lost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

const chessStatsRepository: ChessStatsRepository = {
  async list() {
    const db = await getDb();
    const rows = await db.select<ChessStatsRow[]>(
      "SELECT * FROM chess_stats ORDER BY week_start DESC",
    );
    return rows.map(rowToChessStats);
  },

  async getByWeek(weekStart) {
    const db = await getDb();
    const rows = await db.select<ChessStatsRow[]>(
      "SELECT * FROM chess_stats WHERE week_start = $1",
      [weekStart],
    );
    return rows[0] ? rowToChessStats(rows[0]) : null;
  },

  async getLatest() {
    const db = await getDb();
    const rows = await db.select<ChessStatsRow[]>(
      "SELECT * FROM chess_stats ORDER BY week_start DESC LIMIT 1",
    );
    return rows[0] ? rowToChessStats(rows[0]) : null;
  },

  async save(input) {
    const db = await getDb();
    const existing = await this.getByWeek(input.weekStart);
    if (existing) {
      const updatedAt = nowIso();
      await db.execute(
        `UPDATE chess_stats SET games_played=$2, games_won=$3, games_lost=$4, updated_at=$5
         WHERE week_start=$1`,
        [input.weekStart, input.gamesPlayed, input.gamesWon, input.gamesLost, updatedAt],
      );
      return { ...existing, ...input, updatedAt };
    }
    const stats = chessStatsSchema.parse({
      ...input,
      id: createId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await db.execute(
      `INSERT INTO chess_stats (id, week_start, games_played, games_won, games_lost, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [stats.id, stats.weekStart, stats.gamesPlayed, stats.gamesWon, stats.gamesLost, stats.createdAt, stats.updatedAt],
    );
    return stats;
  },
};

/* ------------------------------------------------------------------ *
 * Settings (singleton)
 * ------------------------------------------------------------------ */

interface SettingsRow {
  id: string;
  motivational_quote: string;
  default_currency: string;
  default_risk_percent: number;
  theme: string;
  updated_at: string;
}

function rowToSettings(row: SettingsRow): Settings {
  return settingsSchema.parse({
    id: "default",
    motivationalQuote: row.motivational_quote,
    defaultCurrency: row.default_currency,
    defaultRiskPercent: row.default_risk_percent,
    theme: row.theme,
    updatedAt: row.updated_at,
  });
}

const settingsRepository: SettingsRepository = {
  async get() {
    const db = await getDb();
    const rows = await db.select<SettingsRow[]>(
      "SELECT * FROM settings WHERE id = 'default'",
    );
    if (rows[0]) return rowToSettings(rows[0]);

    // Seed defaults on first access.
    const seeded = settingsSchema.parse({ ...DEFAULT_SETTINGS, updatedAt: nowIso() });
    await db.execute(
      `INSERT INTO settings (id, motivational_quote, default_currency, default_risk_percent, theme, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [seeded.id, seeded.motivationalQuote, seeded.defaultCurrency, seeded.defaultRiskPercent, seeded.theme, seeded.updatedAt],
    );
    return seeded;
  },

  async update(patch) {
    const current = await this.get();
    const merged = settingsSchema.parse({ ...current, ...patch, id: "default", updatedAt: nowIso() });
    const db = await getDb();
    await db.execute(
      `UPDATE settings SET motivational_quote=$2, default_currency=$3, default_risk_percent=$4, theme=$5, updated_at=$6
       WHERE id=$1`,
      ["default", merged.motivationalQuote, merged.defaultCurrency, merged.defaultRiskPercent, merged.theme, merged.updatedAt],
    );
    return merged;
  },
};

async function resetDatabase(): Promise<void> {
  const db = await getDb();
  // Order respects foreign keys; settings reseeds a default on next read.
  for (const table of [
    "trade_images",
    "trade_notes",
    "trades",
    "accounts",
    "mental_checks",
    "chess_stats",
    "settings",
  ]) {
    await db.execute(`DELETE FROM ${table}`);
  }
}

/** Assemble the SQLite-backed repositories bundle used inside Tauri. */
export function createSqliteRepositories(): Repositories {
  return {
    accounts: accountRepository,
    trades: tradeRepository,
    tradeImages: tradeImageRepository,
    tradeNotes: tradeNoteRepository,
    mentalChecks: mentalCheckRepository,
    chessStats: chessStatsRepository,
    settings: settingsRepository,
    images: tauriImageStorage,
    reset: resetDatabase,
  };
}
