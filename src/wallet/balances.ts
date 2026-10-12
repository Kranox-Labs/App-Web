// What the wallet holds on Robinhood Chain, read through the wallet itself: it already talks to the chain for its
// own balance, so the app asks it and no other service learns the address.
import { ROBINHOOD_CHAIN, USDG } from "../chain.ts";
import type { Balances } from "../gate/types.ts";
import type { EIP1193Provider } from "./provider.ts";

export interface BalanceReader {
  readBalances(address: string): Promise<Balances>;
}

/** The selector of balanceOf(address) of an ERC-20 contract: the first four bytes of the hash of its signature. */
const BALANCE_OF_SELECTOR = "0x70a08231";

/** The width of a word of the ABI, in hex digits. */
const WORD_HEX_DIGITS = 64;

/** The data of a call of balanceOf([address]): the selector and the address as one word. */
export function balanceOfCallData(address: string): string {
  return BALANCE_OF_SELECTOR + address.slice(2).toLowerCase().padStart(WORD_HEX_DIGITS, "0");
}

/** The amount that [hex] counts in the smallest unit of a coin with [decimals] decimals, as a number. */
export function fromUnits(hex: string, decimals: number): number {
  const units = BigInt(hex === "0x" ? "0x0" : hex);
  const scale = 10n ** BigInt(decimals);
  return Number(units / scale) + Number(units % scale) / 10 ** decimals;
}

function readHex(value: unknown): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]*$/.test(value)) {
    throw new Error("The wallet answered a balance of the wrong form.");
  }
  return value;
}

export class WalletBalanceReader implements BalanceReader {
  readonly #provider: EIP1193Provider;

  constructor(provider: EIP1193Provider) {
    this.#provider = provider;
  }

  async readBalances(address: string): Promise<Balances> {
    const [eth, usdg] = await Promise.all([
      this.#provider.request({ method: "eth_getBalance", params: [address, "latest"] }),
      this.#provider.request({
        method: "eth_call",
        params: [{ to: USDG.contract, data: balanceOfCallData(address) }, "latest"],
      }),
    ]);
    return {
      eth: fromUnits(readHex(eth), ROBINHOOD_CHAIN.currency.decimals),
      usdg: fromUnits(readHex(usdg), USDG.decimals),
    };
  }
}

/** Balances made up from the address, the same for the same address, while the app runs on sample data. */
export class SampleBalanceReader implements BalanceReader {
  async readBalances(address: string): Promise<Balances> {
    const seed = Array.from(address.toLowerCase()).reduce((total, char) => total + char.charCodeAt(0), 0);
    return { eth: 0.1 + (seed % 50) / 100, usdg: 400 + (seed % 900) + (seed % 100) / 100 };
  }
}
