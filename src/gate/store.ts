import { useSyncExternalStore } from "react";

import { EVM_ADDRESS_PATTERN } from "../chain.ts";
import {
  FROM_CHAINS,
  PROVIDER_IDS,
  SWAP_STATUSES,
  type ChainAsset,
  type CreatedOut,
  type CreatedPay,
  type Direction,
  type FromChain,
  type PayRate,
  type ProviderId,
  type SwapState,
  type SwapStatus,
} from "./types.ts";

/**
 * A swap of the user, as this browser keeps it: what was asked, where it goes, and the last state read. On the way
 * in, the coins of [chain] went in and [asset] arrived at [payoutAddress] on Robinhood Chain; on the way out, [asset]
 * went in from the wallet at [refundAddress] and the coins of [chain] arrive at [payoutAddress] on that chain.
 */
export interface SwapRecord {
  id: string;
  direction: Direction;
  provider: ProviderId;
  readToken: string;
  /** The chain of the private side: where the coins came from, or where they go. */
  chain: FromChain;
  asset: ChainAsset;
  rate: PayRate;
  /** The amount sent: of the coin of the chain on the way in, of the coin on Robinhood Chain on the way out. */
  fromAmount: number;
  /** The amount that arrives: of the coin on Robinhood Chain on the way in, of the coin of the chain on the way out. */
  amount: number;
  depositAddress: string;
  payoutAddress: string;
  refundAddress: string | null;
  createdAt: string;
  validUntil: string | null;
  status: SwapStatus;
  depositHash: string | null;
  payoutHash: string | null;
  refundHash: string | null;
  refundAmount: number | null;
  updatedAt: string | null;
  checkedAt: string | null;
  /** When the connected wallet sent the deposit of a swap out from this browser, or null while it has not. */
  depositSentAt: string | null;
}

// The swaps live in the storage of this site in the browser, and nowhere else: no server of Kranox holds them.
const STORAGE_KEY = "kranox.gate.swaps";

const listeners = new Set<() => void>();
let cache: readonly SwapRecord[] | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The swaps of this browser, newest first. */
export function readSwaps(): readonly SwapRecord[] {
  if (cache === null) cache = load();
  return cache;
}

/** The swaps of this browser, newest first, kept fresh on every change. */
export function useSwaps(): readonly SwapRecord[] {
  return useSyncExternalStore(subscribe, readSwaps);
}

/** The swap with [id], or null when this browser holds none. */
export function findSwap(id: string): SwapRecord | null {
  return readSwaps().find((swap) => swap.id === id) ?? null;
}

/**
 * A record of a swap that the exchanger just opened. The time to send is the one the exchanger named at the creation,
 * or comes with the first read of its state: the quote had a time of its own, for the rate, which is not the time of
 * the deposit.
 */
export function recordOf(created: CreatedPay, rate: PayRate): SwapRecord {
  return {
    id: created.id,
    direction: "in",
    provider: created.provider,
    readToken: created.readToken,
    chain: created.chain,
    asset: created.asset,
    rate,
    fromAmount: created.fromAmount,
    amount: created.amount,
    depositAddress: created.depositAddress,
    payoutAddress: created.payoutAddress,
    refundAddress: created.refundAddress,
    createdAt: new Date().toISOString(),
    validUntil: created.validUntil,
    status: "waiting",
    depositHash: null,
    payoutHash: null,
    refundHash: null,
    refundAmount: null,
    updatedAt: null,
    checkedAt: null,
    depositSentAt: null,
  };
}

/** A record of a swap out that the exchanger just opened, at the floating rate, which is the rate of the way out. */
export function recordOfOut(created: CreatedOut): SwapRecord {
  return {
    id: created.id,
    direction: "out",
    provider: created.provider,
    readToken: created.readToken,
    chain: created.chain,
    asset: created.asset,
    rate: "floating",
    fromAmount: created.fromAmount,
    amount: created.amount,
    depositAddress: created.depositAddress,
    payoutAddress: created.payoutAddress,
    refundAddress: created.refundAddress,
    createdAt: new Date().toISOString(),
    validUntil: created.validUntil,
    status: "waiting",
    depositHash: null,
    payoutHash: null,
    refundHash: null,
    refundAmount: null,
    updatedAt: null,
    checkedAt: null,
    depositSentAt: null,
  };
}

/**
 * The record of a swap out whose deposit the wallet just sent, with its hash when the wallet named one, until the
 * exchanger names it; a wallet that named no hash sent it all the same, so the record says that it was sent (D-33).
 */
