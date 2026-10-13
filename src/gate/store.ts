import { useSyncExternalStore } from "react";

import {
  FROM_CHAINS,
  PROVIDER_IDS,
  SWAP_STATUSES,
  type ChainAsset,
  type CreatedPay,
  type FromChain,
  type PayRate,
  type ProviderId,
  type SwapState,
  type SwapStatus,
} from "./types.ts";

/** A swap of the user, as this browser keeps it: what was asked, where it goes, and the last state read. */
export interface SwapRecord {
  id: string;
  provider: ProviderId;
  readToken: string;
  /** The chain the coins came from. */
  chain: FromChain;
  asset: ChainAsset;
  rate: PayRate;
  /** The amount of the coin of that chain that was sent. */
  fromAmount: number;
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
  };
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
 * before 13 Oct 2026 it wrote its amount as xmrAmount and named no chain, since Monero was the only chain.
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
  return record;
}

const isText = (value: unknown): boolean => typeof value === "string";
const isNullableText = (value: unknown): boolean => value === null || typeof value === "string";
const isNullableNumber = (value: unknown): boolean => value === null || typeof value === "number";

// A record that another release wrote, or that a hand changed, stays out rather than breaking a page: every field
// must have its form, and the state must be one the pages know.
export function isRecord(value: unknown): value is SwapRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isText(record.id) &&
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
    isNullableText(record.checkedAt)
  );
}
