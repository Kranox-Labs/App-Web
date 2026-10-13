import { useEffect } from "react";

import { ROBINHOOD_CHAIN } from "../../../chain.ts";
import { isFromAmount } from "../../../gate/amount.ts";
import { useDraft, type Draft } from "../../../gate/draft.tsx";
import { quoteMatches } from "../../../gate/quote.ts";
import type { FromChain } from "../../../gate/types.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useWallet, type Connection } from "../../../wallet/provider.ts";

/** The five steps of receive, in order: the chain, the amount, the provider, the privacy review, the transaction. */
export const STEP_ROUTES = [
  ROUTES.in,
  ROUTES.inAmount,
  ROUTES.inProvider,
  ROUTES.inPrivacy,
  ROUTES.inTransaction,
] as const;

/** Whether [text] is an amount of the coin of [chain] that the form takes. */
export function validAmount(text: string, chain: FromChain): boolean {
  return isFromAmount(text, chain);
}

/** Whether a wallet is connected and on Robinhood Chain. */
export function onRobinhoodChain(connection: Connection | null): connection is Connection {
  return connection !== null && connection.chainId === ROBINHOOD_CHAIN.id;
}

/** The last step that the draft lets the user open: each step needs what the steps before it gave. */
export function openUpTo(draft: Draft, connection: Connection | null): number {
  if (draft.chain === null) return 0;
  if (!validAmount(draft.fromAmount, draft.chain)) return 1;
  if (
    draft.provider === null ||
    draft.quote === null ||
    draft.quote.amount === null ||
    !quoteMatches(draft.quote, draft)
  ) {
    return 2;
  }
  if (!onRobinhoodChain(connection)) return 3;
  return 4;
}

/** Sends the user back to the last open step when [step] comes too early. Returns whether to show the step. */
export function useStepGuard(step: number): boolean {
  const { draft } = useDraft();
  const { connection } = useWallet();
  const allowed = openUpTo(draft, connection);
  const ok = step <= allowed;
  useEffect(() => {
    if (!ok) navigate(STEP_ROUTES[allowed] ?? ROUTES.in, true);
  }, [ok, allowed]);
  return ok;
}
