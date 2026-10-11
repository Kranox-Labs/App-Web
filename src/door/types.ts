// The shapes of the door, in the form of the answers of the relay (apps/relay/src/server.mts), so that the client of
// the relay and the sample client answer alike.

/** A coin of Robinhood Chain that the door brings in. */
export type ChainAsset = "ETH" | "USDG";

/** A chain that the coins come from. Only Monero is open; the others name the road ahead. */
export type FromChain = "XMR" | "ZEC" | "STRK" | "ALEO";

/** An exchange that turns the coins of a chain into a coin of Robinhood Chain. */
export type ProviderId = "changenow";

/** The rate of a swap: fixed holds the quote for a while, floating takes the rate at the time of the deposit. */
export type PayRate = "fixed" | "floating";

/** The least and the most XMR that a swap takes at a rate; a floating rate may have no most. */
export interface PayRange {
  asset: ChainAsset;
  rate: PayRate;
  minXmr: number;
  maxXmr: number | null;
}

/** Which side of the range an amount fell on. */
export type PayLimit = "below" | "above";

/** What an amount of XMR buys. Outside the range of the rate, [amount] is null and [limit] names the side. */
export interface PayQuote {
  asset: ChainAsset;
  rate: PayRate;
  xmrAmount: string;
  amount: number | null;
  rateId: string | null;
  validUntil: string | null;
  warning: string | null;
  depositFee: number | null;
  withdrawalFee: number | null;
  /** How long the exchange takes, in the words of the exchanger, such as "10-60". */
  speedMinutes: string | null;
  limit: PayLimit | null;
  minXmr: number | null;
  maxXmr: number | null;
}

/**
 * A swap to open: the XMR to send, the coin and the address that receive, where a refund goes, and the key of this
 * creation, so that a second try after a lost answer gets the same swap instead of a second one.
 */
export interface PayRequest {
  asset: ChainAsset;
  rate: PayRate;
  xmrAmount: string;
  address: string;
  refundAddress: string;
  rateId: string | null;
  creationKey: string;
}

/** A swap that the exchanger opened: where to send the XMR, and the token that reads its state. */
export interface CreatedPay {
  id: string;
  asset: ChainAsset;
  amount: number;
  xmrAmount: number;
  depositAddress: string;
  payoutAddress: string;
  refundAddress: string | null;
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

/** The public history of an address on Robinhood Chain, as much of it as the door shows. */
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
