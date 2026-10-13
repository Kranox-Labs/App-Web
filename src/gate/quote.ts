import type { OutQuote, PayQuote } from "./types.ts";

/** What a quote must agree with: the draft that asked for it. */
export interface QuoteRequest {
  provider: string | null;
  chain: string | null;
  asset: string;
  rate: string;
  fromAmount: string;
}

/**
 * Whether [quote] answers [request]: the same provider, chain, coin, rate, and amount of the coin of origin. A page
 * takes a quote from a cache or a draft only when it does, so that a quote of one rate never stands for another (D-01
 * and D-08 of the scan of 12 Oct 2026).
 */
export function quoteMatches(quote: PayQuote, request: QuoteRequest): boolean {
  return (
    quote.provider === request.provider &&
    quote.chain === request.chain &&
    quote.asset === request.asset &&
    quote.rate === request.rate &&
    quote.fromAmount === request.fromAmount
  );
}

/** Whether the fixed rate of [quote] still holds at [now]; a quote without a time always does. */
export function quoteHolds(quote: PayQuote | OutQuote, now: number): boolean {
  return quote.validUntil === null || Date.parse(quote.validUntil) > now;
}

/** What a quote of the way out must agree with: the draft that asked for it. */
export interface OutQuoteRequest {
  provider: string | null;
  chain: string | null;
  asset: string;
  fromAmount: string;
}

/** Whether [quote] answers [request]: the same provider, chain, coin on Robinhood Chain, and amount of it. */
export function outQuoteMatches(quote: OutQuote, request: OutQuoteRequest): boolean {
  return (
    quote.provider === request.provider &&
    quote.chain === request.chain &&
    quote.asset === request.asset &&
    quote.fromAmount === request.fromAmount
  );
}
