import assert from "node:assert/strict";
import { test } from "node:test";
import { decimalsOf, isXmrAmount } from "../src/gate/amount.ts";

test("counts the decimals of an amount", () => {
  assert.equal(decimalsOf("1"), 0);
  assert.equal(decimalsOf("0.5"), 1);
  assert.equal(decimalsOf("0.12345678"), 8);
});

test("takes an amount of XMR with up to eight decimals, above zero", () => {
  assert.equal(isXmrAmount("0.5"), true);
  assert.equal(isXmrAmount("0.12345678"), true);
  assert.equal(isXmrAmount("12"), true);
  assert.equal(isXmrAmount("0.123456789"), false, "nine decimals would round on the page");
  assert.equal(isXmrAmount("0"), false);
  assert.equal(isXmrAmount("0.0"), false);
  assert.equal(isXmrAmount(""), false);
  assert.equal(isXmrAmount("1e3"), false);
  assert.equal(isXmrAmount("-1"), false);
  assert.equal(isXmrAmount("1,5"), false);
});
