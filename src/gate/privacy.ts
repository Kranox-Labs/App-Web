import { formatAgo, formatDay } from "../format.ts";
import type { SwapRecord } from "./store.ts";
import type { AddressScan } from "./types.ts";

// The privacy check of the gate, after the three rules of the app (apps/wallet/lib/privacy/privacy_check.dart): the
// address, the amount, and the timing. In a browser it reads only what this browser knows: the swaps made here and
// the public history of the address that receives. It advises and blocks nothing.

/** Two amounts of XMR count as the same when they differ by at most this share of the larger one. */
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

export interface PrivacyInput {
  /** The address on Robinhood Chain that receives, or null before a wallet is connected. */
  recipient: string | null;
  /** The XMR to send, or null before an amount is typed. */
  xmrAmount: number | null;
  /** The swaps that this browser made. */
  swaps: readonly SwapRecord[];
  /** The public history of the recipient, or null while it is unread. */
  scan: AddressScan | null;
  now: number;
}

export function checkPrivacy({ recipient, xmrAmount, swaps, scan, now }: PrivacyInput): PrivacyReport {
  return {
    address: recipient === null ? null : checkAddress(recipient, swaps, scan),
    amount: xmrAmount === null ? null : checkAmount(xmrAmount, swaps, now),
    timing: checkTiming(swaps, now),
    addressChecked: recipient === null || scan !== null,
  };
}

/** How many rules of [report] warn. */
export function warningCount(report: PrivacyReport): number {
  return [report.address, report.amount, report.timing].filter((finding) => finding !== null).length;
}

// The records of the exchanger tie every swap that an address took part in. An address with a public history is no
// tie, but what arrives joins that history, so the rule says so.
function checkAddress(recipient: string, swaps: readonly SwapRecord[], scan: AddressScan | null): Finding | null {
  const target = recipient.toLowerCase();
  const used = swaps.filter((swap) => swap.payoutAddress.toLowerCase() === target).length;
  if (used > 0) {
    return {
      title: used === 1 ? "In 1 of your swaps" : `In ${used} of your swaps`,
      text:
        used === 1
          ? "This address received a swap of yours before. The records of the provider tie the two together through it. Use a new account of your wallet for this one."
          : `This address received ${used} swaps of yours. The records of the provider tie them together through it. Use a new account of your wallet for this one.`,
    };
  }
  if (scan !== null && scan.transfers > 0) {
    return {
      title: scan.transfers === 1 ? "1 transfer on Robinhood Chain" : `${scan.transfers} transfers on Robinhood Chain`,
      text: "What arrives joins the public history of this address. For a clean start, make a new account in your wallet and connect it.",
    };
  }
  return null;
}

function checkAmount(xmrAmount: number, swaps: readonly SwapRecord[], now: number): Finding | null {
  const match = swaps.find(
    (swap) =>
      now - new Date(swap.createdAt).getTime() <= AMOUNT_WINDOW_MS &&
      Math.abs(swap.xmrAmount - xmrAmount) <= AMOUNT_TOLERANCE * Math.max(swap.xmrAmount, xmrAmount),
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
