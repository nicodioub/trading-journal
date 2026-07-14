import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AccountInput,
  ChessStatsInput,
  FirstThoughtInput,
  JournalEntryInput,
  MentalCheckInput,
  PlanningObjectiveInput,
  ReadinessRuleInput,
  Settings,
  TradeImageInput,
  TradeInput,
  TradingRuleInput,
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
  firstThoughts: ["firstThoughts"] as const,
  firstThought: (date: string) => ["firstThought", date] as const,
  readinessRules: ["readinessRules"] as const,
  readinessRuleForDate: (date: string) => ["readinessRule", date] as const,
  planningObjective: (accountId: string) => ["planningObjective", accountId] as const,
  chessStats: ["chessStats"] as const,
  chessStatsLatest: ["chessStats", "latest"] as const,
  journalEntries: ["journalEntries"] as const,
  tradingRules: ["tradingRules"] as const,
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

/* -------------------------- First thoughts --------------------------- */

export function useFirstThoughts() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.firstThoughts, queryFn: () => repos.firstThoughts.list() });
}

export function useFirstThought(date: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.firstThought(date),
    queryFn: () => repos.firstThoughts.getByDate(date),
  });
}

export function useSaveFirstThought() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FirstThoughtInput) => repos.firstThoughts.save(input),
    onSuccess: (check) => {
      qc.invalidateQueries({ queryKey: queryKeys.firstThoughts });
      qc.invalidateQueries({ queryKey: queryKeys.firstThought(check.date) });
    },
  });
}

/* -------------------------- Readiness rules -------------------------- */

export function useReadinessRules() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.readinessRules, queryFn: () => repos.readinessRules.list() });
}

export function useReadinessRuleForDate(date: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.readinessRuleForDate(date ?? ""),
    queryFn: () => repos.readinessRules.findForDate(date as string),
    enabled: Boolean(date),
  });
}

function invalidateReadinessQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.readinessRules });
  qc.invalidateQueries({ queryKey: ["readinessRule"] });
}

export function useCreateReadinessRule() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReadinessRuleInput) => repos.readinessRules.create(input),
    onSuccess: () => invalidateReadinessQueries(qc),
  });
}

export function useUpdateReadinessRule() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ReadinessRuleInput> }) =>
      repos.readinessRules.update(id, patch),
    onSuccess: () => invalidateReadinessQueries(qc),
  });
}

export function useDeleteReadinessRule() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.readinessRules.delete(id),
    onSuccess: () => invalidateReadinessQueries(qc),
  });
}

/* ------------------------ Planning objectives ------------------------ */

export function usePlanningObjective(accountId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.planningObjective(accountId ?? ""),
    queryFn: () => repos.planningObjectives.getByAccount(accountId as string),
    enabled: Boolean(accountId),
  });
}

export function useSavePlanningObjective() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlanningObjectiveInput) => repos.planningObjectives.save(input),
    onSuccess: (objective) =>
      qc.invalidateQueries({ queryKey: queryKeys.planningObjective(objective.accountId) }),
  });
}

export function useDeletePlanningObjective() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => repos.planningObjectives.delete(accountId),
    onSuccess: (_data, accountId) =>
      qc.invalidateQueries({ queryKey: queryKeys.planningObjective(accountId) }),
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

export function useChessStatsDay(date: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ["chessStats", "day", date],
    queryFn: () => repos.chessStats.getByDate(date),
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

/* -------------------------- Journal entries -------------------------- */

export function useJournalEntries() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.journalEntries, queryFn: () => repos.journalEntries.list() });
}

export function useCreateJournalEntry() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: JournalEntryInput) => repos.journalEntries.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journalEntries }),
  });
}

export function useUpdateJournalEntry() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<JournalEntryInput> }) =>
      repos.journalEntries.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journalEntries }),
  });
}

export function useDeleteJournalEntry() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.journalEntries.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journalEntries }),
  });
}

/* --------------------------- Trading rules ---------------------------- */

export function useTradingRules() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.tradingRules, queryFn: () => repos.tradingRules.list() });
}

export function useCreateTradingRule() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TradingRuleInput) => repos.tradingRules.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tradingRules }),
  });
}

export function useDeleteTradingRule() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.tradingRules.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tradingRules }),
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
