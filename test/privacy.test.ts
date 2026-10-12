import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPrivacy, warningCount } from "../src/gate/privacy.ts";
import type { SwapRecord } from "../src/gate/store.ts";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const RECIPIENT = "0x7a3fC0e1b9D24A6c58E0f3B1d9a7C4e2F6b8D015";
const OTHER = "0x57f31ad4b64095347F87eDB1675566DAfF5EC886";

/** A swap of this browser, [hoursAgo] hours ago, of [xmrAmount] XMR into [payoutAddress]. */
function swap(hoursAgo: number, xmrAmount: number, payoutAddress: string): SwapRecord {
  return {
    id: `swap${hoursAgo}`,
    readToken: "token",
    asset: "USDG",
    rate: "fixed",
    xmrAmount,
    amount: xmrAmount * 300,
    depositAddress: "4deposit",
    payoutAddress,
    refundAddress: null,
    createdAt: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
    validUntil: null,
    status: "finished",
    depositHash: null,
    payoutHash: null,
    refundHash: null,
    refundAmount: null,
    updatedAt: null,
    checkedAt: null,
  };
}

const freshScan = { address: RECIPIENT, transfers: 0, firstSeenAt: null, lastSeenAt: null };

test("passes a fresh address, a new amount, and a day since the last swap", () => {
  const report = checkPrivacy({
    recipient: RECIPIENT,
    xmrAmount: 0.5,
    swaps: [swap(30, 0.7, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(warningCount(report), 0);
  assert.equal(report.addressChecked, true);
});

test("warns about an address that received a swap here, and about one with a public history", () => {
  const used = checkPrivacy({
    recipient: RECIPIENT,
    xmrAmount: 0.5,
    swaps: [swap(30, 0.7, RECIPIENT)],
    scan: freshScan,
    now: NOW,
  });
  assert.match(used.address?.title ?? "", /In 1 of your swaps/);
  const history = checkPrivacy({
    recipient: RECIPIENT,
    xmrAmount: 0.5,
    swaps: [],
    scan: { ...freshScan, transfers: 3 },
    now: NOW,
  });
  assert.match(history.address?.title ?? "", /3 transfers/);
  // The letters of an address count in any case.
  const cased = checkPrivacy({
    recipient: RECIPIENT.toLowerCase(),
    xmrAmount: 0.5,
    swaps: [swap(30, 0.7, RECIPIENT)],
    scan: null,
    now: NOW,
  });
  assert.notEqual(cased.address, null);
  assert.equal(cased.addressChecked, false, "without a scan the rule of the address lacks its reading");
});

test("warns about an amount within two percent of a swap of the last week", () => {
  const close = checkPrivacy({
    recipient: RECIPIENT,
    xmrAmount: 0.505,
    swaps: [swap(48, 0.5, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.match(close.amount?.title ?? "", /Matches your swap/);
  const apart = checkPrivacy({
    recipient: RECIPIENT,
    xmrAmount: 0.52,
    swaps: [swap(48, 0.5, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(apart.amount, null);
  const old = checkPrivacy({
    recipient: RECIPIENT,
    xmrAmount: 0.5,
    swaps: [swap(24 * 8, 0.5, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(old.amount, null);
});

test("warns about a swap of the last day", () => {
  const recent = checkPrivacy({ recipient: null, xmrAmount: null, swaps: [swap(2, 0.9, OTHER)], scan: null, now: NOW });
  assert.match(recent.timing?.title ?? "", /2 hours ago/);
  assert.equal(recent.address, null, "no address, no rule of the address");
  assert.equal(recent.amount, null, "no amount, no rule of the amount");
  assert.equal(recent.addressChecked, true);
  assert.equal(warningCount(recent), 1);
});
