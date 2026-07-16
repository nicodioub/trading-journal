# Henledger

**The trading journal that catches traders lying to themselves.**

Every trading journal logs *what* a trader did. Henledger is built around a
different question: does what they *did* match what they *said* they'd do?
It pairs daily psychological check-ins with actual trade execution and
surfaces the contradictions — the trader who journaled "I'll wait for my
setup" and then entered a trade nine minutes later, the pattern of losses
that only shows up after a low-readiness morning. That's evidence a trader
(or a coach, or a prop firm) can act on, not just another equity curve.

## What makes it different

- **Behavior Engine, not a mood tracker.** Most journaling apps collect
  self-reported feelings and stop there. Henledger's Behavior Engine
  (`domain/services/behaviorEngine.ts`) runs a rolling 7-day window that
  cross-references declared readiness, journaled first-thoughts, and actual
  trades — flagging when a trader violated their own stated rules and how
  fast they did it (see `minutesFromCheckInToFirstTrade`). It's identity
  coaching backed by evidence, not vibes.
- **Discipline is measured, not just recorded.** Readiness rules, a rules
  engine, and psychology scoring turn "was I disciplined today" from a
  journal entry into a quantified, auditable signal over time.
- **Privacy by architecture, not by policy.** There's no backend to breach
  because there isn't one — every install is a private, local SQLite
  database. For a product that stores a trader's psychological
  self-assessments alongside their P&L, that's not a nice-to-have.
- **Built to go online without a rewrite.** The UI only ever talks to
  repository interfaces (`TradeRepository`, `AccountRepository`, …), never
  to SQLite directly. Standing up a hosted, multi-tenant version later is
  "implement one more adapter," not "rebuild the app" — see Architecture
  below.
- **One founder, full-stack execution.** Domain modeling, UI, native
  desktop packaging, and an AI-driven behavioral analysis pipeline, shipped
  as a working desktop app — not a slide deck.

Not a SaaS today by design. Every install is a private, local app with its
own database. It can be shared by handing someone the installer, and it's
architected so it _could_ be deployed online later without rewriting the app.

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

## Installing

`pnpm tauri:build` produces a native installer under
`src-tauri/target/release/bundle/` (`msi/` and `nsis/` on Windows, `dmg/` on
macOS, `deb/`/`appimage/` on Linux). To install:

1. Run `pnpm tauri:build`.
2. Open the bundle folder for your platform and run the installer
   (e.g. the `.msi` or `.exe` on Windows).
3. On Windows, the installer isn't code-signed, so SmartScreen may warn about
   an unrecognized app — choose "More info" → "Run anyway" to proceed.
4. Windows needs the WebView2 runtime, which ships with Windows 10/11 by
   default; if missing, Tauri's installer prompts to fetch it automatically.

The app is fully offline and stores its SQLite database and trade
screenshots locally, so no account or network setup is required after
install.

## MVP scope

Implemented: Dashboard (daily mental check + chess cognitive thermometer +
widgets), multiple accounts with per-account dashboards, create trade with
screenshot upload, trade history with filters, trade detail with notes,
statistics, settings.

Prepared but not implemented (see roadmap in `docs/ROADMAP.md`): AI trade
analysis, reports, and the online/remote data layer.
