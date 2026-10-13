import changenow from "../assets/providers/changenow.svg";
import oneclick from "../assets/providers/near-intents.png";
import simpleswap from "../assets/providers/simpleswap.png";
import type { ProviderId } from "../gate/types.ts";

/**
 * The official mark of each provider: the icon of the logo pack of ChangeNOW, the icon of the site of SimpleSwap (its
 * favicon set, 192 pixels; the site offers no SVG), and the icon of the site of NEAR Intents (its apple-touch-icon,
 * 180 pixels, from near-intents.org on 13 Oct 2026). The marks belong to their companies.
 */
export const PROVIDER_LOGOS: Record<ProviderId, string> = { changenow, simpleswap, oneclick };
