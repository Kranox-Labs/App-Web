import "@fontsource-variable/archivo/wdth.css";
import "./styles/tokens.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { loadConfig } from "./config.ts";

const root = document.getElementById("root");
if (root === null) throw new Error("The page has no root element.");

// The settings come first: a build without them stops here, with the reason on the page, before any page loads.
try {
  loadConfig();
} catch (error) {
  root.replaceChildren(setupFailure(error));
  throw error;
}

const { App } = await import("./app.tsx");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

function setupFailure(error: unknown): HTMLElement {
  const line = document.createElement("p");
  line.className = "setup-failure t-body-regular";
  line.textContent = error instanceof Error ? error.message : String(error);
  return line;
}
