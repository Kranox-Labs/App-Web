import { useEffect, useRef, useState } from "react";

import { EVM_ADDRESS_PATTERN } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { CHAIN_FACTS } from "../../../gate/chains.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { describeError } from "../../../gate/errors.ts";
import { randomToken } from "../../../gate/signature.ts";
import { putSwap, recordOf } from "../../../gate/store.ts";
import { client } from "../../../gate/use-client.ts";
import { formatAsset, formatFrom, formatTimeLeft } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useNow } from "../../../use-now.ts";
import { useWallet } from "../../../wallet/provider.ts";
import { Fact, Glass, Notice, PageFrame, PillButton, Surface, Waiting } from "../../widgets/bits.tsx";
import { Field } from "../../widgets/Field.tsx";
import { Stepper } from "./Stepper.tsx";
import { onRobinhoodChain, useStepGuard } from "./steps.ts";

/** The key of a creation has this many random bytes. */
const CREATION_KEY_BYTES = 16;

/** The last step of receive: the refund address, the review, and the gate. */
export function TransactionStep() {
  const ok = useStepGuard(4);
  const { draft, update, reset } = useDraft();
  const { connection } = useWallet();
  const now = useNow();
  const [opening, setOpening] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Each tap on "Try again" after a failed refresh of the quote asks once more.
  const [tries, setTries] = useState(0);
  // The key of this creation, with the request it belongs to: a second try of the same request after a lost answer
  // carries the same key, so the relay gives the same swap instead of a second one; a changed request gets a new key.
  const creation = useRef<{ fingerprint: string; key: string } | null>(null);

  const quote = draft.quote;
  const validUntil = quote?.validUntil ?? null;
  const ranOut = validUntil !== null && formatTimeLeft(validUntil, now) === null;
  // The fixed rate of the exchanger holds for about two minutes (CHECKED 12 Oct 2026, a quote of ChangeNOW through
  // the relay: "good for 1:54"), less than the way through the steps may take, so the step asks for a new quote once
  // the one in hand runs out. The ref keeps one request in flight for one quote.
  const refreshingFor = useRef<string | null>(null);
  useEffect(() => {
    if (!ranOut || quote === null || refreshingFor.current === quote.rateId) return;
    refreshingFor.current = quote.rateId;
    let live = true;
    client
      .payQuote(quote.provider, quote.chain, quote.asset, quote.rate, quote.fromAmount)
      .then((found) => {
        if (live) {
          setFailure(null);
          update({ quote: found });
        }
      })
      .catch((error: unknown) => {
        if (live) setFailure(describeError(error));
      })
      .finally(() => {
        refreshingFor.current = null;
      });
    return () => {
      live = false;
    };
  }, [ranOut, quote, tries, update]);

  if (
    !ok ||
    !onRobinhoodChain(connection) ||
    quote?.amount == null ||
    draft.chain === null ||
    draft.provider === null
  ) {
    return null;
  }

  const chain = draft.chain;
  const facts = CHAIN_FACTS[chain];
  const words = COPY.chains[chain];
  const refund = draft.refundAddress;
  const refundValid = facts.isRefundAddress(refund);
  // The address of the wallet on Robinhood Chain stands right under the field: pasted here by mistake, it gets its
  // own line, since no chain of origin takes it (D-17 of the scan of 13 Oct 2026).
  const refundError =
    refund === "" || refundValid
      ? null
      : EVM_ADDRESS_PATTERN.test(refund)
        ? COPY.receive.refundEvm(words.name)
        : COPY.receive.refundInvalid[chain];
  const timeLeft = validUntil === null ? null : formatTimeLeft(validUntil, now);
  const provider = COPY.providers[quote.provider];

  const paste = async () => {
    try {
      update({ refundAddress: (await navigator.clipboard.readText()).trim() });
    } catch {
      // A browser that keeps the clipboard to itself leaves the field to the keyboard.
    }
  };

  const open = async () => {
    setOpening(true);
    setFailure(null);
    // The request is the quote the user saw, and nothing of the draft beside the address (D-08 of the scan).
    const request = {
      provider: quote.provider,
      chain: quote.chain,
      asset: quote.asset,
      rate: quote.rate,
      fromAmount: quote.fromAmount,
      address: connection.address,
      refundAddress: refund,
      rateId: quote.rateId,
    };
    const fingerprint = JSON.stringify(request);
    if (creation.current?.fingerprint !== fingerprint) {
      creation.current = { fingerprint, key: randomToken(CREATION_KEY_BYTES) };
    }
    try {
      const created = await client.createPay({ ...request, creationKey: creation.current.key });
      putSwap(recordOf(created, quote.rate));
      reset();
      navigate(ROUTES.swap(created.id));
    } catch (error) {
      setFailure(describeError(error));
      setOpening(false);
    }
  };

  return (
    <PageFrame wide title={COPY.receive.title} lead={COPY.receive.transactionLead}>
      <Stepper current={4} />
      <Glass>
        <Field
          label={COPY.receive.refundField(words.name)}
          mono
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          hint={COPY.receive.refundHint[chain]}
          good={refundValid ? COPY.receive.refundValid(words.name) : null}
          value={refund}
          onChange={(event) => update({ refundAddress: event.target.value.trim() })}
          error={refundError}
          action={
            <PillButton tone="quiet" small onClick={() => void paste()}>
              {COPY.receive.paste}
            </PillButton>
          }
        />
        <p className="t-small faint">{COPY.receive.refundTip[chain]}</p>
      </Glass>
      <Surface>
        <p className="t-card-title">{COPY.receive.review}</p>
        <dl className="facts">
          <Fact label={COPY.receive.youSend}>
            {formatFrom(Number(draft.fromAmount), chain)} {facts.coin}
          </Fact>
          <Fact label={COPY.receive.youGet}>
            {formatAsset(quote.amount, draft.asset)} {draft.asset}
          </Fact>
          <Fact label={COPY.receive.provider}>{provider.name}</Fact>
          <Fact label={COPY.receive.fees} stack>
            <span className="stack stack--tight">
              {quote.withdrawalFee !== null && quote.withdrawalFee > 0 && (
                <span className="t-small">
                  {COPY.receive.feeNetworkLine(formatAsset(quote.withdrawalFee, quote.asset), quote.asset)}
                </span>
              )}
              {quote.depositFee !== null && quote.depositFee > 0 && (
                <span className="t-small">
                  {COPY.receive.feeDepositLine(formatFrom(quote.depositFee, chain), facts.coin)}
                </span>
              )}
              {(quote.withdrawalFee === null || quote.withdrawalFee === 0) &&
                (quote.depositFee === null || quote.depositFee === 0) && (
                  <span className="t-small">{COPY.receive.feesIncluded}</span>
                )}
              <span className="t-small soft">{COPY.receive.feeWalletLine(words.name)}</span>
            </span>
          </Fact>
          <Fact label={COPY.receive.rateLabel}>
            {draft.rate === "floating"
              ? COPY.receive.floating
              : timeLeft === null
                ? COPY.receive.fixedRate
                : COPY.receive.fixedFor(timeLeft)}
          </Fact>
          <Fact label={COPY.receive.to} stack>
            <span className="t-mono">{connection.address}</span>
          </Fact>
          {refundValid && (
            <Fact label={COPY.receive.refundTo} stack>
              <span className="t-mono">{refund}</span>
            </Fact>
          )}
        </dl>
        {!refundValid && !ranOut && <p className="t-small soft text-center">{COPY.receive.refundNeeded(words.name)}</p>}
        {ranOut && failure === null && (
          <Notice tone="warn">
            <Waiting className="">{COPY.receive.quoteRanOut}</Waiting>
          </Notice>
        )}
        {failure !== null && (
          <Notice tone="warn">
            {failure}{" "}
            {ranOut && (
              <PillButton tone="quiet" small onClick={() => setTries((count) => count + 1)}>
                {COPY.receive.tryAgain}
              </PillButton>
            )}
          </Notice>
        )}
        <PillButton
          expand
          disabled={!refundValid || ranOut}
          busy={opening}
          busyLabel={COPY.receive.opening}
          onClick={() => void open()}
        >
          {COPY.receive.open}
        </PillButton>
      </Surface>
    </PageFrame>
  );
}
