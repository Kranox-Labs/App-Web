import assert from "node:assert/strict";
import { test } from "node:test";
import { sha256 } from "@noble/hashes/sha2.js";
import { ZCASH_TRANSPARENT_PATTERN, decodeBase58, isZcashTransparentAddress } from "../src/gate/zcash-address.ts";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** The base58 of [bytes], for the vectors of the test. */
function encodeBase58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let text = "";
  while (value > 0n) {
    text = ALPHABET[Number(value % 58n)] + text;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    text = `1${text}`;
  }
  return text;
}

/** An address of the shape of Zcash with a right checksum over [prefix] and twenty zero bytes of hash. */
function addressWithPrefix(prefix: readonly number[]): string {
  const body = Uint8Array.from([...prefix, ...new Array<number>(20).fill(0)]);
  const checksum = sha256(sha256(body)).slice(0, 4);
  return encodeBase58(Uint8Array.from([...body, ...checksum]));
}

// Two transparent addresses of the Zcash mainnet made for the tests, a public key hash (t1) and a script hash (t3),
// as in the tests of the relay: nobody holds their keys.
const T1 = "t1URu8q83ibd8sgDoW3VnJoPjUusRz97h8J";
const T3 = "t3S5pQGfcc3VC7ZyrC59bQwrnHco6q5Jzck";

test("decodes base58 with its leading zeros", () => {
  assert.deepEqual(decodeBase58("11z"), Uint8Array.from([0, 0, 57]));
  assert.equal(decodeBase58("0"), null, "0 is no character of base58");
  assert.equal(decodeBase58("t1l"), null, "nor is l");
  const bytes = decodeBase58(T1);
  assert.equal(bytes?.length, 26);
  assert.deepEqual([...(bytes ?? []).slice(0, 2)], [0x1c, 0xb8], "t1 is the prefix 0x1CB8");
  assert.deepEqual([...(decodeBase58(T3) ?? []).slice(0, 2)], [0x1c, 0xbd], "t3 is the prefix 0x1CBD");
});

test("takes a transparent address of the mainnet with its checksum, and refuses the rest", () => {
  assert.equal(isZcashTransparentAddress(T1), true);
  assert.equal(isZcashTransparentAddress(T3), true);
  const changed = `${T1.slice(0, 20)}${T1[20] === "a" ? "b" : "a"}${T1.slice(21)}`;
  assert.equal(isZcashTransparentAddress(changed), false, "the checksum catches one wrong character");
  assert.equal(isZcashTransparentAddress(T1.slice(0, 34)), false, "too short");
  assert.equal(isZcashTransparentAddress(`${T1}1`), false, "too long");
  assert.equal(isZcashTransparentAddress(`t2${T1.slice(2)}`), false, "t2 is no prefix of the mainnet");
  assert.equal(
    isZcashTransparentAddress(
      "u1l8xunezsvhq8fgzfl7404m450nwnd76zshscn6nfys7vyz2ywyh4cc5daaq0c7q2su5lqfh23sp7fkf3kt27ve5948mzpjkmh6xfyau7zh33ac",
    ),
    false,
    "a unified address",
  );
  assert.equal(isZcashTransparentAddress("tmEsp4oaowYsncsXMGHsb6TA6s8Qop7bZwa"), false, "a testnet address");
  assert.equal(isZcashTransparentAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"), false, "a Bitcoin address");
  assert.equal(
    isZcashTransparentAddress("zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8f3g2d4kv4v9q0jfgcm3vhk3wm6ajqmp8"),
    false,
    "a shielded address takes no refund",
  );
  assert.equal(isZcashTransparentAddress(""), false);
});

test("refuses an address of the right shape and checksum whose prefix is not one of the mainnet (D-31)", () => {
  // The bytes 0x1CB9 lie between the prefixes of t1 (0x1CB8) and t3 (0x1CBD) and still write as t1…: only the check
  // of the prefix refuses such an address.
  const between = addressWithPrefix([0x1c, 0xb9]);
  assert.match(between, ZCASH_TRANSPARENT_PATTERN, "the vector has the shape of an address");
  assert.equal(isZcashTransparentAddress(between), false);
  assert.equal(isZcashTransparentAddress(addressWithPrefix([0x1c, 0xb8])), true);
  assert.equal(isZcashTransparentAddress(addressWithPrefix([0x1c, 0xbd])), true);
});
