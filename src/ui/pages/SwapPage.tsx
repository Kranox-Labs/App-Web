import { useEffect, useState } from "react";

import { STATUS_INTERVAL_MS } from "../../chain.ts";
import { COPY } from "../../copy.ts";
import { CHAIN_FACTS } from "../../gate/chains.ts";
import { findSwap, putSwap, useSwaps, withDeposit, withState, type SwapRecord } from "../../gate/store.ts";
import { isOpen, type SwapStatus } from "../../gate/types.ts";
import { client } from "../../gate/use-client.ts";
import { formatAsset, formatFrom, formatMoment, formatSend, formatTimeLeft, shortAddress } from "../../format.ts";
import { ROUTES } from "../../router.ts";
import { useNow } from "../../use-now.ts";
import { switchToRobinhoodChain, useWallet } from "../../wallet/provider.ts";
import { sendTransfer, transferOf } from "../../wallet/transfer.ts";
import { onRobinhoodChain } from "./receive/steps.ts";
import {
  AddressBox,
  Fact,
  Glass,
  Notice,
  PageFrame,
  PillButton,
  QrCode,
  Steps,
  Surface,
  Waiting,
  type StepEnd,
} from "../widgets/bits.tsx";
import { Link } from "../widgets/Link.tsx";

/** The code with which a wallet says that the user refused (EIP-1193). */
const USER_REFUSED_CODE = 4001;

/**
 * A swap out whose provider names no time to send gets one of the app: after this long since it opened, the button
 * goes away and the page says to open a new swap, since whether a provider still watches an old deposit address is
 * not checked (D-34 of the scan of 13 Oct 2026).
 */
const SEND_CEILING_MS = 24 * 3_600_000;

/**
 * The button of the way out that asks the wallet to send the deposit: one transfer of exactly the amount of the swap
 * to its deposit address, on Robinhood Chain, which the wallet signs and sends itself. It shows for the wallet that
 * opened the swap, which takes the refund, while that wallet is on Robinhood Chain; another wallet, another network,
 * or none gets a line instead. The hash the wallet answers goes into the record, until the provider names the
 * deposit itself; a wallet that names no hash sent all the same, and the record says so.
 */
