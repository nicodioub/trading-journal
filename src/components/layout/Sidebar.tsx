import {
  BarChart3,
  Brain,
  History,
  LayoutDashboard,
  LifeBuoy,
  Newspaper,
  NotebookPen,
  PlusCircle,
  ScrollText,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Exact match so "/" doesn't stay active on every route. */
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/trades/new", label: "New Trade", icon: PlusCircle },
  { to: "/trades", label: "Trade History", icon: History, end: true },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/mind", label: "Mind", icon: Brain },
  { to: "/mentor", label: "Mentor", icon: LifeBuoy },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/rules", label: "Rules", icon: ScrollText },
  { to: "/planning", label: "Planning", icon: Target },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface/60">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Henledger</div>
          <div className="text-[11px] text-muted-foreground">
            Your trading companion
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 text-[11px] text-muted-foreground">
        v0.1.0 · Offline
      </div>
    </aside>
  );
}
