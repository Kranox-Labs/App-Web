import type { FromChain, PayRate, ProviderId } from "./types.ts";

/**
 * The chains the coins can come from, in the order of the step, all open. A chain that waits for its provider can
 * stand here closed, which the step shows as "Soon"; Aleo stood so until 13 Oct 2026, when no provider took it.
 */
export const CHAINS: readonly { code: FromChain; open: boolean }[] = [
  { code: "XMR", open: true },
  { code: "ZEC", open: true },
  { code: "STRK", open: true },
];

/**
 * The exchanges that make a swap: the chains each takes the coins from, and the rates it serves. The words about each
 * are in the copy. CHECKED 13 Oct 2026: ChangeNOW takes XMR, STRK, and ZEC at both rates, SimpleSwap XMR and ZEC at
 * both, and the 1Click API of NEAR Intents STRK and ZEC at a floating rate, which is what a quote with a slippage is.
 */
export const PROVIDERS: readonly {
  id: ProviderId;
  open: boolean;
  chains: readonly FromChain[];
  rates: readonly PayRate[];
}[] = [
  { id: "changenow", open: true, chains: ["XMR", "STRK", "ZEC"], rates: ["fixed", "floating"] },
  { id: "simpleswap", open: true, chains: ["XMR", "ZEC"], rates: ["fixed", "floating"] },
  { id: "oneclick", open: true, chains: ["STRK", "ZEC"], rates: ["floating"] },
];

/** The order of the providers on the step of each chain: the first is the choice until the user picks another. */
const PROVIDER_ORDER: Record<FromChain, readonly ProviderId[]> = {
  XMR: ["changenow", "simpleswap"],
  // NEAR Intents first: it settles in about a minute and gave about 3% more USDG for 1000 STRK on 13 Oct 2026.
  STRK: ["oneclick", "changenow"],
  // NEAR Intents first here too: about eight minutes, and about 2.6% more USDG for 1 ZEC on 13 Oct 2026.
  ZEC: ["oneclick", "changenow", "simpleswap"],
};

function entryOf(id: ProviderId) {
  return PROVIDERS.find((each) => each.id === id);
}

/** The open providers that take the coins of [chain], in the order of the step. */
export function providersOf(chain: FromChain): readonly ProviderId[] {
  return PROVIDER_ORDER[chain].filter((id) => {
    const entry = entryOf(id);
    return entry !== undefined && entry.open && entry.chains.includes(chain);
  });
}

/** The rates that [provider] serves. */
export function ratesOf(provider: ProviderId): readonly PayRate[] {
  return entryOf(provider)?.rates ?? [];
}
