import React from "react";
import ReactDOM from "react-dom/client";

// Bundled variable fonts — keeps the app fully offline (no CDN dependency).
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import "./styles/globals.css";
import { App } from "./app/App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
