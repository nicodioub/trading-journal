# Roadmap (post-MVP)

The MVP is complete. Suggested next steps, ordered by leverage. Pick per
appetite — none of these require re-architecting.

## 1. Polish the MVP (small, high value)

- Edit an existing trade (reuse the New Trade form for edit mode).
- Data export/import (JSON backup) and a "danger zone" reset in Settings.
- Empty-state onboarding: create first account → log first trade.
- Bundle-size: code-split routes and Recharts (`manualChunks`).

## 2. Psychology ↔ performance correlation (the app's real thesis)

This is why the mental check + chess thermometer data is captured.

- A "Mind" page correlating mood/stress/energy/sleep and chess win-rate against
  trading PnL, win-rate and drawdown over time.
- Weekly review summarizing psychology vs results.
- All the data is already modeled (`MentalCheck`, `ChessStats`, `Trade`).

## 3. AI layer (architecture already prepared)

Each trade carries screenshots, context and psychology fields for this.

- Trade grading, repeated-mistake detection, rule-violation flags.
- Image analysis of chart screenshots.
- Journal summaries, weekly/monthly reports, personal coaching.
- Add an `AiAnalysis` model + a service that reads a `Trade` (+ images + notes)
  and writes results. Keep provider calls behind an interface like the
  repositories, so local/cloud inference are swappable.

## 4. Going online (only if genuinely needed)

- Implement `src/data/remote/remoteRepositories.ts` against a REST/tRPC backend
  and Postgres; flip the branch in `src/data/factory.ts`.
- Add auth + sync. The domain models and Zod schemas are reused as the API
  contract — no UI changes.

## 5. Quality/infra

- Unit tests for `domain/services` (pure functions — easy, high value).
- Component tests for the trade form.
- CI: typecheck + build on push.
