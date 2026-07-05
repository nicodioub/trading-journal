import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createRepositories } from "./factory";
import type { Repositories } from "./repositories";

const RepositoriesContext = createContext<Repositories | null>(null);

/** Provides the active repositories bundle to the whole component tree. */
export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repositories = useMemo(() => createRepositories(), []);
  return (
    <RepositoriesContext.Provider value={repositories}>
      {children}
    </RepositoriesContext.Provider>
  );
}

/** Access the repositories. Components depend only on this, never on storage. */
export function useRepositories(): Repositories {
  const ctx = useContext(RepositoriesContext);
  if (!ctx) {
    throw new Error("useRepositories must be used within <RepositoryProvider>");
  }
  return ctx;
}
