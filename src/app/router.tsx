import { createHashRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { AccountDetailPage } from "@/features/accounts/AccountDetailPage";
import { AccountsPage } from "@/features/accounts/AccountsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { StatisticsPage } from "@/features/statistics/StatisticsPage";
import { NewTradePage } from "@/features/trades/NewTradePage";
import { TradeDetailPage } from "@/features/trades/TradeDetailPage";
import { TradeHistoryPage } from "@/features/trades/TradeHistoryPage";

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
      { path: "statistics", element: <StatisticsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
