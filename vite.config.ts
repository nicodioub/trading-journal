import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Tauri expects a fixed dev port. See https://tauri.app/start/frontend/vite/
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Prevent Vite from obscuring Rust errors during `tauri dev`.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      // Tauri recompiles its own sources; don't let Vite watch them.
      ignored: ["**/src-tauri/**"],
    },
  },

  // Only VITE_ and TAURI_ prefixed env vars are exposed to the client.
  envPrefix: ["VITE_", "TAURI_"],
}));
