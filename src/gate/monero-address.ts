// The check of a Monero address, as the Mac app does it (apps/wallet/lib/core/address.dart): the base58 of Monero,
// the checksum of Keccak-256, and the prefix of the network. The relay keeps only text of another shape away from the
// exchanger and leaves this check to the app, so that a refund can only go to an address that exists.
import { keccak_256 } from "@noble/hashes/sha3.js";

/** The alphabet of base58, without 0, O, I, and l. */
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Monero writes 8 bytes as 11 characters, and the last bytes of an address as a shorter block, by this table. */
const FULL_BLOCK_BYTES = 8;
const FULL_BLOCK_CHARS = 11;
const ENCODED_BLOCK_CHARS = [0, 2, 3, 5, 6, 7, 9, 10, 11];

/** The parts of an address: a prefix of one byte on mainnet, two keys of 32 bytes, and a checksum of 4 bytes. */
const KEY_BYTES = 64;
const CHECKSUM_BYTES = 4;
const PLAIN_CHARS = 95;

/** The prefixes of mainnet: a standard address and a subaddress. An integrated address (19) takes no refund. */
const MAINNET_STANDARD = 18;
const MAINNET_SUBADDRESS = 42;

/** The bytes of [text] in the base58 of Monero, or null for text that is not. */
export function decodeMoneroBase58(text: string): Uint8Array | null {
  const bytes: number[] = [];
  for (let start = 0; start < text.length; start += FULL_BLOCK_CHARS) {
    const block = text.slice(start, start + FULL_BLOCK_CHARS);
    const size = block.length === FULL_BLOCK_CHARS ? FULL_BLOCK_BYTES : ENCODED_BLOCK_CHARS.indexOf(block.length);
    if (size <= 0) return null;
    let value = 0n;
    for (const char of block) {
      const digit = ALPHABET.indexOf(char);
      if (digit < 0) return null;
      value = value * 58n + BigInt(digit);
    }
    if (value >= 1n << BigInt(8 * size)) return null;
    for (let index = size - 1; index >= 0; index--) {
      bytes.push(Number((value >> BigInt(8 * index)) & 0xffn));
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * Whether [text] is a standard address or a subaddress of the Monero mainnet: 95 characters of base58 whose checksum
 * holds, with the prefix of mainnet.
 */
export function isMoneroMainnetAddress(text: string): boolean {
  if (text.length !== PLAIN_CHARS) return false;
  const bytes = decodeMoneroBase58(text);
  if (bytes === null || bytes.length !== 1 + KEY_BYTES + CHECKSUM_BYTES) return false;
  const body = bytes.subarray(0, bytes.length - CHECKSUM_BYTES);
  const checksum = bytes.subarray(bytes.length - CHECKSUM_BYTES);
  const hash = keccak_256(body);
  for (let index = 0; index < CHECKSUM_BYTES; index++) {
    if (hash[index] !== checksum[index]) return false;
  }
  const prefix = body[0];
  return prefix === MAINNET_STANDARD || prefix === MAINNET_SUBADDRESS;
}
