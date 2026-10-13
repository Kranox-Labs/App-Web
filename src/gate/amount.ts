import { AMOUNT_PATTERN } from "../chain.ts";
import { CHAIN_FACTS } from "./chains.ts";
import type { FromChain } from "./types.ts";

/** How many decimals [text] writes after its point. */
export function decimalsOf(text: string): number {
  const point = text.indexOf(".");
  return point < 0 ? 0 : text.length - point - 1;
}

/**
 * Whether [text] is an amount of the coin of [chain] to send: digits and one point, above zero, with at most the
 * decimals that the app shows for that coin, so that the amount the exchanger takes is the amount the page tells the
 * user to send.
 */
export function isFromAmount(text: string, chain: FromChain): boolean {
  return AMOUNT_PATTERN.test(text) && Number(text) > 0 && decimalsOf(text) <= CHAIN_FACTS[chain].decimals;
}
