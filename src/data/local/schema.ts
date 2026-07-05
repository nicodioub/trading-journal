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
];
