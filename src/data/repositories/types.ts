import type {
  Account,
  AccountInput,
  ChessStats,
  ChessStatsInput,
  Direction,
  MentalCheck,
  MentalCheckInput,
  Settings,
  Trade,
  TradeImage,
  TradeImageInput,
  TradeInput,
  TradeNote,
} from "@/domain";

/**
 * Repository interfaces — the ONLY contract the UI depends on.
 *
 * The local (SQLite) adapter implements these today. A future online build
 * implements the exact same interfaces over HTTP, so swapping storage never
 * touches a component. This is what makes "offline now, online later" cheap.
 */

export interface AccountRepository {
  list(): Promise<Account[]>;
  get(id: string): Promise<Account | null>;
  create(input: AccountInput): Promise<Account>;
  update(id: string, patch: Partial<AccountInput>): Promise<Account>;
  delete(id: string): Promise<void>;
}

export interface TradeFilters {
  accountId?: string;
  strategy?: string;
  pair?: string;
  direction?: Direction;
  /** Filter to winners or losers only. */
  outcome?: "win" | "loss";
  tag?: string;
  /** ISO date lower/upper bounds (inclusive). */
  from?: string;
  to?: string;
}

export interface TradeRepository {
  list(filters?: TradeFilters): Promise<Trade[]>;
  get(id: string): Promise<Trade | null>;
  create(input: TradeInput): Promise<Trade>;
  update(id: string, patch: Partial<TradeInput>): Promise<Trade>;
  delete(id: string): Promise<void>;
}

export interface TradeImageRepository {
  listByTrade(tradeId: string): Promise<TradeImage[]>;
  create(input: TradeImageInput): Promise<TradeImage>;
  delete(id: string): Promise<void>;
}

export interface TradeNoteRepository {
  getByTrade(tradeId: string): Promise<TradeNote | null>;
  /** Create or replace the note for a trade. */
  save(tradeId: string, content: string): Promise<TradeNote>;
}

export interface MentalCheckRepository {
  list(): Promise<MentalCheck[]>;
  getByDate(date: string): Promise<MentalCheck | null>;
  getLatest(): Promise<MentalCheck | null>;
  /** Upsert the check for its calendar day. */
  save(input: MentalCheckInput): Promise<MentalCheck>;
}

export interface ChessStatsRepository {
  list(): Promise<ChessStats[]>;
  getByWeek(weekStart: string): Promise<ChessStats | null>;
  getLatest(): Promise<ChessStats | null>;
  /** Upsert stats for the week. */
  save(input: ChessStatsInput): Promise<ChessStats>;
}

export interface SettingsRepository {
  get(): Promise<Settings>;
  update(patch: Partial<Omit<Settings, "id">>): Promise<Settings>;
}

/**
 * Binary/asset storage for trade screenshots. Kept separate from the DB
 * repositories because the local adapter writes real files to disk while the
 * DB only stores their paths.
 */
export interface ImageStorage {
  /** Persist bytes; returns a stable reference stored on the TradeImage. */
  save(fileName: string, data: Uint8Array): Promise<string>;
  /** Resolve a stored reference to a URL usable in an <img src>. */
  resolveUrl(ref: string): Promise<string>;
  delete(ref: string): Promise<void>;
}

/** The full set of repositories injected into the app. */
export interface Repositories {
  accounts: AccountRepository;
  trades: TradeRepository;
  tradeImages: TradeImageRepository;
  tradeNotes: TradeNoteRepository;
  mentalChecks: MentalCheckRepository;
  chessStats: ChessStatsRepository;
  settings: SettingsRepository;
  images: ImageStorage;
}
