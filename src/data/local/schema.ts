/**
 * SQLite schema, expressed as ordered migrations.
 *
 * A tiny `_migrations` table records which versions have run, so adding a new
 * migration later (e.g. a new column) is just appending to this array — the
 * runner applies only what's missing. Keeping the schema in TypeScript keeps
 * the whole data layer in one place and mirrors what a future server would use.
 */

export interface Migration {
  version: number;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        broker TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'personal',
        currency TEXT NOT NULL DEFAULT 'USD',
        initial_capital REAL NOT NULL,
        current_balance REAL NOT NULL,
        current_equity REAL NOT NULL,
        max_drawdown REAL NOT NULL DEFAULT 0,
        target_profit REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        closed_at TEXT,
        pair TEXT NOT NULL,
        direction TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'closed',
        entry_price REAL NOT NULL,
        exit_price REAL,
        stop_loss REAL,
        take_profit REAL,
        risk_percent REAL,
        result_percent REAL,
        result_amount REAL,
        rr_achieved REAL,
        strategy TEXT NOT NULL DEFAULT '',
        setup TEXT NOT NULL DEFAULT '',
        reason_entry TEXT NOT NULL DEFAULT '',
        reason_exit TEXT NOT NULL DEFAULT '',
        emotion_before TEXT NOT NULL DEFAULT '',
        emotion_after TEXT NOT NULL DEFAULT '',
        lessons TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);`,
      `CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);`,

      `CREATE TABLE IF NOT EXISTS trade_images (
        id TEXT PRIMARY KEY,
        trade_id TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'other',
        created_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_images_trade ON trade_images(trade_id);`,

      `CREATE TABLE IF NOT EXISTS trade_notes (
        id TEXT PRIMARY KEY,
        trade_id TEXT NOT NULL UNIQUE REFERENCES trades(id) ON DELETE CASCADE,
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS mental_checks (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        mood INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        stress INTEGER NOT NULL,
        energy INTEGER NOT NULL,
        slept_well INTEGER NOT NULL DEFAULT 1,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS chess_stats (
        id TEXT PRIMARY KEY,
        week_start TEXT NOT NULL UNIQUE,
        games_played INTEGER NOT NULL DEFAULT 0,
        games_won INTEGER NOT NULL DEFAULT 0,
        games_lost INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        motivational_quote TEXT NOT NULL,
        default_currency TEXT NOT NULL,
        default_risk_percent REAL NOT NULL,
        theme TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS readiness_rules (
        id TEXT PRIMARY KEY,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_readiness_rules_range ON readiness_rules(start_date, end_date);`,
    ],
  },
  {
    version: 3,
    statements: [
      `ALTER TABLE chess_stats RENAME COLUMN week_start TO date;`,

      `CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);`,

      `CREATE TABLE IF NOT EXISTS trading_rules (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,

      `ALTER TABLE settings ADD COLUMN chess_com_username TEXT NOT NULL DEFAULT '';`,
    ],
  },
  {
    version: 4,
    statements: [
      `ALTER TABLE settings ADD COLUMN openai_api_key TEXT NOT NULL DEFAULT '';`,

      `CREATE TABLE IF NOT EXISTS first_thoughts (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        thought TEXT NOT NULL,
        job_statement TEXT NOT NULL DEFAULT '',
        dimensions TEXT NOT NULL,
        readiness_score REAL NOT NULL,
        status TEXT NOT NULL,
        alignment_score REAL NOT NULL DEFAULT 100,
        confidence_score REAL NOT NULL DEFAULT 100,
        primary_focus TEXT NOT NULL DEFAULT '',
        explanation TEXT NOT NULL DEFAULT '',
        biases TEXT NOT NULL DEFAULT '[]',
        strengths TEXT NOT NULL DEFAULT '[]',
        likely_behaviors TEXT NOT NULL DEFAULT '[]',
        reframe TEXT NOT NULL DEFAULT '',
        mission TEXT NOT NULL DEFAULT '',
        suggested_action TEXT NOT NULL DEFAULT '',
        ai_observations TEXT NOT NULL DEFAULT '',
        chess_context TEXT NOT NULL DEFAULT 'null',
        created_at TEXT NOT NULL
      );`,
    ],
  },
  {
    version: 5,
    statements: [
      `ALTER TABLE first_thoughts ADD COLUMN weekly_context TEXT NOT NULL DEFAULT 'null';`,
      `ALTER TABLE first_thoughts ADD COLUMN psychological_load TEXT NOT NULL DEFAULT 'null';`,
    ],
  },
  {
    version: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS planning_objectives (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
        start_balance REAL NOT NULL,
        weekly_growth_percent REAL NOT NULL,
        weeks INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    ],
  },
];
