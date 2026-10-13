import { formatAgo, formatDay } from "../format.ts";
import type { SwapRecord } from "./store.ts";
import type { AddressScan, ChainAsset, FromChain } from "./types.ts";

// The privacy check of the gate, after the three rules of the app (apps/wallet/lib/privacy/privacy_check.dart): the
// address, the amount, and the timing. In a browser it reads only what this browser knows: the swaps made here and
// the public history of the address on Robinhood Chain of the swap, which receives on the way in and sends on the
// way out. It advises and blocks nothing.

/** Two amounts of one coin count as the same when they differ by at most this share of the larger one. */
const AMOUNT_TOLERANCE = 0.02;

/** The rule of the amount looks back this long. */
const AMOUNT_WINDOW_MS = 7 * 86_400_000;

/** The rule of the timing looks back this long. */
const TIMING_WINDOW_MS = 86_400_000;

/** What one rule found: a title, and what to do about it. */
export interface Finding {
  title: string;
  text: string;
}

/** The three rules: null for a rule that passes. [addressChecked] is false while the rule of the address lacks a scan. */
export interface PrivacyReport {
  address: Finding | null;
  amount: Finding | null;
  timing: Finding | null;
  addressChecked: boolean;
}

/** The amount of a swap in the making, with the coin it is an amount of: the coin of a chain in, or a coin on Robinhood Chain out. */
export type AmountOf =
  { direction: "in"; chain: FromChain; value: number } | { direction: "out"; asset: ChainAsset; value: number };

export interface PrivacyInput {
  /** The address on Robinhood Chain of the swap, which receives in or sends out, or null before a wallet is connected. */
  recipient: string | null;
  /** The amount to send, or null before an amount is typed. */
  amount: AmountOf | null;
  /** The swaps that this browser made. */
  swaps: readonly SwapRecord[];
  /** The public history of the address, or null while it is unread. */
  scan: AddressScan | null;
  now: number;
}

export function checkPrivacy({ recipient, amount, swaps, scan, now }: PrivacyInput): PrivacyReport {
  return {
    address: recipient === null ? null : checkAddress(recipient, swaps, scan),
    amount: amount === null ? null : checkAmount(amount, swaps, now),
    timing: checkTiming(swaps, now),
    addressChecked: recipient === null || scan !== null,
  };
}

/** The address on Robinhood Chain that took part in [swap]: the one that received in, or the one that sent out. */
export function chainAddressOf(swap: SwapRecord): string | null {
  return swap.direction === "in" ? swap.payoutAddress : swap.refundAddress;
}

/** Whether [swap] moved an amount of the same coin as [amount], the same way. */
function sameCoin(swap: SwapRecord, amount: AmountOf): boolean {
  if (swap.direction !== amount.direction) return false;
  return amount.direction === "in" ? swap.chain === amount.chain : swap.asset === amount.asset;
}

/** How many rules of [report] warn. */
export function warningCount(report: PrivacyReport): number {
  return [report.address, report.amount, report.timing].filter((finding) => finding !== null).length;
}

// The records of the exchanger tie every swap that an address took part in, whether it received or sent. An address
// with a public history is no tie, but the swap joins that history, so the rule says so.
function checkAddress(recipient: string, swaps: readonly SwapRecord[], scan: AddressScan | null): Finding | null {
  const target = recipient.toLowerCase();
  const used = swaps.filter((swap) => chainAddressOf(swap)?.toLowerCase() === target).length;
  if (used > 0) {
    return {
      title: used === 1 ? "In 1 of your swaps" : `In ${used} of your swaps`,
      text:
        used === 1
          ? "This address took part in a swap of yours before. The records of the provider tie the two together through it. Use a new account of your wallet for this one."
          : `This address took part in ${used} swaps of yours. The records of the provider tie them together through it. Use a new account of your wallet for this one.`,
    };
  }
  if (scan !== null && scan.transfers > 0) {
    return {
      title: scan.transfers === 1 ? "1 transfer on Robinhood Chain" : `${scan.transfers} transfers on Robinhood Chain`,
      text: "This swap joins the public history of this address. For a clean start, make a new account in your wallet and connect it.",
    };
  }
  return null;
}

// An amount pairs with the amounts of the same coin the same way: a swap of STRK says nothing about one of XMR, and
// USDG sent out nothing about XMR sent in.
function checkAmount(amount: AmountOf, swaps: readonly SwapRecord[], now: number): Finding | null {
  const fromAmount = amount.value;
  const match = swaps.find(
    (swap) =>
      sameCoin(swap, amount) &&
      now - new Date(swap.createdAt).getTime() <= AMOUNT_WINDOW_MS &&
      Math.abs(swap.fromAmount - fromAmount) <= AMOUNT_TOLERANCE * Math.max(swap.fromAmount, fromAmount),
  );
  if (match === undefined) return null;
  return {
    title: `Matches your swap of ${formatDay(match.createdAt)}`,
    text: "Someone who sees both swaps can pair them by their amount. Change it a little, by more than two percent.",
  };
}

function checkTiming(swaps: readonly SwapRecord[], now: number): Finding | null {
  const recent = swaps.find((swap) => now - new Date(swap.createdAt).getTime() <= TIMING_WINDOW_MS);
  if (recent === undefined) return null;
  return {
    title: `Your last swap was ${formatAgo(recent.createdAt, now)}`,
    text: "Swaps close in time are easier to pair. Leave a day between them when you can.",
  };
}
