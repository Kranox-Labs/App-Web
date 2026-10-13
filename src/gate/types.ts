// The shapes of the gate, in the form of the answers of the relay (apps/relay/src/server.mts), so that the client of
// a client of the relay drops in behind one interface.

/** A coin of Robinhood Chain that the gate brings in. */
export type ChainAsset = "ETH" | "USDG";

/**
 * A chain that the coins come from. Monero and, from 13 Oct 2026, Starknet and Zcash are open. Aleo stood here as
 * "Soon" until 13 Oct 2026, when a check found no provider that takes ALEO into Robinhood Chain, and the owner had it
 * removed: a chain enters the step once a provider takes it.
 */
export type FromChain = "XMR" | "ZEC" | "STRK";

export const FROM_CHAINS: readonly FromChain[] = ["XMR", "ZEC", "STRK"];

/** An exchange that turns the coins of a chain into a coin of Robinhood Chain. */
export type ProviderId = "changenow" | "simpleswap" | "oneclick";

export const PROVIDER_IDS: readonly ProviderId[] = ["changenow", "simpleswap", "oneclick"];

/** The rate of a swap: fixed holds the quote for a while, floating takes the rate at the time of the deposit. */
export type PayRate = "fixed" | "floating";

/** The least and the most of the coin of origin that a swap takes at a rate; a floating rate may have no most. */
export interface PayRange {
  provider: ProviderId;
  chain: FromChain;
  asset: ChainAsset;
  rate: PayRate;
  minFrom: number;
  maxFrom: number | null;
}

/** Which side of the range an amount fell on. */
export type PayLimit = "below" | "above";

/** What an amount of the coin of origin buys. Outside the range of the rate, [amount] is null and [limit] names the side. */
export interface PayQuote {
  provider: ProviderId;
  chain: FromChain;
  asset: ChainAsset;
  rate: PayRate;
  fromAmount: string;
  amount: number | null;
  rateId: string | null;
  validUntil: string | null;
  warning: string | null;
  depositFee: number | null;
  withdrawalFee: number | null;
  /** How long the exchange takes, in the words of the exchanger, such as "10-60". */
  speedMinutes: string | null;
  limit: PayLimit | null;
  minFrom: number | null;
  maxFrom: number | null;
}

/**
 * A swap to open: the coins to send and their chain, the coin and the address that receive, where a refund goes, and
 * the key of this creation, so that a second try after a lost answer gets the same swap instead of a second one.
 */
export interface PayRequest {
  provider: ProviderId;
  chain: FromChain;
  asset: ChainAsset;
  rate: PayRate;
  fromAmount: string;
  address: string;
  refundAddress: string;
  rateId: string | null;
  creationKey: string;
}

/** A swap that the exchanger opened: where to send the coins, and the token that reads its state. */
export interface CreatedPay {
  id: string;
  provider: ProviderId;
  chain: FromChain;
  asset: ChainAsset;
  amount: number;
  fromAmount: number;
  depositAddress: string;
  payoutAddress: string;
  refundAddress: string | null;
  /** The time until which the exchanger takes the deposit, when it names one at the creation. */
  validUntil: string | null;
  readToken: string;
}

/** The state of a swap, in the words of the exchanger. */
export type SwapStatus =
  | "new"
  | "waiting"
  | "confirming"
  | "exchanging"
  | "sending"
  | "finished"
  | "failed"
  | "refunded"
  | "verifying"
  | "expired";

export const SWAP_STATUSES: readonly SwapStatus[] = [
  "new",
  "waiting",
  "confirming",
  "exchanging",
  "sending",
  "finished",
  "failed",
  "refunded",
  "verifying",
  "expired",
];

/** The state of a swap as the relay reads it. */
export interface SwapState {
  id: string;
  status: SwapStatus;
  expectedOut: number | null;
  amountOut: number | null;
  depositHash: string | null;
  payoutHash: string | null;
  refundHash: string | null;
  refundAmount: number | null;
  updatedAt: string | null;
  validUntil: string | null;
}

/** The public history of an address on Robinhood Chain, as much of it as the app shows. */
export interface AddressScan {
  address: string;
  transfers: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

/** What a wallet holds on Robinhood Chain: the coin of the chain and the stablecoin. */
export interface Balances {
  eth: number;
  usdg: number;
}

/** Whether a swap still moves, or came to its end. */
export function isOpen(status: SwapStatus): boolean {
  return (
    status === "new" ||
    status === "waiting" ||
    status === "confirming" ||
    status === "exchanging" ||
    status === "sending"
  );
}
