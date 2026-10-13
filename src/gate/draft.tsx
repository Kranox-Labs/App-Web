import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { AddressScan, ChainAsset, FromChain, OutQuote, PayQuote, PayRate, ProviderId } from "./types.ts";

/** The swap out that the user builds, step by step: the chain the coins go to, the coin to send, and the address. */
export interface OutDraft {
  /** The chain the coins go to, once chosen. */
  chain: FromChain | null;
  provider: ProviderId | null;
  /** The coin on Robinhood Chain to send. */
  asset: ChainAsset;
  /** The amount of that coin to send, as typed. */
  fromAmount: string;
  quote: OutQuote | null;
  /** The address on the chain that receives, as typed. */
  address: string;
}

/**
 * The swap that the user builds, step by step, until the gate opens. It lives while the page is open. The scan of
 * the connected address and the way back from the connect page serve both ways; the fields of the way out stand
 * under [out], apart from those of the way in, so that one way never spends the other's choices.
 */
export interface Draft {
  /** The chain the coins come from, once chosen. */
  chain: FromChain | null;
  /** The exchange that makes the swap, once chosen. */
  provider: ProviderId | null;
  asset: ChainAsset;
  rate: PayRate;
  /** The amount of the coin of the chain to send, as typed. */
  fromAmount: string;
  quote: PayQuote | null;
  refundAddress: string;
  /** The public history of the address that receives, read on the connect page or the privacy step. */
  scan: AddressScan | null;
  /** Where the connect page goes on after a connection, when a step of the way in or out sent the user there. */
  returnTo: string | null;
  out: OutDraft;
}

interface DraftStore {
  draft: Draft;
  update(changes: Partial<Draft>): void;
  /** A new swap in starts clean; the swap out in the making stays. */
  reset(): void;
  updateOut(changes: Partial<OutDraft>): void;
  /** A new swap out starts clean; the swap in in the making stays. */
  resetOut(): void;
}

const EMPTY_OUT: OutDraft = {
  chain: null,
  provider: null,
  asset: "USDG",
  fromAmount: "",
  quote: null,
  address: "",
};

const EMPTY: Draft = {
  chain: null,
  provider: null,
  asset: "USDG",
  rate: "fixed",
  fromAmount: "",
  quote: null,
  refundAddress: "",
  scan: null,
  returnTo: null,
  out: EMPTY_OUT,
};

const DraftContext = createContext<DraftStore | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const update = useCallback((changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes })), []);
  // A new swap starts clean, the history of the wallet too: the swap that just opened changes it, so the next
  // swap reads it afresh (D-20 of the scan of 13 Oct 2026).
  const reset = useCallback(() => setDraft((current) => ({ ...EMPTY, out: current.out })), []);
  const updateOut = useCallback(
    (changes: Partial<OutDraft>) => setDraft((current) => ({ ...current, out: { ...current.out, ...changes } })),
    [],
  );
  const resetOut = useCallback(
    () => setDraft((current) => ({ ...current, scan: null, returnTo: null, out: EMPTY_OUT })),
    [],
  );
  const store = useMemo(
    () => ({ draft, update, reset, updateOut, resetOut }),
    [draft, update, reset, updateOut, resetOut],
  );
  return <DraftContext value={store}>{children}</DraftContext>;
}

export function useDraft(): DraftStore {
  const store = useContext(DraftContext);
  if (store === null) throw new Error("The draft is read outside its provider.");
  return store;
}
