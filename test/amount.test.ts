import assert from "node:assert/strict";
import { test } from "node:test";
import { decimalsOf, isFromAmount } from "../src/gate/amount.ts";

test("counts the decimals of an amount", () => {
  assert.equal(decimalsOf("1"), 0);
  assert.equal(decimalsOf("0.5"), 1);
  assert.equal(decimalsOf("0.12345678"), 8);
});

test("takes an amount of XMR with up to eight decimals, above zero", () => {
  assert.equal(isFromAmount("0.5", "XMR"), true);
  assert.equal(isFromAmount("0.12345678", "XMR"), true);
  assert.equal(isFromAmount("12", "XMR"), true);
  assert.equal(isFromAmount("0.123456789", "XMR"), false, "nine decimals would round on the page");
  assert.equal(isFromAmount("0", "XMR"), false);
  assert.equal(isFromAmount("0.0", "XMR"), false);
  assert.equal(isFromAmount("", "XMR"), false);
  assert.equal(isFromAmount("1e3", "XMR"), false);
  assert.equal(isFromAmount("-1", "XMR"), false);
  assert.equal(isFromAmount("1,5", "XMR"), false);
});

test("takes an amount of STRK with up to six decimals", () => {
  assert.equal(isFromAmount("1000", "STRK"), true);
  assert.equal(isFromAmount("18.880298", "STRK"), true);
  assert.equal(isFromAmount("0.1234567", "STRK"), false, "seven decimals would round on the page");
  assert.equal(isFromAmount("0.12345678", "XMR"), true, "while XMR takes eight");
});
