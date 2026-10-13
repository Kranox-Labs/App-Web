import assert from "node:assert/strict";
import { test } from "node:test";
import { isRecord, upgradedRecord } from "../src/gate/store.ts";

/** A record as this build writes it. */
const RECORD = {
  id: "3a2360771439a3",
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
  // Before 12 Oct 2026: no provider. Before 13 Oct 2026: the amount as xmrAmount, and no chain.
  const oldest = { ...without(RECORD, "provider", "chain", "fromAmount"), xmrAmount: 0.1 };
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
