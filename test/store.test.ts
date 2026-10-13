import assert from "node:assert/strict";
import { test } from "node:test";
import { isRecord, upgradedRecord, withDeposit } from "../src/gate/store.ts";

/** A record as this build writes it. */
const RECORD = {
  id: "3a2360771439a3",
  direction: "in",
  provider: "changenow",
  readToken: "token",
  chain: "XMR",
  asset: "USDG",
  rate: "fixed",
  fromAmount: 0.1,
  amount: 48.35,
  depositAddress: "4deposit",
  payoutAddress: "0x7a3fc0e1b9d24a6c58e0f3b1d9a7c4e2f6b8d015",
  refundAddress: null,
  createdAt: "2026-10-12T11:50:00.000Z",
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

test("takes a record of this build as it is", () => {
  assert.equal(isRecord(RECORD), true);
  assert.deepEqual(upgradedRecord(RECORD), RECORD);
});

/** [record] without the fields [keys], as an older build wrote it. */
function without(record: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

test("reads the records of the older builds, each change on its own (D-04, D-19)", () => {
  // Before 12 Oct 2026: no provider. Before 13 Oct 2026: the amount as xmrAmount, no chain, no direction, and no
  // time of a deposit sent.
  const oldest = {
    ...without(RECORD, "provider", "chain", "fromAmount", "direction", "depositSentAt"),
    xmrAmount: 0.1,
  };
  const upgraded = upgradedRecord(oldest);
  assert.equal(isRecord(upgraded), true);
  assert.deepEqual(upgraded, RECORD);
  // A record that renamed its amount before it named its chain still reads.
  assert.deepEqual(upgradedRecord(without(RECORD, "chain")), RECORD);
  // A record with a chain and the old name of the amount reads too.
  assert.deepEqual(upgradedRecord({ ...without(RECORD, "fromAmount"), xmrAmount: 0.1 }), RECORD);
});

test("keeps out a record of another form or of a state the pages do not know", () => {
  assert.equal(isRecord({ ...RECORD, chain: "BTC" }), false);
  assert.equal(isRecord({ ...RECORD, provider: "kraken" }), false);
  assert.equal(isRecord({ ...RECORD, status: "paused" }), false);
  assert.equal(isRecord({ ...RECORD, fromAmount: "0.1" }), false);
  assert.equal(isRecord(null), false);
  assert.equal(isRecord("record"), false);
  assert.equal(upgradedRecord("record"), "record");
});

test("reads a record from before the way out as a swap in, and keeps a swap out as one (13 Oct 2026)", () => {
  const upgraded = upgradedRecord(without(RECORD, "direction"));
  assert.equal(isRecord(upgraded), true);
  assert.deepEqual(upgraded, { ...RECORD, direction: "in" });
  const out = {
    ...RECORD,
    direction: "out",
    asset: "USDG",
    rate: "floating",
    fromAmount: 50,
    amount: 0.0836667,
    depositAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    payoutAddress: "883z7Wmbd5nhoH6xQxLzgniNhN6jqdvxFiza4rMdErWA1XW1TCL1tqrCwWFwhG1QkuL17RRHP45J33y6u4sH8Rfa7kryRza",
    refundAddress: "0x7a3fc0e1b9d24a6c58e0f3b1d9a7c4e2f6b8d015",
  };
  assert.equal(isRecord(out), true);
  assert.deepEqual(upgradedRecord(out), out);
  assert.equal(isRecord({ ...RECORD, direction: "sideways" }), false);
  // The addresses on Robinhood Chain of a swap out feed the transfer the wallet signs: another form stays out (D-35).
  assert.equal(isRecord({ ...out, depositAddress: "4deposit" }), false);
  assert.equal(isRecord({ ...out, refundAddress: null }), false);
  assert.equal(isRecord({ ...out, depositSentAt: "2026-10-13T13:05:00.000Z" }), true);
  assert.equal(isRecord({ ...out, depositSentAt: 5 }), false);
  const sent = withDeposit(out as never, null, new Date("2026-10-13T13:05:00.000Z"));
  assert.equal(sent.depositHash, null, "a wallet that named no hash leaves the hash to the provider");
  assert.equal(sent.depositSentAt, "2026-10-13T13:05:00.000Z");
  assert.equal(withDeposit(out as never, "0xhash", new Date()).depositHash, "0xhash");
});
