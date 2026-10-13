import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatAsset,
  formatBalance,
  formatFrom,
  formatRate,
  formatRateOut,
  formatSend,
  formatTimeLeft,
} from "../src/format.ts";

test("writes an amount of the coin of a chain with the decimals of its form, and no trailing zeros", () => {
  assert.equal(formatFrom(0.5, "XMR"), "0.5");
  assert.equal(formatFrom(1, "XMR"), "1");
  assert.equal(formatFrom(0.01186790001, "XMR"), "0.0118679");
  assert.equal(formatFrom(1286.4219, "XMR"), "1286.4219");
  assert.equal(formatFrom(1000, "STRK"), "1000");
  assert.equal(formatFrom(18.8802983, "STRK"), "18.880298", "six decimals for STRK");
  assert.equal(formatFrom(0.1234567, "STRK"), "0.123457");
});

test("writes a rate below one with three significant digits, and above one with the decimals of the coin", () => {
  assert.equal(formatRate(0.087761, "USDG"), "0.0878");
  assert.equal(formatRate(0.000034397, "ETH"), "0.0000344");
  assert.equal(formatRate(312.4, "USDG"), "312.4");
  assert.equal(formatRate(0.5, "USDG"), "0.5");
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

test("writes an amount to send out with its six decimals, and a rate of the way out that says something", () => {
  assert.equal(formatSend(12.5, "USDG"), "12.5");
  assert.equal(formatSend(0.000001, "ETH"), "0.000001");
  assert.equal(formatSend(50, "USDG"), "50");
  assert.equal(formatRateOut(0.0016733, "XMR"), "0.00167");
  assert.equal(formatRateOut(27.3505908, "STRK"), "27.350591");
});
