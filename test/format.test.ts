import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAsset, formatBalance, formatTimeLeft, formatXmr } from "../src/format.ts";

test("writes amounts of XMR with up to eight decimals and no trailing zeros", () => {
  assert.equal(formatXmr(0.5), "0.5");
  assert.equal(formatXmr(1), "1");
  assert.equal(formatXmr(0.01186790001), "0.0118679");
  assert.equal(formatXmr(1286.4219), "1286.4219");
});

test("writes amounts of a coin of Robinhood Chain with the decimals of the coin", () => {
  assert.equal(formatAsset(157.25, "USDG"), "157.25");
  assert.equal(formatAsset(157.2, "USDG"), "157.2");
  assert.equal(formatAsset(0.0712, "ETH"), "0.0712");
  assert.equal(formatAsset(0.00031234567, "ETH"), "0.000312");
});

test("writes a balance with all the decimals of the coin", () => {
  assert.equal(formatBalance(550.5, "USDG"), "550.50");
  assert.equal(formatBalance(0.1, "ETH"), "0.1000");
});

test("counts the time left down to the second, and stops at zero", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  assert.equal(formatTimeLeft("2026-10-11T12:09:59Z", now), "9:59");
  assert.equal(formatTimeLeft("2026-10-11T12:00:05Z", now), "0:05");
  assert.equal(formatTimeLeft("2026-10-11T12:00:00Z", now), null);
  assert.equal(formatTimeLeft("2026-10-11T11:00:00Z", now), null);
});
