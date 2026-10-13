import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPrivacy, warningCount } from "../src/gate/privacy.ts";
import type { SwapRecord } from "../src/gate/store.ts";
import type { ChainAsset, Direction, FromChain } from "../src/gate/types.ts";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const RECIPIENT = "0x7a3fC0e1b9D24A6c58E0f3B1d9a7C4e2F6b8D015";
const OTHER = "0x57f31ad4b64095347F87eDB1675566DAfF5EC886";

/** A swap of this browser, [hoursAgo] hours ago, of [fromAmount] of the coin of [chain] into [payoutAddress]. */
function swap(hoursAgo: number, fromAmount: number, payoutAddress: string, chain: FromChain = "XMR"): SwapRecord {
  return {
    id: `swap${hoursAgo}`,
    direction: "in",
    provider: "changenow",
    readToken: "token",
    asset: "USDG",
    rate: "fixed",
    chain,
    fromAmount,
    amount: fromAmount * 300,
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
    depositSentAt: null,
  };
}

const freshScan = { address: RECIPIENT, transfers: 0, firstSeenAt: null, lastSeenAt: null };

test("passes a fresh address, a new amount, and a day since the last swap", () => {
  const report = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "in", chain: "XMR", value: 0.5 },
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
    amount: { direction: "in", chain: "XMR", value: 0.5 },
    swaps: [swap(30, 0.7, RECIPIENT)],
    scan: freshScan,
    now: NOW,
  });
  assert.match(used.address?.title ?? "", /In 1 of your swaps/);
  const history = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "in", chain: "XMR", value: 0.5 },
    swaps: [],
    scan: { ...freshScan, transfers: 3 },
    now: NOW,
  });
  assert.match(history.address?.title ?? "", /3 transfers/);
  // The letters of an address count in any case.
  const cased = checkPrivacy({
    recipient: RECIPIENT.toLowerCase(),
    amount: { direction: "in", chain: "XMR", value: 0.5 },
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
    amount: { direction: "in", chain: "XMR", value: 0.505 },
    swaps: [swap(48, 0.5, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.match(close.amount?.title ?? "", /Matches your swap/);
  const apart = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "in", chain: "XMR", value: 0.52 },
    swaps: [swap(48, 0.5, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(apart.amount, null);
  const old = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "in", chain: "XMR", value: 0.5 },
    swaps: [swap(24 * 8, 0.5, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(old.amount, null);
});

test("warns about a swap of the last day", () => {
  const recent = checkPrivacy({
    recipient: null,
    amount: null,
    swaps: [swap(2, 0.9, OTHER)],
    scan: null,
    now: NOW,
  });
  assert.match(recent.timing?.title ?? "", /2 hours ago/);
  assert.equal(recent.address, null, "no address, no rule of the address");
  assert.equal(recent.amount, null, "no amount, no rule of the amount");
  assert.equal(recent.addressChecked, true);
  assert.equal(warningCount(recent), 1);
});

test("pairs an amount with the swaps of the same coin only", () => {
  const strk = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "in", chain: "STRK", value: 0.5 },
    swaps: [swap(48, 0.5, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(strk.amount, null, "half an XMR says nothing about half a STRK");
  const same = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "in", chain: "STRK", value: 1000 },
    swaps: [swap(48, 1010, OTHER, "STRK")],
    scan: freshScan,
    now: NOW,
  });
  assert.match(same.amount?.title ?? "", /Matches your swap/);
});

/** A swap out of this browser, [hoursAgo] hours ago, of [fromAmount] of [asset] from the wallet at [sender] into XMR. */
function swapOut(hoursAgo: number, fromAmount: number, sender: string, asset: ChainAsset = "USDG"): SwapRecord {
  return {
    ...swap(hoursAgo, fromAmount, "4payout"),
    id: `out${hoursAgo}`,
    direction: "out",
    asset,
    rate: "floating",
    amount: fromAmount / 300,
    depositAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    refundAddress: sender,
  };
}

test("reads the wallet that sent a swap out as its address on Robinhood Chain, in or out", () => {
  const sentBefore = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "out", asset: "USDG", value: 50 },
    swaps: [swapOut(30, 70, RECIPIENT)],
    scan: freshScan,
    now: NOW,
  });
  assert.match(sentBefore.address?.title ?? "", /In 1 of your swaps/);
  const receivedBefore = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "out", asset: "USDG", value: 50 },
    swaps: [swap(30, 0.7, RECIPIENT)],
    scan: freshScan,
    now: NOW,
  });
  assert.match(receivedBefore.address?.title ?? "", /In 1 of your swaps/, "a swap in to this address counts too");
  const other = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "out", asset: "USDG", value: 50 },
    swaps: [swapOut(30, 70, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(other.address, null);
});

test("pairs an amount out with the swaps out of the same coin on Robinhood Chain only", () => {
  const direction: Direction = "out";
  const same = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction, asset: "USDG", value: 50.5 },
    swaps: [swapOut(48, 50, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.match(same.amount?.title ?? "", /Matches your swap/);
  const otherCoin = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction, asset: "ETH", value: 50 },
    swaps: [swapOut(48, 50, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(otherCoin.amount, null, "50 ETH says nothing about 50 USDG");
  const otherWay = checkPrivacy({
    recipient: RECIPIENT,
    amount: { direction: "in", chain: "XMR", value: 50 },
    swaps: [swapOut(48, 50, OTHER)],
    scan: freshScan,
    now: NOW,
  });
  assert.equal(otherWay.amount, null, "50 USDG out says nothing about 50 XMR in");
  const anyWay = checkPrivacy({ recipient: null, amount: null, swaps: [swapOut(2, 50, OTHER)], scan: null, now: NOW });
  assert.match(anyWay.timing?.title ?? "", /2 hours ago/, "a swap out counts for the timing like one in");
});
