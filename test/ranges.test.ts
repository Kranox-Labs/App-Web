import assert from "node:assert/strict";
import { test } from "node:test";
import { widestRange } from "../src/gate/ranges.ts";

test("takes the least minimum and the greatest maximum over the providers", () => {
  assert.deepEqual(
    widestRange([
      { provider: "changenow", chain: "XMR", asset: "USDG", rate: "fixed", minFrom: 0.0242645, maxFrom: 1.5001532 },
      {
        provider: "simpleswap",
        chain: "XMR",
        asset: "USDG",
        rate: "fixed",
        minFrom: 0.0246892632,
        maxFrom: 1.495230709567,
      },
    ]),
    { minFrom: 0.0242645, maxFrom: 1.5001532 },
  );
});

test("has no top once one provider has none, and no range without a provider", () => {
  assert.deepEqual(
    widestRange([
      { provider: "changenow", chain: "XMR", asset: "ETH", rate: "floating", minFrom: 0.0121, maxFrom: 2 },
      { provider: "simpleswap", chain: "XMR", asset: "ETH", rate: "floating", minFrom: 0.0143601108, maxFrom: null },
    ]),
    { minFrom: 0.0121, maxFrom: null },
  );
  assert.equal(widestRange([]), null);
});
