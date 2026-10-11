import { useEffect } from "react";

import { STATUS_INTERVAL_MS } from "../../chain.ts";
import { COPY } from "../../copy.ts";
import { findSwap, putSwap, useSwaps, withState } from "../../door/store.ts";
import { isOpen, type SwapStatus } from "../../door/types.ts";
import { client } from "../../door/use-client.ts";
import { formatAsset, formatMoment, formatTimeLeft, formatXmr } from "../../format.ts";
import { ROUTES } from "../../router.ts";
import { useNow } from "../../use-now.ts";
import { AddressBox, Fact, Glass, Notice, PageFrame, QrCode, Steps, Surface, type StepEnd } from "../widgets/bits.tsx";

/** The sample swaps move faster than real ones, so their page reads them more often. */
const SAMPLE_INTERVAL_MS = 5000;

const STEPS = [
  { title: COPY.swap.steps.waiting },
  { title: COPY.swap.steps.confirming },
  { title: COPY.swap.steps.exchanging },
  { title: COPY.swap.steps.sending },
  { title: COPY.swap.steps.finished },
] as const;

/** The step of a status, and how the swap ended there when it stopped before its last step. */
function stepOf(status: SwapStatus): { step: number; end: StepEnd } {
  switch (status) {
    case "new":
    case "waiting":
      return { step: 0, end: null };
    case "confirming":
      return { step: 1, end: null };
    case "exchanging":
      return { step: 2, end: null };
    case "sending":
      return { step: 3, end: null };
    case "finished":
      return { step: 5, end: null };
    case "verifying":
      return { step: 2, end: "held" };
    case "refunded":
      return { step: 2, end: "refunded" };
    case "failed":
      return { step: 2, end: "failed" };
    case "expired":
      return { step: 0, end: "expired" };
  }
}

/** The page of one swap: where to send the XMR while it waits, then its steps until the coins arrive. */
export function SwapPage({ id }: { id: string }) {
  const swaps = useSwaps();
  const now = useNow();
  const record = swaps.find((swap) => swap.id === id) ?? null;
  const readToken = record?.readToken ?? null;
  const open = record !== null && isOpen(record.status);

  // While the swap moves, the page reads its state now and then. The record in the store is always the newest.
  useEffect(() => {
    if (readToken === null || !open) return;
    let live = true;
    const read = async () => {
      try {
        const state = await client.readSwap(id, readToken);
        const current = findSwap(id);
        if (live && current !== null) putSwap(withState(current, state));
      } catch {
        // The next read may come through.
      }
    };
    void read();
    const timer = window.setInterval(() => void read(), client.sample ? SAMPLE_INTERVAL_MS : STATUS_INTERVAL_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [id, readToken, open]);

  const back = { href: ROUTES.activity, label: COPY.swap.back };

  if (record === null) {
    return (
      <PageFrame title={id} back={back}>
        <Surface>
          <p className="t-body-regular soft">{COPY.swap.unknown}</p>
        </Surface>
      </PageFrame>
    );
  }

  const { step, end } = stepOf(record.status);
  const waiting = record.status === "new" || record.status === "waiting";
  const timeLeft = record.validUntil === null ? null : formatTimeLeft(record.validUntil, now);
  const xmr = formatXmr(record.xmrAmount);
  const amount = formatAsset(record.amount, record.asset);
  const uri = `monero:${record.depositAddress}?tx_amount=${xmr}`;

  return (
    <PageFrame
      wide
      back={back}
      title={waiting ? COPY.swap.sendExactly(xmr) : COPY.swap.into(xmr, amount, record.asset)}
      lead={waiting ? COPY.swap.lead : undefined}
    >
      {waiting && (
        <Glass>
          <QrCode text={uri} label={`${COPY.swap.depositAddress}: ${record.depositAddress}`} />
          <AddressBox label={COPY.swap.depositAddress} text={record.depositAddress} />
          <a className="pill pill--solid pill--expand" href={uri}>
            {COPY.swap.openWallet}
          </a>
          {record.validUntil !== null &&
            (timeLeft === null ? (
              <Notice tone="warn">{COPY.swap.expired}</Notice>
            ) : (
              <p className="t-small soft text-center">{COPY.swap.timeLeft(timeLeft)}</p>
            ))}
        </Glass>
      )}
      <Surface>
        <Steps steps={STEPS} current={step} end={end} />
        {record.status === "finished" && <Notice tone="good">{COPY.swap.arrived(amount, record.asset)}</Notice>}
        {record.status === "failed" && <Notice tone="warn">{COPY.swap.failed}</Notice>}
        {record.status === "refunded" && (
          <Notice>{COPY.swap.refunded(record.refundAmount === null ? null : formatXmr(record.refundAmount))}</Notice>
        )}
        {record.status === "verifying" && <Notice tone="warn">{COPY.swap.verifying}</Notice>}
        {record.status === "expired" && <Notice tone="warn">{COPY.swap.expiredStep}</Notice>}
      </Surface>
      <Surface>
        <dl className="facts">
          <Fact label={COPY.swap.youGet}>
            {amount} {record.asset}
          </Fact>
          <Fact label={COPY.swap.recipient} stack>
            <span className="t-mono">{record.payoutAddress}</span>
          </Fact>
          {record.refundAddress !== null && (
            <Fact label={COPY.swap.refundTo} stack>
              <span className="t-mono">{record.refundAddress}</span>
            </Fact>
          )}
          <Fact label={COPY.swap.id}>
            <span className="t-mono">{record.id}</span>
          </Fact>
          <Fact label={COPY.swap.started}>{formatMoment(record.createdAt)}</Fact>
          {record.checkedAt !== null && <Fact label={COPY.swap.checked}>{formatMoment(record.checkedAt)}</Fact>}
        </dl>
        {record.depositHash !== null && <AddressBox label={COPY.swap.depositHash} text={record.depositHash} />}
        {record.payoutHash !== null && <AddressBox label={COPY.swap.payoutHash} text={record.payoutHash} />}
        {record.refundHash !== null && <AddressBox label={COPY.swap.refundHash} text={record.refundHash} />}
      </Surface>
    </PageFrame>
  );
}
