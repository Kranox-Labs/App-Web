import { SITE_ORIGIN } from "../../config.ts";
import { COPY } from "../../copy.ts";
import { ROUTES, swapIdOf } from "../../router.ts";
import type { IconName } from "../widgets/Icon.tsx";

/** The pages of the sidebar, each with its icon, as the pages of the app. */
export const NAV: readonly { href: string; label: string; icon: IconName }[] = [
  { href: ROUTES.home, label: COPY.nav.home, icon: "home" },
  { href: ROUTES.in, label: COPY.nav.in, icon: "receive" },
  { href: ROUTES.out, label: COPY.nav.out, icon: "arrowOutward" },
  { href: ROUTES.activity, label: COPY.nav.activity, icon: "history" },
  { href: ROUTES.privacy, label: COPY.nav.privacy, icon: "privacy" },
];

/** The legal pages of the site, at the foot of the sidebar. They open on the site, in a new tab. */
export const LEGAL_LINKS: readonly { href: string; label: string }[] = [
  { href: `${SITE_ORIGIN}/privacy`, label: COPY.legal.privacy },
  { href: `${SITE_ORIGIN}/disclosures`, label: COPY.legal.disclosures },
  { href: `${SITE_ORIGIN}/terms`, label: COPY.legal.terms },
];

/** Whether [path] belongs to the page of [href]: the steps of in and out belong to them, a swap to the activity. */
export function isActive(href: string, path: string): boolean {
  if (href === ROUTES.in) return path === ROUTES.in || path.startsWith(`${ROUTES.in}/`);
  if (href === ROUTES.out) return path === ROUTES.out || path.startsWith(`${ROUTES.out}/`);
  if (href === ROUTES.activity) return path === ROUTES.activity || swapIdOf(path) !== null;
  return path === href;
}
