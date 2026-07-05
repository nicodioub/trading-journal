# Trading Journal

A personal, offline-first desktop **trading journal** — built to be a trading
_companion_ focused on psychology, discipline, performance and account tracking.

Not a SaaS. Every install is a private, local app with its own database. It can
be shared by handing someone the installer, and it's architected so it _could_
be deployed online later without rewriting the app.

## Stack

| Layer        | Choice                                             |
| ------------ | -------------------------------------------------- |
| Desktop      | **Tauri v2** (Rust shell, tiny native installer)   |
| UI           | **React 18 + TypeScript + Vite**                   |
| Styling      | **Tailwind CSS** + Radix primitives, dark tokens   |
| Data (local) | **SQLite** via `tauri-plugin-sql`                  |
| Charts       | **Recharts**                                       |
| Server state | **TanStack Query**                                 |
| Validation   | **Zod** (schemas double as the future API contract)|

## Architecture

The codebase is layered so business logic and UI never touch storage directly.

```
src/
  domain/        Pure TS: models + Zod schemas + business logic (stats, RR,
                 expectancy, streaks). Knows nothing about storage or UI.
  data/          Repository INTERFACES + adapters:
      local/       SQLite (Tauri) — used in the desktop app
      memory/      in-memory + localStorage — used in `pnpm dev` (browser)
      remote/      stub for a future online/HTTP backend
    factory.ts   Picks the backend at runtime (Tauri → SQLite, else memory)
    hooks.ts     TanStack Query hooks the UI consumes
  components/    Reusable UI (design system) + charts
  features/      Screen modules: dashboard, accounts, trades, statistics, settings
  app/           Providers + router
```

**Why this matters for "online later":** the UI depends only on repository
interfaces (`TradeRepository`, `AccountRepository`, …). Going online means
implementing `data/remote/` against an API and flipping one line in
`data/factory.ts`. The domain models and all feature code stay unchanged.

Trade screenshots are stored as **files** under the app data directory
(`images/`), with only their paths kept in the database.

## Running

Prerequisites: Node 18+, pnpm, and (for the desktop build) the Rust toolchain +
[Tauri system deps](https://tauri.app/start/prerequisites/).

```bash
pnpm install

# Fast UI development in the browser (uses the in-memory adapter, seeded with
# demo data). No Rust needed.
pnpm dev

# Run the full desktop app (SQLite persistence, native window).
pnpm tauri:dev

# Build a distributable installer (.exe / .msi / .dmg / …).
pnpm tauri:build

# Type-check only
pnpm typecheck
```

> First `pnpm tauri:dev` compiles the Rust dependencies and can take several
> minutes. Subsequent runs are fast.

## MVP scope

Implemented: Dashboard (daily mental check + chess cognitive thermometer +
widgets), multiple accounts with per-account dashboards, create trade with
screenshot upload, trade history with filters, trade detail with notes,
statistics, settings.

Prepared but not implemented (see roadmap in `docs/ROADMAP.md`): AI trade
analysis, reports, and the online/remote data layer.
