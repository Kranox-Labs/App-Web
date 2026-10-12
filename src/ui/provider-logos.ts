import changenow from "../assets/providers/changenow.svg";
import simpleswap from "../assets/providers/simpleswap.png";
import type { ProviderId } from "../gate/types.ts";

/**
 * The official mark of each provider: the icon of the logo pack of ChangeNOW, and the icon of the site of SimpleSwap
 * (its favicon set, 192 pixels; the site offers no SVG). The marks belong to their companies.
 */
export const PROVIDER_LOGOS: Record<ProviderId, string> = { changenow, simpleswap };
