// The transparent addresses of Zcash, as the relay checks them (apps/relay/src/zcash.mts): the base58check of Bitcoin
// with the prefix of Zcash, a public key hash (t1) or a script hash (t3), 20 bytes of hash and a checksum of 4 bytes
// of a double SHA-256. The exchangers take and pay ZEC at transparent addresses alone, so a shielded or unified
// address (zs1, u1) takes no refund here.
import { sha256 } from "@noble/hashes/sha2.js";

/** The alphabet of base58, without 0, O, I, and l. */
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const PREFIX_BYTES = 2;
const HASH_BYTES = 20;
const CHECKSUM_BYTES = 4;
const ADDRESS_BYTES = PREFIX_BYTES + HASH_BYTES + CHECKSUM_BYTES;

/** The prefixes of the mainnet: a public key hash (t1…) and a script hash (t3…). */
const PREFIXES = [
  [0x1c, 0xb8],
  [0x1c, 0xbd],
] as const;

/** A transparent address is 35 characters of base58 that start with t1 or t3. */
export const ZCASH_TRANSPARENT_PATTERN = /^t[13][1-9A-HJ-NP-Za-km-z]{33}$/;

/** The bytes of [text] in base58, or null for text that is not base58. */
export function decodeBase58(text: string): Uint8Array | null {
  let value = 0n;
  for (const char of text) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) return null;
    value = value * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (value > 0n) {
    bytes.unshift(Number(value % 256n));
    value /= 256n;
  }
  for (const char of text) {
    if (char !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

/** Whether [text] is a transparent address of the Zcash mainnet: its shape, its prefix, and its checksum. */
export function isZcashTransparentAddress(text: string): boolean {
  if (!ZCASH_TRANSPARENT_PATTERN.test(text)) return false;
  const bytes = decodeBase58(text);
  if (bytes === null || bytes.length !== ADDRESS_BYTES) return false;
  const body = bytes.subarray(0, PREFIX_BYTES + HASH_BYTES);
  const checksum = bytes.subarray(PREFIX_BYTES + HASH_BYTES);
  const expected = sha256(sha256(body));
  for (let index = 0; index < CHECKSUM_BYTES; index++) {
    if (expected[index] !== checksum[index]) return false;
  }
  return PREFIXES.some(([first, second]) => body[0] === first && body[1] === second);
}
