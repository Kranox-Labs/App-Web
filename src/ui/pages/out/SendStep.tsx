import { useRef, useState } from "react";

import { COPY } from "../../../copy.ts";
import { CHAIN_FACTS } from "../../../gate/chains.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { describeError } from "../../../gate/errors.ts";
import { randomToken } from "../../../gate/signature.ts";
import { putSwap, recordOfOut } from "../../../gate/store.ts";
import { client } from "../../../gate/use-client.ts";
import { formatFrom, formatSend } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useWallet } from "../../../wallet/provider.ts";
import { Fact, Notice, PageFrame, PillButton, Surface } from "../../widgets/bits.tsx";
import { Stepper } from "../receive/Stepper.tsx";
import { onRobinhoodChain } from "../receive/steps.ts";
import { useOutStepGuard } from "./steps.ts";

/** The key of a creation has this many random bytes. */
const CREATION_KEY_BYTES = 16;

/** The last step of the way out: the review, and the gate. The page of the swap then sends the deposit. */
export function OutSendStep() {
  const ok = useOutStepGuard(4);
  const { draft, resetOut } = useDraft();
  const { connection } = useWallet();
  const [opening, setOpening] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // The key of this creation, with the request it belongs to: a second try of the same request after a lost answer
  // carries the same key, so the relay gives the same swap instead of a second one; a changed request gets a new key.
  const creation = useRef<{ fingerprint: string; key: string } | null>(null);

  const { out } = draft;
  const quote = out.quote;
  if (!ok || !onRobinhoodChain(connection) || quote?.amount == null || out.chain === null || out.provider === null) {
    return null;
  }

  const chain = out.chain;
  const facts = CHAIN_FACTS[chain];
  const words = COPY.chains[chain];
  const provider = COPY.providers[quote.provider];

  const open = async () => {
    setOpening(true);
    setFailure(null);
    // The request is the quote the user saw, with the address they typed and the wallet that sends (D-08).
    const request = {
      provider: quote.provider,
      chain: quote.chain,
      asset: quote.asset,
      fromAmount: quote.fromAmount,
      address: out.address,
      refundAddress: connection.address,
    };
    const fingerprint = JSON.stringify(request);
    if (creation.current?.fingerprint !== fingerprint) {
      creation.current = { fingerprint, key: randomToken(CREATION_KEY_BYTES) };
    }
    try {
      const created = await client.createOut({ ...request, creationKey: creation.current.key });
      putSwap(recordOfOut(created));
      resetOut();
      navigate(ROUTES.swap(created.id));
    } catch (error) {
      setFailure(describeError(error));
      setOpening(false);
    }
  };

  return (
    <PageFrame wide title={COPY.out.title} lead={COPY.out.sendLead}>
      <Stepper current={4} steps={COPY.out.steps} />
      <Surface>
        <p className="t-card-title">{COPY.out.review}</p>
        <dl className="facts">
          <Fact label={COPY.out.youSend}>
            {formatSend(Number(quote.fromAmount), quote.asset)} {quote.asset}
          </Fact>
          <Fact label={COPY.receive.youGet}>
            {formatFrom(quote.amount, chain)} {facts.coin}
          </Fact>
          <Fact label={COPY.receive.provider}>{provider.name}</Fact>
          <Fact label={COPY.receive.fees} stack>
            <span className="stack stack--tight">
              {quote.withdrawalFee !== null && quote.withdrawalFee > 0 && (
                <span className="t-small">
                  {COPY.out.feeNetworkLine(formatFrom(quote.withdrawalFee, chain), facts.coin, words.name)}
                </span>
              )}
              {quote.depositFee !== null && quote.depositFee > 0 && (
                <span className="t-small">
                  {COPY.out.feeDepositLine(formatSend(quote.depositFee, quote.asset), quote.asset)}
                </span>
              )}
              {(quote.withdrawalFee === null || quote.withdrawalFee === 0) &&
                (quote.depositFee === null || quote.depositFee === 0) && (
                  <span className="t-small">{COPY.receive.feesIncluded}</span>
                )}
              <span className="t-small soft">{COPY.out.feeWalletLine}</span>
            </span>
          </Fact>
          <Fact label={COPY.receive.rateLabel}>{COPY.receive.floating}</Fact>
          <Fact label={COPY.receive.to} stack>
            <span className="t-mono">{out.address}</span>
          </Fact>
          <Fact label={COPY.receive.refundTo} stack>
            <span className="t-mono">{connection.address}</span>
          </Fact>
        </dl>
        {failure !== null && <Notice tone="warn">{failure}</Notice>}
        <PillButton expand busy={opening} busyLabel={COPY.receive.opening} onClick={() => void open()}>
          {COPY.receive.open}
        </PillButton>
      </Surface>
    </PageFrame>
  );
}
