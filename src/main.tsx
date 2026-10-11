import "@fontsource-variable/archivo/wdth.css";
import "./styles/tokens.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { loadConfig } from "./config.ts";
import { importSigningKey } from "./door/signature.ts";

const root = document.getElementById("root");
if (root === null) throw new Error("The page has no root element.");

// The settings come first: a build without them stops here, with the reason on the page, before any page loads.
try {
  const config = loadConfig();
  // A key of the relay that is no point of its curve fails here, with its reason, and not later in every call.
  if (!config.sampleData) await Promise.all(config.relaySigningKeys.map(importSigningKey));
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
