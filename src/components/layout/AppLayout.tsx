import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

/** App frame: fixed sidebar + scrollable main content area. */
export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          {/* Feature pages are code-split; share one fallback while they load. */}
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
