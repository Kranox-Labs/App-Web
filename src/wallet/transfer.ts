// The one transfer of the way out: the wallet of the user sends the deposit of a swap to the address on Robinhood
// Chain that the exchanger gave, as a plain transfer of ETH or a transfer of USDG through its contract. The wallet
// signs it and sends it itself (eth_sendTransaction); the app never sees a key. The amount goes in the smallest unit
// of the coin, made from the text of the amount, so that the wallet transfers exactly the amount the swap expects.
import { CHAIN_ASSETS, EVM_ADDRESS_PATTERN, ROBINHOOD_CHAIN, USDG } from "../chain.ts";
import type { ChainAsset } from "../gate/types.ts";
import type { EIP1193Provider } from "./provider.ts";

/** The selector of transfer(address,uint256) of an ERC-20 contract: the first four bytes of the hash of its signature. */
const TRANSFER_SELECTOR = "0xa9059cbb";

/** The width of a word of the ABI, in hex digits. */
const WORD_HEX_DIGITS = 64;

/** A hash of a transaction on an EVM chain: 0x and 64 hex digits. */
const TRANSACTION_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/** [amount], digits with a point for decimals, as a whole number of the smallest unit of a coin with [decimals] decimals. */
export function toBaseUnits(amount: string, decimals: number): bigint {
  const parts = amount.split(".");
  const [whole, fraction = ""] = parts;
  if (
    parts.length > 2 ||
    whole === undefined ||
    !/^\d+$/.test(whole) ||
    !/^\d*$/.test(fraction) ||
    fraction.length > decimals
  ) {
    throw new RangeError(`The amount ${amount} is not a number with at most ${decimals} decimals.`);
  }
  return BigInt(`${whole}${fraction.padEnd(decimals, "0")}`);
}

/** A whole number as a hex quantity of JSON-RPC: 0x and the digits, without leading zeros. */
export function toHexQuantity(value: bigint): string {
  return `0x${value.toString(16)}`;
}

/** The data of a call of transfer([to], [units]) of an ERC-20 contract. */
export function transferCallData(to: string, units: bigint): string {
  if (!EVM_ADDRESS_PATTERN.test(to)) throw new RangeError("The address of a transfer must be one of an EVM chain.");
  const address = to.slice(2).toLowerCase().padStart(WORD_HEX_DIGITS, "0");
  const amount = units.toString(16).padStart(WORD_HEX_DIGITS, "0");
  return `${TRANSFER_SELECTOR}${address}${amount}`;
}

/**
 * A transaction as the wallet sends it: a plain transfer of ETH, or a call of the contract of USDG with no value,
 * on Robinhood Chain and nowhere else: the chain in it makes a wallet on another network refuse it, so that the
 * coins of another chain never go to an address that only Robinhood Chain knows (D-32 of the scan of 13 Oct 2026).
 */
export interface Transfer {
  from: string;
  to: string;
  chainId: string;
  value?: string;
  data?: string;
}

/** The transfer of [amount] of [asset] from the wallet at [from] to [to], as text for the wallet. */
export function transferOf({
  asset,
  amount,
  from,
  to,
}: {
  asset: ChainAsset;
  amount: string;
  from: string;
  to: string;
}): Transfer {
  const units = toBaseUnits(amount, CHAIN_ASSETS[asset].chainDecimals);
  if (units <= 0n) throw new RangeError("The amount of a transfer must be above zero.");
  if (!EVM_ADDRESS_PATTERN.test(from) || !EVM_ADDRESS_PATTERN.test(to)) {
    throw new RangeError("The addresses of a transfer must be ones of an EVM chain.");
  }
  const chainId = ROBINHOOD_CHAIN.hex;
  if (asset === "ETH") return { from, to, chainId, value: toHexQuantity(units) };
  return { from, to: USDG.contract, chainId, data: transferCallData(to, units) };
}

/**
 * Asks the wallet to send [transfer]: the hash of the transaction once the wallet sent it, or null when the wallet
 * answered with something other than a hash, as a wallet of a smart account may, which means that it may well have
 * sent it; a wallet that did not send throws instead.
 */
export async function sendTransfer(provider: EIP1193Provider, transfer: Transfer): Promise<string | null> {
  const hash = await provider.request({ method: "eth_sendTransaction", params: [transfer] });
  return typeof hash === "string" && TRANSACTION_HASH_PATTERN.test(hash) ? hash : null;
}
