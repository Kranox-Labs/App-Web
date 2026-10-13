import { useSyncExternalStore } from "react";

import { SWAP_ID_PATTERN } from "./chain.ts";

// The path of the page is the route. The app changes it without a load of the page, and the back button of the
// browser works as on any site. The host answers every path with index.html.
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function readPath(): string {
  return window.location.pathname;
}

/** The path of the page, which follows the address bar and the back button. */
export function useRoute(): string {
  return useSyncExternalStore(subscribe, readPath);
}

/** Opens [path] without a load of the page. With [replace], the current entry of the history takes the new path. */
export function navigate(path: string, replace = false): void {
  if (replace) {
    window.history.replaceState(null, "", path);
  } else {
    if (path === window.location.pathname) return;
    window.history.pushState(null, "", path);
  }
  window.scrollTo(0, 0);
  for (const listener of listeners) listener();
}

/**
 * The paths of the app. In, the way into Robinhood Chain, and out, the way back, each walk through five steps with a
 * path of their own, so that the back button steps back. Until 13 Oct 2026 the way in was "receive": the old paths
 * open the new ones.
 */
export const ROUTES = {
  home: "/",
  in: "/in",
  inAmount: "/in/amount",
  inProvider: "/in/provider",
  inPrivacy: "/in/privacy",
  inTransaction: "/in/transaction",
  out: "/out",
  outAmount: "/out/amount",
  outProvider: "/out/provider",
  outAddress: "/out/address",
  outSend: "/out/send",
  connect: "/connect",
  activity: "/activity",
  privacy: "/privacy",
  swap: (id: string) => `/swaps/${id}`,
} as const;

const SWAP_PATH = /^\/swaps\/([^/]+)$/;

/** The path of the way in that an old path of receive stands for, or null for any other path. */
export function movedPath(path: string): string | null {
  if (path === "/receive") return ROUTES.in;
  if (path.startsWith("/receive/")) return `${ROUTES.in}/${path.slice("/receive/".length)}`;
  return null;
}

/** The id of the swap that [path] opens, when it has the form of an id of the relay, or null for another page. */
export function swapIdOf(path: string): string | null {
  const id = SWAP_PATH.exec(path)?.[1] ?? null;
  return id !== null && SWAP_ID_PATTERN.test(id) ? id : null;
}
