import { useSyncExternalStore } from "react";

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

/** The paths of the app. Receive walks through five steps, each with a path, so that the back button steps back. */
export const ROUTES = {
  home: "/",
  receive: "/receive",
  receiveAmount: "/receive/amount",
  receiveProvider: "/receive/provider",
  receivePrivacy: "/receive/privacy",
  receiveTransaction: "/receive/transaction",
  connect: "/connect",
  activity: "/activity",
  privacy: "/privacy",
  swap: (id: string) => `/swaps/${id}`,
} as const;

const SWAP_PATH = /^\/swaps\/([0-9a-zA-Z]{6,64})$/;

/** The id of the swap that [path] opens, or null for another page. */
export function swapIdOf(path: string): string | null {
  return SWAP_PATH.exec(path)?.[1] ?? null;
}
