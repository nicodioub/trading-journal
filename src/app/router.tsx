import { lazy } from "react";
import { createHashRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout";

// Feature pages are lazy-loaded so the initial bundle only carries the shell.
// Each import maps the named export to `default` for React.lazy.
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const AccountsPage = lazy(() =>
  import("@/features/accounts/AccountsPage").then((m) => ({ default: m.AccountsPage })),
);
const AccountDetailPage = lazy(() =>
  import("@/features/accounts/AccountDetailPage").then((m) => ({ default: m.AccountDetailPage })),
);
const TradeHistoryPage = lazy(() =>
  import("@/features/trades/TradeHistoryPage").then((m) => ({ default: m.TradeHistoryPage })),
);
const NewTradePage = lazy(() =>
  import("@/features/trades/NewTradePage").then((m) => ({ default: m.NewTradePage })),
);
const EditTradePage = lazy(() =>
  import("@/features/trades/EditTradePage").then((m) => ({ default: m.EditTradePage })),
);
const TradeDetailPage = lazy(() =>
  import("@/features/trades/TradeDetailPage").then((m) => ({ default: m.TradeDetailPage })),
);
const StatisticsPage = lazy(() =>
  import("@/features/statistics/StatisticsPage").then((m) => ({ default: m.StatisticsPage })),
);
const MindPage = lazy(() =>
  import("@/features/mind/MindPage").then((m) => ({ default: m.MindPage })),
);
const JournalPage = lazy(() =>
  import("@/features/journal/JournalPage").then((m) => ({ default: m.JournalPage })),
);
const RulesPage = lazy(() =>
  import("@/features/rules/RulesPage").then((m) => ({ default: m.RulesPage })),
);
const PlanningPage = lazy(() =>
  import("@/features/planning/PlanningPage").then((m) => ({ default: m.PlanningPage })),
);
const NewsPage = lazy(() =>
  import("@/features/news/NewsPage").then((m) => ({ default: m.NewsPage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

/**
 * Hash-based routing — the safe choice for a packaged desktop app served from
 * a custom protocol (no server to handle deep-link paths).
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "accounts", element: <AccountsPage /> },
      { path: "accounts/:accountId", element: <AccountDetailPage /> },
      { path: "trades", element: <TradeHistoryPage /> },
      { path: "trades/new", element: <NewTradePage /> },
      { path: "trades/:tradeId", element: <TradeDetailPage /> },
      { path: "trades/:tradeId/edit", element: <EditTradePage /> },
      { path: "statistics", element: <StatisticsPage /> },
      { path: "mind", element: <MindPage /> },
      { path: "journal", element: <JournalPage /> },
      { path: "rules", element: <RulesPage /> },
      { path: "planning", element: <PlanningPage /> },
      { path: "news", element: <NewsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
