import type { PayQuote } from "./types.ts";

/** What a quote must agree with: the draft that asked for it. */
export interface QuoteRequest {
  provider: string | null;
  asset: string;
  rate: string;
  xmrAmount: string;
}

/**
 * Whether [quote] answers [request]: the same provider, coin, rate, and amount of XMR. A page takes a quote from a
 * cache or a draft only when it does, so that a quote of one rate never stands for another (D-01 and D-08 of the scan
 * of 12 Oct 2026).
 */
export function quoteMatches(quote: PayQuote, request: QuoteRequest): boolean {
  return (
    quote.provider === request.provider &&
    quote.asset === request.asset &&
    quote.rate === request.rate &&
    quote.xmrAmount === request.xmrAmount
  );
}

/** Whether the fixed rate of [quote] still holds at [now]; a quote without a time always does. */
export function quoteHolds(quote: PayQuote, now: number): boolean {
  return quote.validUntil === null || Date.parse(quote.validUntil) > now;
}
