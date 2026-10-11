import { COPY } from "../../copy.ts";
import { ROUTES, swapIdOf } from "../../router.ts";
import type { IconName } from "../widgets/Icon.tsx";

/** The pages of the sidebar, each with its icon, as the pages of the app. */
export const NAV: readonly { href: string; label: string; icon: IconName }[] = [
  { href: ROUTES.home, label: COPY.nav.home, icon: "home" },
  { href: ROUTES.receive, label: COPY.nav.receive, icon: "receive" },
  { href: ROUTES.activity, label: COPY.nav.activity, icon: "history" },
  { href: ROUTES.privacy, label: COPY.nav.privacy, icon: "privacy" },
];

/** Whether [path] belongs to the page of [href]: the steps of receive belong to receive, a swap to the activity. */
export function isActive(href: string, path: string): boolean {
  if (href === ROUTES.receive) return path === ROUTES.receive || path.startsWith(`${ROUTES.receive}/`);
  if (href === ROUTES.activity) return path === ROUTES.activity || swapIdOf(path) !== null;
  return path === href;
}
