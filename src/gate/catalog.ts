import type { FromChain, ProviderId } from "./types.ts";

/** The chains the coins can come from, in the order of the step. Only Monero is open. */
export const CHAINS: readonly { code: FromChain; open: boolean }[] = [
  { code: "XMR", open: true },
  { code: "ZEC", open: false },
  { code: "STRK", open: false },
  { code: "ALEO", open: false },
];

/** The exchanges that make a swap, in the order of the step. The words about each are in the copy. */
export const PROVIDERS: readonly { id: ProviderId; open: boolean }[] = [{ id: "changenow", open: true }];
