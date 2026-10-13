// The chains the coins come from, with what the pages need of each: its coin, its name at the relay, the decimals of
// an amount in the form, the checks of its addresses, the way to open a payment in a wallet, and the rate to start
// from. Monero, Starknet, and Zcash are open.
import { MONERO_DEPOSIT_PATTERN, XMR_DECIMALS } from "../chain.ts";
import { isMoneroMainnetAddress } from "./monero-address.ts";
import { isStarknetAddress, sameStarknetAddress } from "./starknet-address.ts";
import { isZcashTransparentAddress } from "./zcash-address.ts";
import type { FromChain, PayRate } from "./types.ts";

export interface ChainFacts {
  /** The coin, as the pages write it. */
  coin: string;
  /** The chain as the relay names it in a request, in the field from. */
  relayName: string;
  /** An amount in the form has at most this many decimals, so that the amount the provider takes is the one shown. */
  decimals: number;
  /** The rate that a swap from this chain starts with: the one that its providers serve, with the lowest minimum. */
  defaultRate: PayRate;
  /** Whether [text] is an address of this chain that a refund can go to. */
  isRefundAddress(text: string): boolean;
  /** Whether [text] is an address of this chain that a deposit can go to, as the relay checks before it signs. */
  isDepositAddress(text: string): boolean;
  /** Whether two addresses name the same account, as the chain reads them. */
  sameAddress(a: string, b: string): boolean;
  /** A link that opens a payment of [amount] to [address] in a wallet of this chain, or null when the chain has none. */
  paymentLink(address: string, amount: string): string | null;
}

const sameText = (a: string, b: string): boolean => a === b;

export const CHAIN_FACTS: Record<FromChain, ChainFacts> = {
  XMR: {
    coin: "XMR",
    relayName: "xmr",
    decimals: XMR_DECIMALS,
    // The fixed rate holds the amount that arrives, and both providers of XMR serve it.
    defaultRate: "fixed",
    isRefundAddress: isMoneroMainnetAddress,
    isDepositAddress: (text) => MONERO_DEPOSIT_PATTERN.test(text),
    sameAddress: sameText,
    paymentLink: (address, amount) => `monero:${address}?tx_amount=${amount}`,
  },
  STRK: {
    coin: "STRK",
    relayName: "strk",
    // STRK has 18 decimals on its chain; six are more than any swap needs, and keep the figures readable.
    decimals: 6,
    // NEAR Intents, the provider that settles in about a minute, serves a floating rate alone; the floating rate of
    // ChangeNOW starts far lower than its fixed one too (CHECKED 13 Oct 2026: from 18.88 STRK against 110.06).
    defaultRate: "floating",
    isRefundAddress: isStarknetAddress,
    isDepositAddress: isStarknetAddress,
    sameAddress: sameStarknetAddress,
    // The wallets of Starknet open no link of a payment, so the page shows the address and the amount to copy.
    paymentLink: () => null,
  },
  ZEC: {
    coin: "ZEC",
    relayName: "zec",
    decimals: 8,
    // NEAR Intents, first among the providers of the chain, serves a floating rate alone; the other two serve both.
    defaultRate: "floating",
    // The providers take and pay ZEC at transparent addresses alone (t1, t3): a shielded or unified address takes no
    // refund, and the deposit goes to a transparent address.
    isRefundAddress: isZcashTransparentAddress,
    isDepositAddress: isZcashTransparentAddress,
    sameAddress: sameText,
    // A link of payment after ZIP 321, which the wallets of Zcash open.
    paymentLink: (address, amount) => `zcash:${address}?amount=${amount}`,
  },
};
