import type { Repositories } from "../repositories";

/**
 * Placeholder for the future ONLINE data layer.
 *
 * When/if the app is deployed online, implement each repository here against a
 * REST or tRPC backend (fetch calls returning the same domain models). Because
 * these satisfy the identical `Repositories` interface, switching is a one-line
 * change in `createRepositories()` — no UI, domain, or feature code changes.
 *
 * Intentionally not implemented yet; documented so the path is obvious.
 */
export function createRemoteRepositories(_baseUrl: string): Repositories {
  throw new Error(
    "Remote (online) repositories are not implemented yet. " +
      "Implement HTTP-backed adapters here to deploy the app online.",
  );
}
