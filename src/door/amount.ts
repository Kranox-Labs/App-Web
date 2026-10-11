import { AMOUNT_PATTERN, XMR_DECIMALS } from "../chain.ts";

/** How many decimals [text] writes after its point. */
export function decimalsOf(text: string): number {
  const point = text.indexOf(".");
  return point < 0 ? 0 : text.length - point - 1;
}

/**
 * Whether [text] is an amount of XMR to send: digits and one point, above zero, with at most the decimals that the
 * app shows, so that the amount the exchanger takes is the amount the page tells the user to send.
 */
export function isXmrAmount(text: string): boolean {
  return AMOUNT_PATTERN.test(text) && Number(text) > 0 && decimalsOf(text) <= XMR_DECIMALS;
}
