import { useSyncExternalStore } from "react";

import type { ChainAsset, CreatedPay, PayRate, SwapState, SwapStatus } from "./types.ts";

/** A swap of the user, as this browser keeps it: what was asked, where it goes, and the last state read. */
export interface SwapRecord {
  id: string;
  readToken: string;
  asset: ChainAsset;
  rate: PayRate;
  xmrAmount: number;
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
const STORAGE_KEY = "kranox.door.swaps";

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

/** A record of a swap that the exchanger just opened. */
export function recordOf(created: CreatedPay, rate: PayRate, validUntil: string | null): SwapRecord {
  return {
    id: created.id,
    readToken: created.readToken,
    asset: created.asset,
    rate,
    xmrAmount: created.xmrAmount,
    amount: created.amount,
    depositAddress: created.depositAddress,
    payoutAddress: created.payoutAddress,
    refundAddress: created.refundAddress,
    createdAt: new Date().toISOString(),
    validUntil,
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
    amount: state.amountOut ?? record.amount,
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
    return parsed.filter(isRecord);
  } catch {
    return [];
  }
}

// A record that another release wrote, or that a hand changed, stays out rather than breaking a page.
function isRecord(value: unknown): value is SwapRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.readToken === "string" &&
    (record.asset === "ETH" || record.asset === "USDG") &&
    (record.rate === "fixed" || record.rate === "floating") &&
    typeof record.xmrAmount === "number" &&
    typeof record.amount === "number" &&
    typeof record.depositAddress === "string" &&
    typeof record.payoutAddress === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.status === "string"
  );
}