export function withDeposit(record: SwapRecord, depositHash: string | null, sentAt: Date = new Date()): SwapRecord {
  return { ...record, depositHash: depositHash ?? record.depositHash, depositSentAt: sentAt.toISOString() };
}

/** Keeps [record], in place of an older record of the same swap. */
export function putSwap(record: SwapRecord): void {
  const others = readSwaps().filter((swap) => swap.id !== record.id);
  commit([record, ...others].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

/** The record of a swap with the [state] that the relay just read. */
export function withState(record: SwapRecord, state: SwapState): SwapRecord {
  return {
    ...record,
    status: state.status,
    depositHash: state.depositHash ?? record.depositHash,
    payoutHash: state.payoutHash ?? record.payoutHash,
    refundHash: state.refundHash ?? record.refundHash,
    refundAmount: state.refundAmount ?? record.refundAmount,
    updatedAt: state.updatedAt ?? record.updatedAt,
    validUntil: state.validUntil ?? record.validUntil,
    // What arrived counts once the swap is done; before that, the exchanger may name a number that is not final.
    amount: state.status === "finished" && state.amountOut !== null ? state.amountOut : record.amount,
    checkedAt: new Date().toISOString(),
  };
}

/** Forgets every swap of this browser. */
export function clearSwaps(): void {
  commit([]);
}

function commit(swaps: readonly SwapRecord[]): void {
  cache = swaps;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(swaps));
  } catch {
    // Without storage the swaps live while the page is open. Nothing to do.
  }
  for (const listener of listeners) listener();
}

function load(): readonly SwapRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(upgradedRecord).filter(isRecord);
  } catch {
    return [];
  }
}

/**
 * A record of an older build in the form of this one, each change on its own (D-19 of the scan of 13 Oct 2026):
 * before 12 Oct 2026 a record named no provider, since ChangeNOW was the only one (D-04 of the scan of that day);
 * before 13 Oct 2026 it wrote its amount as xmrAmount and named no chain, since Monero was the only chain; and
 * until later that day it named no direction, since every swap went in.
 */
export function upgradedRecord(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const record = { ...(value as Record<string, unknown>) };
  if (record.provider === undefined) record.provider = "changenow";
  if (record.fromAmount === undefined && typeof record.xmrAmount === "number") {
    record.fromAmount = record.xmrAmount;
    delete record.xmrAmount;
  }
  if (record.chain === undefined) record.chain = "XMR";
  if (record.direction === undefined) record.direction = "in";
  if (record.depositSentAt === undefined) record.depositSentAt = null;
  return record;
}

const isText = (value: unknown): boolean => typeof value === "string";
const isNullableText = (value: unknown): boolean => value === null || typeof value === "string";
const isNullableNumber = (value: unknown): boolean => value === null || typeof value === "number";

// A record that another release wrote, or that a hand changed, stays out rather than breaking a page: every field
// must have its form, and the state must be one the pages know. The addresses of a swap out on Robinhood Chain feed
// the transfer that the wallet signs, so they must be addresses of that chain (D-35 of the scan of 13 Oct 2026).
export function isRecord(value: unknown): value is SwapRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const outAddresses =
    record.direction !== "out" ||
    (typeof record.depositAddress === "string" &&
      EVM_ADDRESS_PATTERN.test(record.depositAddress) &&
      typeof record.refundAddress === "string" &&
      EVM_ADDRESS_PATTERN.test(record.refundAddress));
  return (
    isText(record.id) &&
    (record.direction === "in" || record.direction === "out") &&
    outAddresses &&
    PROVIDER_IDS.some((provider) => provider === record.provider) &&
    isText(record.readToken) &&
    FROM_CHAINS.some((chain) => chain === record.chain) &&
    (record.asset === "ETH" || record.asset === "USDG") &&
    (record.rate === "fixed" || record.rate === "floating") &&
    typeof record.fromAmount === "number" &&
    typeof record.amount === "number" &&
    isText(record.depositAddress) &&
    isText(record.payoutAddress) &&
    isNullableText(record.refundAddress) &&
    isText(record.createdAt) &&
    isNullableText(record.validUntil) &&
    SWAP_STATUSES.some((status) => status === record.status) &&
    isNullableText(record.depositHash) &&
    isNullableText(record.payoutHash) &&
    isNullableText(record.refundHash) &&
    isNullableNumber(record.refundAmount) &&
    isNullableText(record.updatedAt) &&
    isNullableText(record.checkedAt) &&
    isNullableText(record.depositSentAt)
  );
}
