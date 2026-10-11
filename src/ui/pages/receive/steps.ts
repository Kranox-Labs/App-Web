import { useEffect } from "react";

import { AMOUNT_PATTERN, ROBINHOOD_CHAIN } from "../../../chain.ts";
import { useDraft, type Draft } from "../../../door/draft.tsx";
import { navigate, ROUTES } from "../../../router.ts";
import { useWallet, type Connection } from "../../../wallet/provider.ts";

/** The five steps of receive, in order: the chain, the amount, the provider, the privacy review, the transaction. */
export const STEP_ROUTES = [
  ROUTES.receive,
  ROUTES.receiveAmount,
  ROUTES.receiveProvider,
  ROUTES.receivePrivacy,
  ROUTES.receiveTransaction,
] as const;

export function validAmount(text: string): boolean {
  return AMOUNT_PATTERN.test(text) && Number(text) > 0;
}

/** Whether a wallet is connected and on Robinhood Chain. */
export function onRobinhoodChain(connection: Connection | null): connection is Connection {
  return connection !== null && connection.chainId === ROBINHOOD_CHAIN.id;
}

/** The last step that the draft lets the user open: each step needs what the steps before it gave. */
export function openUpTo(draft: Draft, connection: Connection | null): number {
  if (draft.chain === null) return 0;
  if (!validAmount(draft.xmrAmount)) return 1;
  if (draft.provider === null || draft.quote?.amount == null) return 2;
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
    if (!ok) navigate(STEP_ROUTES[allowed] ?? ROUTES.receive, true);
  }, [ok, allowed]);
  return ok;
}
