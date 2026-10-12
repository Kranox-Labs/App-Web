import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteHolds, quoteMatches } from "../src/gate/quote.ts";
import type { PayQuote } from "../src/gate/types.ts";

const quote: PayQuote = {
  provider: "changenow",
  asset: "USDG",
  rate: "fixed",
  xmrAmount: "0.1",
  amount: 48.35,
  rateId: "rate",
  validUntil: "2026-10-12T12:00:00.000Z",
  warning: null,
  depositFee: null,
  withdrawalFee: null,
  speedMinutes: null,
  limit: null,
  minXmr: null,
  maxXmr: null,
};

test("a quote answers the draft with the same provider, coin, rate, and amount only", () => {
  const draft = { provider: "changenow", asset: "USDG", rate: "fixed", xmrAmount: "0.1" };
  assert.equal(quoteMatches(quote, draft), true);
  assert.equal(quoteMatches(quote, { ...draft, rate: "floating" }), false);
  assert.equal(quoteMatches(quote, { ...draft, provider: "simpleswap" }), false);
  assert.equal(quoteMatches(quote, { ...draft, asset: "ETH" }), false);
  assert.equal(quoteMatches(quote, { ...draft, xmrAmount: "0.10" }), false);
  assert.equal(quoteMatches(quote, { ...draft, provider: null }), false);
});

test("a fixed rate holds until its time, and a floating one always", () => {
  assert.equal(quoteHolds(quote, Date.parse("2026-10-12T11:59:59.000Z")), true);
  assert.equal(quoteHolds(quote, Date.parse("2026-10-12T12:00:00.000Z")), false);
  assert.equal(quoteHolds({ ...quote, validUntil: null }, Date.parse("2030-01-01T00:00:00.000Z")), true);
});
