import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AccountInput,
  ChessStatsInput,
  MentalCheckInput,
  Settings,
  TradeImageInput,
  TradeInput,
} from "@/domain";
import { useRepositories } from "./RepositoryProvider";
import type { TradeFilters } from "./repositories";

/** Centralized query keys keep cache invalidation consistent. */
export const queryKeys = {
  accounts: ["accounts"] as const,
  account: (id: string) => ["accounts", id] as const,
  trades: (filters?: TradeFilters) => ["trades", filters ?? {}] as const,
  trade: (id: string) => ["trade", id] as const,
  tradeImages: (tradeId: string) => ["tradeImages", tradeId] as const,
  tradeNote: (tradeId: string) => ["tradeNote", tradeId] as const,
  mentalChecks: ["mentalChecks"] as const,
  mentalCheck: (date: string) => ["mentalCheck", date] as const,
  chessStats: ["chessStats"] as const,
  chessStatsLatest: ["chessStats", "latest"] as const,
  settings: ["settings"] as const,
};

/* ----------------------------- Accounts ----------------------------- */

export function useAccounts() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.accounts, queryFn: () => repos.accounts.list() });
}

export function useAccount(id: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.account(id ?? ""),
    queryFn: () => repos.accounts.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateAccount() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountInput) => repos.accounts.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

export function useUpdateAccount() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AccountInput> }) =>
      repos.accounts.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

export function useDeleteAccount() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.accounts.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accounts });
      qc.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}

/* ------------------------------ Trades ------------------------------ */

export function useTrades(filters?: TradeFilters) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.trades(filters),
    queryFn: () => repos.trades.list(filters),
  });
}

export function useTrade(id: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.trade(id ?? ""),
    queryFn: () => repos.trades.get(id as string),
    enabled: Boolean(id),
  });
}

/** Invalidate everything derived from trades (lists, single, account balances). */
function invalidateTradeQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["trades"] });
  qc.invalidateQueries({ queryKey: ["trade"] });
  qc.invalidateQueries({ queryKey: queryKeys.accounts });
}

export function useCreateTrade() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TradeInput) => repos.trades.create(input),
    onSuccess: () => invalidateTradeQueries(qc),
  });
}

export function useUpdateTrade() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TradeInput> }) =>
      repos.trades.update(id, patch),
    onSuccess: () => invalidateTradeQueries(qc),
  });
}

export function useDeleteTrade() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.trades.delete(id),
    onSuccess: () => invalidateTradeQueries(qc),
  });
}

/* --------------------------- Trade images --------------------------- */

export function useTradeImages(tradeId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.tradeImages(tradeId ?? ""),
    queryFn: () => repos.tradeImages.listByTrade(tradeId as string),
    enabled: Boolean(tradeId),
  });
}

export function useAddTradeImage() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TradeImageInput) => repos.tradeImages.create(input),
    onSuccess: (image) =>
      qc.invalidateQueries({ queryKey: queryKeys.tradeImages(image.tradeId) }),
  });
}

export function useDeleteTradeImage(tradeId: string) {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.tradeImages.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.tradeImages(tradeId) }),
  });
}

/* ---------------------------- Trade note ---------------------------- */

export function useTradeNote(tradeId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.tradeNote(tradeId ?? ""),
    queryFn: () => repos.tradeNotes.getByTrade(tradeId as string),
    enabled: Boolean(tradeId),
  });
}

export function useSaveTradeNote(tradeId: string) {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => repos.tradeNotes.save(tradeId, content),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.tradeNote(tradeId) }),
  });
}

/* -------------------------- Mental checks --------------------------- */

export function useMentalChecks() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.mentalChecks, queryFn: () => repos.mentalChecks.list() });
}

export function useMentalCheck(date: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.mentalCheck(date),
    queryFn: () => repos.mentalChecks.getByDate(date),
  });
}

export function useSaveMentalCheck() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MentalCheckInput) => repos.mentalChecks.save(input),
    onSuccess: (check) => {
      qc.invalidateQueries({ queryKey: queryKeys.mentalChecks });
      qc.invalidateQueries({ queryKey: queryKeys.mentalCheck(check.date) });
    },
  });
}

/* --------------------------- Chess stats ---------------------------- */

export function useChessStatsList() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.chessStats, queryFn: () => repos.chessStats.list() });
}

export function useLatestChessStats() {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.chessStatsLatest,
    queryFn: () => repos.chessStats.getLatest(),
  });
}

export function useChessStatsWeek(weekStart: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ["chessStats", "week", weekStart],
    queryFn: () => repos.chessStats.getByWeek(weekStart),
  });
}

export function useSaveChessStats() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChessStatsInput) => repos.chessStats.save(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chessStats }),
  });
}

/* ----------------------------- Settings ----------------------------- */

export function useSettings() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.settings, queryFn: () => repos.settings.get() });
}

export function useUpdateSettings() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<Settings, "id">>) => repos.settings.update(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings }),
  });
}
