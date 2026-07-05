# CLAUDE.md

Guidance for working in this repo.

## What this is

Offline-first **Tauri v2 + React/TS** desktop trading journal. Single-user,
local SQLite. Architected so it can go online later without a rewrite.

## Commands

- `pnpm dev` — browser dev (in-memory adapter, seeded demo data). No Rust.
- `pnpm tauri:dev` — full desktop app with SQLite.
- `pnpm tauri:build` — distributable installer.
- Typecheck: run `node node_modules/typescript/bin/tsc --noEmit`
  (prefer this over `pnpm typecheck` — pnpm's pre-script dep check can fail on
  build-script approvals). Build-script approvals live in `pnpm-workspace.yaml`.

## Architecture rules (do not break these)

1. **UI depends only on repository interfaces** (`src/data/repositories/types.ts`),
   never on SQLite or `@tauri-apps/*` directly. Access data via the hooks in
   `src/data/hooks.ts`.
2. **`src/domain/` is pure** — models (Zod) + business logic only. No imports from
   `data/`, `components/`, or `@tauri-apps/*`. All stats live in
   `domain/services/`.
3. **Two storage adapters** implement `Repositories`: `data/local` (SQLite) and
   `data/memory`. Keep them in sync when adding repository methods.
   `data/remote` is the stubbed future online path.
4. Adding an entity = model+schema in `domain/models/`, a migration in
   `data/local/schema.ts`, methods on both adapters, and hooks in `data/hooks.ts`.

## Conventions

- **Percentages are 0–100 numbers** everywhere (72 means 72%), formatted via
  `lib/format.ts`.
- Money is stored in the account's currency; format with `formatCurrency`.
- Zod schemas apply defaults and are the single source of truth for shapes; the
  adapters `.parse()` rows back into domain models.
- Design tokens are CSS variables in `src/styles/theme.css`; Tailwind maps them.
  Both dark and light token sets exist; `ThemeManager` applies the setting.
- Charts read token colors via `useChartTokens()`. Recharts' `Tooltip` `content`
  is typed `any` at that one boundary (its generics reject narrowed callbacks).
- IDs are `crypto.randomUUID()` via `lib/utils.ts#createId`.

## Tauri specifics

- SQLite DB: `sqlite:trading-journal.db` (app data dir). Schema/migrations in
  `src/data/local/schema.ts`, runner in `db.ts`.
- Screenshots are files under `<AppLocalData>/images`; displayed via
  `convertFileSrc` (asset protocol, scoped in `tauri.conf.json`).
- Rust plugins registered in `src-tauri/src/lib.rs`; permissions in
  `src-tauri/capabilities/default.json`.
