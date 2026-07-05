import type { Repositories } from "@/data";
import type {
  Account,
  ChessStats,
  MentalCheck,
  Settings,
  Trade,
  TradeImage,
  TradeNote,
} from "@/domain";

/**
 * JSON backup of all structured journal data. Screenshot *files* are not
 * embedded (only their references), so a restored backup keeps every account,
 * trade, note, mental check and chess record — the irreplaceable data.
 */
export interface BackupData {
  version: 1;
  exportedAt: string;
  accounts: Account[];
  trades: Trade[];
  tradeImages: TradeImage[];
  tradeNotes: TradeNote[];
  mentalChecks: MentalCheck[];
  chessStats: ChessStats[];
  settings: Settings;
}

/** Read every entity into a single portable object. */
export async function exportData(repos: Repositories): Promise<BackupData> {
  const accounts = await repos.accounts.list();
  const trades = await repos.trades.list();

  const tradeImages: TradeImage[] = [];
  const tradeNotes: TradeNote[] = [];
  for (const trade of trades) {
    tradeImages.push(...(await repos.tradeImages.listByTrade(trade.id)));
    const note = await repos.tradeNotes.getByTrade(trade.id);
    if (note) tradeNotes.push(note);
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    trades,
    tradeImages,
    tradeNotes,
    mentalChecks: await repos.mentalChecks.list(),
    chessStats: await repos.chessStats.list(),
    settings: await repos.settings.get(),
  };
}

/**
 * Restore a backup. New ids are minted and foreign keys remapped, so the data
 * imports cleanly regardless of the target backend. With `replace`, existing
 * data is wiped first (a true restore); otherwise the data is merged in.
 */
export async function importData(
  repos: Repositories,
  data: BackupData,
  { replace }: { replace: boolean },
): Promise<void> {
  if (replace) await repos.reset();

  const accountIdMap = new Map<string, string>();
  for (const account of data.accounts) {
    const { id, createdAt, updatedAt, ...input } = account;
    void createdAt;
    void updatedAt;
    const created = await repos.accounts.create(input);
    accountIdMap.set(id, created.id);
  }

  const tradeIdMap = new Map<string, string>();
  for (const trade of data.trades) {
    const accountId = accountIdMap.get(trade.accountId);
    if (!accountId) continue;
    const { id, createdAt, updatedAt, ...input } = trade;
    void createdAt;
    void updatedAt;
    const created = await repos.trades.create({ ...input, accountId });
    tradeIdMap.set(id, created.id);
  }

  for (const image of data.tradeImages) {
    const tradeId = tradeIdMap.get(image.tradeId);
    if (!tradeId) continue;
    await repos.tradeImages.create({
      tradeId,
      path: image.path,
      caption: image.caption,
      category: image.category,
    });
  }

  for (const note of data.tradeNotes) {
    const tradeId = tradeIdMap.get(note.tradeId);
    if (!tradeId) continue;
    await repos.tradeNotes.save(tradeId, note.content);
  }

  for (const check of data.mentalChecks) {
    const { id, createdAt, ...input } = check;
    void id;
    void createdAt;
    await repos.mentalChecks.save(input);
  }

  for (const stats of data.chessStats) {
    const { id, createdAt, updatedAt, ...input } = stats;
    void id;
    void createdAt;
    void updatedAt;
    await repos.chessStats.save(input);
  }

  await repos.settings.update({
    motivationalQuote: data.settings.motivationalQuote,
    defaultCurrency: data.settings.defaultCurrency,
    defaultRiskPercent: data.settings.defaultRiskPercent,
    theme: data.settings.theme,
  });
}

/** Trigger a browser/webview download of the backup JSON. */
export function downloadBackup(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `trading-journal-backup-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Minimal shape check before importing an untrusted file. */
export function isBackupData(value: unknown): value is BackupData {
  const v = value as Partial<BackupData> | null;
  return (
    !!v &&
    typeof v === "object" &&
    v.version === 1 &&
    Array.isArray(v.accounts) &&
    Array.isArray(v.trades)
  );
}
