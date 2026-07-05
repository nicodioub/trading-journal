import { useEffect } from "react";
import { useSettings } from "@/data";

/**
 * Applies the persisted theme to the document root. Light/dark tokens both live
 * in theme.css, so this is all that's needed to switch the whole app.
 */
export function ThemeManager() {
  const { data: settings } = useSettings();
  const theme = settings?.theme ?? "dark";

  useEffect(() => {
    const root = document.documentElement;
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : theme;
    root.classList.remove("dark", "light");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  }, [theme]);

  return null;
}
