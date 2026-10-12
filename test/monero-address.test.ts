import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeMoneroBase58, isMoneroMainnetAddress } from "../src/gate/monero-address.ts";

// Two addresses of throwaway wallets on mainnet, as in the tests of the relay and of the Mac app: a standard address
// and a subaddress.
const STANDARD = "48PFnHrr8bVGx463yo8SMXGZUp7PyYPgwZJR4MnpgjKCDXpw3XvK6UTbarKkpwaPbPSYSdJ4rozjZjGxr2t3qVP4B4DzzVs";
const SUBADDRESS = "883z7Wmbd5nhoH6xQxLzgniNhN6jqdvxFiza4rMdErWA1XW1TCL1tqrCwWFwhG1QkuL17RRHP45J33y6u4sH8Rfa7kryRza";

test("decodes the base58 of Monero in blocks", () => {
  const bytes = decodeMoneroBase58(STANDARD);
  assert.notEqual(bytes, null);
  assert.equal(bytes?.length, 69);
  assert.equal(bytes?.[0], 18, "the prefix of a standard address of mainnet");
  assert.equal(decodeMoneroBase58(SUBADDRESS)?.[0], 42, "the prefix of a subaddress of mainnet");
  assert.equal(decodeMoneroBase58("0"), null, "0 is no character of base58");
  assert.equal(decodeMoneroBase58("1"), null, "no block has one character");
  assert.equal(decodeMoneroBase58("zzzzzzzzzzz"), null, "a block that does not fit its bytes");
});

test("accepts a standard address and a subaddress of mainnet with their checksum", () => {
  assert.equal(isMoneroMainnetAddress(STANDARD), true);
  assert.equal(isMoneroMainnetAddress(SUBADDRESS), true);
});

test("refuses an address with one wrong character, or of another length or network", () => {
  const changed = `${STANDARD.slice(0, 40)}${STANDARD[40] === "A" ? "B" : "A"}${STANDARD.slice(41)}`;
  assert.equal(isMoneroMainnetAddress(changed), false, "the checksum catches one wrong character");
  assert.equal(isMoneroMainnetAddress(STANDARD.slice(0, 94)), false, "too short");
  assert.equal(isMoneroMainnetAddress(`${STANDARD}1`), false, "too long");
  assert.equal(isMoneroMainnetAddress(`4${"8".repeat(94)}`), false, "the shape alone is not enough");
  assert.equal(isMoneroMainnetAddress(""), false);
});
