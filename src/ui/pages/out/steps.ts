import { useEffect } from "react";

import { isOutAmount } from "../../../gate/amount.ts";
import { CHAIN_FACTS } from "../../../gate/chains.ts";
import { useDraft, type OutDraft } from "../../../gate/draft.tsx";
import { outQuoteMatches } from "../../../gate/quote.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useWallet, type Connection } from "../../../wallet/provider.ts";
import { onRobinhoodChain } from "../receive/steps.ts";

/** The five steps of the way out, in order: the chain, the amount, the provider, the address with its review, the send. */
export const OUT_STEP_ROUTES = [
  ROUTES.out,
  ROUTES.outAmount,
  ROUTES.outProvider,
  ROUTES.outAddress,
  ROUTES.outSend,
] as const;

/** The last step of the way out that the draft lets the user open: each step needs what the steps before it gave. */
export function openUpToOut(out: OutDraft, connection: Connection | null): number {
  if (out.chain === null) return 0;
  if (!isOutAmount(out.fromAmount, out.asset)) return 1;
  if (out.provider === null || out.quote === null || out.quote.amount === null || !outQuoteMatches(out.quote, out)) {
    return 2;
  }
  if (!onRobinhoodChain(connection) || !CHAIN_FACTS[out.chain].isRefundAddress(out.address)) return 3;
  return 4;
}

/** Sends the user back to the last open step of the way out when [step] comes too early. Returns whether to show the step. */
export function useOutStepGuard(step: number): boolean {
  const { draft } = useDraft();
  const { connection } = useWallet();
  const allowed = openUpToOut(draft.out, connection);
  const ok = step <= allowed;
  useEffect(() => {
    if (!ok) navigate(OUT_STEP_ROUTES[allowed] ?? ROUTES.out, true);
  }, [ok, allowed]);
  return ok;
}
