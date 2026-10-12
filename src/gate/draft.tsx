import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { AddressScan, ChainAsset, FromChain, PayQuote, PayRate, ProviderId } from "./types.ts";

/** The swap that the user builds, step by step, until the gate opens. It lives while the page is open. */
export interface Draft {
  /** The chain the coins come from, once chosen. */
  chain: FromChain | null;
  /** The exchange that makes the swap, once chosen. */
  provider: ProviderId | null;
  asset: ChainAsset;
  rate: PayRate;
  xmrAmount: string;
  quote: PayQuote | null;
  refundAddress: string;
  /** The public history of the address that receives, read on the connect page or the privacy step. */
  scan: AddressScan | null;
  /** Where the connect page goes on after a connection, when a step of receive sent the user there. */
  returnTo: string | null;
}

interface DraftStore {
  draft: Draft;
  update(changes: Partial<Draft>): void;
  reset(): void;
}

const EMPTY: Draft = {
  chain: null,
  provider: null,
  asset: "USDG",
  rate: "fixed",
  xmrAmount: "",
  quote: null,
  refundAddress: "",
  scan: null,
  returnTo: null,
};

const DraftContext = createContext<DraftStore | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const update = useCallback((changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes })), []);
  // A new swap starts clean, but keeps what the browser read about the wallet.
  const reset = useCallback(() => setDraft((current) => ({ ...EMPTY, scan: current.scan })), []);
  const store = useMemo(() => ({ draft, update, reset }), [draft, update, reset]);
  return <DraftContext value={store}>{children}</DraftContext>;
}

export function useDraft(): DraftStore {
  const store = useContext(DraftContext);
  if (store === null) throw new Error("The draft is read outside its provider.");
  return store;
}
