import { createSqliteRepositories } from "./local/sqliteRepositories";
import { createMemoryRepositories } from "./memory/memoryRepositories";
import type { Repositories } from "./repositories";

/** True when running inside the Tauri desktop shell (vs a plain browser). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let cached: Repositories | null = null;

/**
 * Choose the storage backend at runtime:
 *  - Tauri desktop  -> SQLite (persistent, file-based)
 *  - Browser (dev)  -> in-memory + localStorage
 *
 * This single line is the seam for going online later: return
 * `createRemoteRepositories(apiUrl)` and nothing else in the app changes.
 */
export function createRepositories(): Repositories {
  if (!cached) {
    cached = isTauri() ? createSqliteRepositories() : createMemoryRepositories();
  }
  return cached;
}
