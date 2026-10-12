import assert from "node:assert/strict";
import { test } from "node:test";
import { widestRange } from "../src/gate/ranges.ts";

test("takes the least minimum and the greatest maximum over the providers", () => {
  assert.deepEqual(
    widestRange([
      { provider: "changenow", asset: "USDG", rate: "fixed", minXmr: 0.0242645, maxXmr: 1.5001532 },
      { provider: "simpleswap", asset: "USDG", rate: "fixed", minXmr: 0.0246892632, maxXmr: 1.495230709567 },
    ]),
    { minXmr: 0.0242645, maxXmr: 1.5001532 },
  );
});

test("has no top once one provider has none, and no range without a provider", () => {
  assert.deepEqual(
    widestRange([
      { provider: "changenow", asset: "ETH", rate: "floating", minXmr: 0.0121, maxXmr: 2 },
      { provider: "simpleswap", asset: "ETH", rate: "floating", minXmr: 0.0143601108, maxXmr: null },
    ]),
    { minXmr: 0.0121, maxXmr: null },
  );
  assert.equal(widestRange([]), null);
});
