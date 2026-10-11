import { useEffect, useRef, useState } from "react";

import { MONERO_ADDRESS_PATTERN } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { useDraft } from "../../../door/draft.tsx";
import { describeError } from "../../../door/errors.ts";
import { randomToken } from "../../../door/signature.ts";
import { putSwap, recordOf } from "../../../door/store.ts";
import { client } from "../../../door/use-client.ts";
import { formatAsset, formatTimeLeft, formatXmr } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useNow } from "../../../use-now.ts";
import { useWallet } from "../../../wallet/provider.ts";
import { Fact, Glass, Notice, PageFrame, PillButton, Surface } from "../../widgets/bits.tsx";
import { Field } from "../../widgets/Field.tsx";
import { Stepper } from "./Stepper.tsx";
import { onRobinhoodChain, useStepGuard } from "./steps.ts";

/** The key of a creation has this many random bytes. */
const CREATION_KEY_BYTES = 16;

/** The last step of receive: the refund address, the review, and the door. */
export function TransactionStep() {
  const ok = useStepGuard(4);
  const { draft, update, reset } = useDraft();
  const { connection } = useWallet();
  const now = useNow();
  const [opening, setOpening] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // The key of this creation: a second try after a lost answer carries the same key, so the relay gives the same
  // swap instead of a second one.
  const creationKey = useRef<string | null>(null);

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
      .payQuote(draft.asset, draft.rate, draft.xmrAmount)
      .then((found) => {
        if (live) update({ quote: found });
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
  }, [ranOut, quote, draft.asset, draft.rate, draft.xmrAmount, update]);

  if (
    !ok ||
    !onRobinhoodChain(connection) ||
    quote?.amount == null ||
    draft.chain === null ||
    draft.provider === null
  ) {
    return null;
  }

  const refund = draft.refundAddress;
  const refundValid = MONERO_ADDRESS_PATTERN.test(refund);
  const refundError = refund !== "" && !refundValid ? COPY.receive.refundInvalid : null;
  const timeLeft = validUntil === null ? null : formatTimeLeft(validUntil, now);
  const chain = COPY.chains[draft.chain];
  const provider = COPY.providers[draft.provider];

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
    creationKey.current ??= randomToken(CREATION_KEY_BYTES);
    try {
      const created = await client.createPay({
        asset: draft.asset,
        rate: draft.rate,
        xmrAmount: draft.xmrAmount,
        address: connection.address,
        refundAddress: refund,
        rateId: quote.rateId,
        creationKey: creationKey.current,
      });
      putSwap(recordOf(created, draft.rate, quote.validUntil));
      reset();
      navigate(ROUTES.swap(created.id));
    } catch (error) {
      setFailure(describeError(error));
      setOpening(false);
    }
  };

  return (
    <PageFrame
      wide
      title={COPY.receive.title}
      lead={client.sample ? `${COPY.receive.transactionLead} ${COPY.receive.sampleLead}` : COPY.receive.transactionLead}
    >
      <Stepper current={4} />
      <Glass>
        <Field
          label={COPY.receive.refundField}
          mono
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          hint={COPY.receive.refundHint}
          good={refundValid ? COPY.receive.refundValid : null}
          value={refund}
          onChange={(event) => update({ refundAddress: event.target.value.trim() })}
          error={refundError}
          action={
            <PillButton tone="quiet" small onClick={() => void paste()}>
              {COPY.receive.paste}
            </PillButton>
          }
        />
        <p className="t-small faint">{COPY.receive.refundTip}</p>
      </Glass>
      <Surface>
        <p className="t-card-title">{COPY.receive.review}</p>
        <dl className="facts">
          <Fact label={COPY.receive.youSend}>
            {formatXmr(Number(draft.xmrAmount))} {chain.coin}
          </Fact>
          <Fact label={COPY.receive.youGet}>
            {formatAsset(quote.amount, draft.asset)} {draft.asset}
          </Fact>
          <Fact label={COPY.receive.provider}>{provider.name}</Fact>
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
        {ranOut && <Notice tone="warn">{COPY.receive.quoteRanOut}</Notice>}
        {failure !== null && <Notice tone="warn">{failure}</Notice>}
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
