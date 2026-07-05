import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { RepositoryProvider } from "@/data";
import { router } from "./router";
import { ThemeManager } from "./ThemeManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 15_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider>
        <ThemeManager />
        <RouterProvider router={router} />
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
