import assert from "node:assert/strict";
import { test } from "node:test";
import { movedPath, ROUTES, swapIdOf } from "../src/router.ts";

// The id of a swap at ChangeNOW, one at SimpleSwap with the signs some ids carry, and the deposit address of a swap at
// NEAR Intents, which is its id.
const CHANGENOW_ID = "3a2360771439a3";
const SIMPLESWAP_ID = "pch7l7kd-1v2m_zh1";
const ONECLICK_ID = "0x0024ce193a40dd62118c8112d6f07a92c7edd4dc26fa672ca4800c5cf6a8e38e";

test("opens the page of a swap for every id the relay issues (D-18)", () => {
  for (const id of [CHANGENOW_ID, SIMPLESWAP_ID, ONECLICK_ID]) {
    assert.equal(swapIdOf(ROUTES.swap(id)), id, id);
  }
});

test("opens no page for an id of another form", () => {
  assert.equal(swapIdOf("/swaps/abc"), null, "too short");
  assert.equal(swapIdOf(`/swaps/${"a".repeat(129)}`), null, "too long");
  assert.equal(swapIdOf("/swaps/3a2360771439a3/more"), null, "a path below the swap");
  assert.equal(swapIdOf("/swaps/3a23607%2F1439a3"), null, "a sign the relay never issues");
  assert.equal(swapIdOf("/swaps/"), null);
  assert.equal(swapIdOf("/activity"), null);
});

test("opens the way in for the old paths of receive, and nothing else (13 Oct 2026)", () => {
  assert.equal(movedPath("/receive"), ROUTES.in);
  assert.equal(movedPath("/receive/amount"), ROUTES.inAmount);
  assert.equal(movedPath("/receive/transaction"), ROUTES.inTransaction);
  assert.equal(movedPath("/in"), null);
  assert.equal(movedPath("/out"), null);
  assert.equal(movedPath("/received"), null);
  assert.equal(movedPath("/"), null);
});