function SendFromWallet({ record, now }: { record: SwapRecord; now: number }) {
  const { connection, busy } = useWallet();
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const amount = formatSend(record.fromAmount, record.asset);
  if (record.depositHash !== null) return <Notice tone="good">{COPY.swap.sent}</Notice>;
  if (record.depositSentAt !== null) return <Notice tone="good">{COPY.swap.sentNoHash}</Notice>;
  if (record.validUntil === null && now - Date.parse(record.createdAt) > SEND_CEILING_MS) {
    return <Notice tone="warn">{COPY.swap.tooOld}</Notice>;
  }
  if (connection === null) {
    return (
      <Notice>
        {COPY.swap.connectToSend} <Link href={ROUTES.connect}>{COPY.wallet.connect}</Link>
      </Notice>
    );
  }
  const sender = record.refundAddress;
  if (sender === null || connection.address.toLowerCase() !== sender.toLowerCase()) {
    return <Notice>{COPY.swap.otherWallet(shortAddress(sender ?? ""))}</Notice>;
  }
  // The transfer names Robinhood Chain, so a wallet on another network would refuse it; the page says so first (D-32).
  if (!onRobinhoodChain(connection)) {
    return (
      <>
        <Notice tone="warn">{COPY.swap.wrongChainOut}</Notice>
        <PillButton
          expand
          tone="solid"
          busy={busy}
          busyLabel={COPY.wallet.connecting}
          onClick={() => void switchToRobinhoodChain()}
        >
          {COPY.wallet.switchChain}
        </PillButton>
      </>
    );
  }
  const send = async () => {
    setSending(true);
    setOutcome(null);
    try {
      const transfer = transferOf({
        asset: record.asset,
        amount,
        from: connection.address,
        to: record.depositAddress,
      });
      const hash = await sendTransfer(connection.choice.provider, transfer);
      const current = findSwap(record.id);
      if (current !== null) putSwap(withDeposit(current, hash));
    } catch (error) {
      const code: unknown = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : null;
      setOutcome(code === USER_REFUSED_CODE ? COPY.swap.sendRefused : COPY.swap.sendFailed);
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <PillButton expand busy={sending} busyLabel={COPY.swap.sending} onClick={() => void send()}>
        {COPY.swap.sendButton}
      </PillButton>
      {outcome !== null && <Notice tone="warn">{outcome}</Notice>}
      <p className="t-small soft text-center">{COPY.swap.byHand}</p>
    </>
  );
}

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

/** The page of one swap: where to send the coins while it waits, then its steps until the coins arrive. */
export function SwapPage({ id }: { id: string }) {
  const swaps = useSwaps();
  const now = useNow();
  const record = swaps.find((swap) => swap.id === id) ?? null;
  const readToken = record?.readToken ?? null;
  const provider = record?.provider ?? null;
  const open = record !== null && isOpen(record.status);
  const [readFailed, setReadFailed] = useState(false);
  const [reading, setReading] = useState(false);

  // While the swap moves, the page reads its state now and then. The record in the store is always the newest.
  useEffect(() => {
    if (readToken === null || provider === null || !open) return;
    let live = true;
    const read = async () => {
      setReading(true);
      try {
        const state = await client.readSwap(provider, id, readToken);
        const current = findSwap(id);
        if (live && current !== null) putSwap(withState(current, state));
        if (live) setReadFailed(false);
      } catch {
        // The next read may come through; the page says so meanwhile.
        if (live) setReadFailed(true);
      } finally {
        if (live) setReading(false);
      }
    };
    void read();
    const timer = window.setInterval(() => void read(), STATUS_INTERVAL_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [id, readToken, provider, open]);

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

  const facts = CHAIN_FACTS[record.chain];
  const words = COPY.chains[record.chain];
  const out = record.direction === "out";
  const { step, end } = stepOf(record.status);
  const waiting = record.status === "new" || record.status === "waiting";
  const timeLeft = record.validUntil === null ? null : formatTimeLeft(record.validUntil, now);
  // Once the time to send ran out, the deposit address goes away, so that nobody sends to a swap that stopped waiting.
  const ranOut = record.validUntil !== null && timeLeft === null;
  // What was sent and what arrives, each in its coin: in, the coin of the chain into the coin on Robinhood Chain;
  // out, the other way round.
  const from = out ? formatSend(record.fromAmount, record.asset) : formatFrom(record.fromAmount, record.chain);
  const fromUnit = out ? record.asset : facts.coin;
  const amount = out ? formatFrom(record.amount, record.chain) : formatAsset(record.amount, record.asset);
  const toUnit = out ? facts.coin : record.asset;
  // A chain with a link of payment opens it in the wallet; the code shows the link, or the address alone. On the way
  // out the wallet that is connected sends, so the code shows the address alone.
  const link = out ? null : facts.paymentLink(record.depositAddress, from);
  const steps = out
    ? [
        { title: COPY.swap.stepsOut.waiting },
        { title: COPY.swap.stepsOut.confirming },
        { title: COPY.swap.stepsOut.exchanging },
        { title: COPY.swap.stepsOut.sending(words.name) },
        { title: COPY.swap.stepsOut.finished },
      ]
    : [
        { title: COPY.swap.steps.waiting },
        { title: COPY.swap.steps.confirming(words.name) },
        { title: COPY.swap.steps.exchanging },
        { title: COPY.swap.steps.sending },
        { title: COPY.swap.steps.finished },
      ];
  const note = out ? words.outNote : words.note;
  const sendTitle = out ? COPY.swap.sendTitleOut : COPY.swap.sendTitle(words.name);
  const lead = out ? COPY.swap.leadOut : COPY.swap.lead(words.name, record.rate);

  return (
    <PageFrame
      wide
      back={back}
      title={waiting ? sendTitle : COPY.swap.into(from, fromUnit, amount, toUnit)}
      lead={waiting ? lead : undefined}
    >
      {waiting && ranOut && <Notice tone="warn">{COPY.swap.expired}</Notice>}
      {waiting && !ranOut && note !== null && <Notice>{note}</Notice>}
      {waiting && !ranOut && (
        <Glass>
          <QrCode
            text={link ?? record.depositAddress}
            label={`${COPY.swap.depositAddress}: ${record.depositAddress}`}
          />
          <AddressBox label={COPY.swap.depositAddress} text={record.depositAddress} />
          <AddressBox label={COPY.swap.amountToSend} text={`${from} ${fromUnit}`} copy={from} figure />
          {out && <SendFromWallet record={record} now={now} />}
          {link !== null && (
            <a className="pill pill--solid pill--expand" href={link}>
              {COPY.swap.openWallet(words.name)}
            </a>
          )}
          {timeLeft !== null && <p className="t-small soft text-center">{COPY.swap.timeLeft(timeLeft)}</p>}
        </Glass>
      )}
      <Surface>
        <Steps steps={steps} current={step} end={end} />
        {reading && open && (
          <p>
            <Waiting>{COPY.swap.checking}</Waiting>
          </p>
        )}
        {readFailed && open && <p className="t-small danger-text">{COPY.swap.readFailed}</p>}
        {record.status === "finished" && (
          <Notice tone="good">
            {out ? COPY.swap.arrivedOut(amount, facts.coin, words.name) : COPY.swap.arrived(amount, record.asset)}
          </Notice>
        )}
        {record.status === "failed" && (
          <Notice tone="warn">{out ? COPY.swap.failedOut(record.asset) : COPY.swap.failed(facts.coin)}</Notice>
        )}
        {record.status === "refunded" && (
          <Notice>
            {out
              ? COPY.swap.refundedOut(
                  record.refundAmount === null ? null : formatSend(record.refundAmount, record.asset),
                  record.asset,
                )
              : COPY.swap.refunded(
                  record.refundAmount === null ? null : formatFrom(record.refundAmount, record.chain),
                  facts.coin,
                )}
          </Notice>
        )}
        {record.status === "verifying" && (
          <Notice tone="warn">{COPY.swap.verifying(COPY.providers[record.provider])}</Notice>
        )}
        {record.status === "expired" && (
          <Notice tone="warn">
            {out
              ? COPY.swap.expiredStepOut(COPY.providers[record.provider], record.asset)
              : COPY.swap.expiredStep(COPY.providers[record.provider], facts.coin)}
          </Notice>
        )}
      </Surface>
      <Surface>
        <dl className="facts">
          <Fact label={COPY.swap.youGet}>
            {amount} {toUnit}
          </Fact>
          <Fact label={COPY.swap.recipient} stack>
            <span className="t-mono">{record.payoutAddress}</span>
          </Fact>
          {record.refundAddress !== null && (
            <Fact label={COPY.swap.refundTo} stack>
              <span className="t-mono">{record.refundAddress}</span>
            </Fact>
          )}
          <Fact label={COPY.swap.provider}>{COPY.providers[record.provider].name}</Fact>
          <Fact label={COPY.swap.id}>
            <span className="t-mono">{record.id}</span>
          </Fact>
          <Fact label={COPY.swap.started}>{formatMoment(record.createdAt)}</Fact>
          {record.checkedAt !== null && <Fact label={COPY.swap.checked}>{formatMoment(record.checkedAt)}</Fact>}
        </dl>
        {record.depositHash !== null && (
          <AddressBox
            label={out ? COPY.swap.depositHashOut : COPY.swap.depositHash(words.name)}
            text={record.depositHash}
          />
        )}
        {record.payoutHash !== null && (
          <AddressBox
            label={out ? COPY.swap.payoutHashOut(words.name) : COPY.swap.payoutHash}
            text={record.payoutHash}
          />
        )}
        {record.refundHash !== null && (
          <AddressBox
            label={out ? COPY.swap.refundHashOut : COPY.swap.refundHash(words.name)}
            text={record.refundHash}
          />
        )}
      </Surface>
    </PageFrame>
  );
}
