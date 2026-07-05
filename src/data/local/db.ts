import Database from "@tauri-apps/plugin-sql";
import { MIGRATIONS } from "./schema";

/** SQLite file lives in the app's data directory, managed by the SQL plugin. */
const DB_URL = "sqlite:trading-journal.db";

let dbPromise: Promise<Database> | null = null;

/** Lazily open the database and run migrations once per app session. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = init();
  }
  return dbPromise;
}

async function init(): Promise<Database> {
  const db = await Database.load(DB_URL);
  await db.execute("PRAGMA foreign_keys = ON;");
  await runMigrations(db);
  return db;
}

async function runMigrations(db: Database): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );`,
  );

  const rows = await db.select<{ version: number }[]>(
    "SELECT version FROM _migrations",
  );
  const applied = new Set(rows.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    for (const statement of migration.statements) {
      await db.execute(statement);
    }
    await db.execute(
      "INSERT INTO _migrations (version, applied_at) VALUES ($1, $2)",
      [migration.version, new Date().toISOString()],
    );
  }
}
