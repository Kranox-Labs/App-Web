import { useEffect, useMemo, useState } from "react";

import { AMOUNT_PATTERN } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { decimalsOf } from "../../../gate/amount.ts";
import { providersOf, ratesOf } from "../../../gate/catalog.ts";
import { CHAIN_FACTS } from "../../../gate/chains.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { widestRange, type FromRange } from "../../../gate/ranges.ts";
import type { ChainAsset } from "../../../gate/types.ts";
import { client } from "../../../gate/use-client.ts";
import { formatFrom } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { CHAIN_LOGOS } from "../../chain-logos.ts";
import { CoinPill, Glass, PageFrame, PillButton, SwapBox, Waiting } from "../../widgets/bits.tsx";
import { Icon } from "../../widgets/Icon.tsx";
import { COIN_LOGOS } from "../../coin-logos.ts";
import { Stepper } from "./Stepper.tsx";
import { useStepGuard, validAmount } from "./steps.ts";

const ASSETS: readonly ChainAsset[] = ["USDG", "ETH"];

/** The second step of receive: the coins to send and the coin that arrives, in the boxes of the form of pay. */
export function AmountStep() {
  const ok = useStepGuard(1);
  const { draft, update } = useDraft();
  const { chain, asset, fromAmount } = draft;
  // The range belongs to the chain and the coin it was read for; another one shows none until its own came.
  // The widest range of the providers of the chain, and whether every provider gave its range: a range with one
  // missing advises and blocks nothing, since the missing provider may take the amount (D-29 of the scan of 13 Oct 2026).
  const [read, setRead] = useState<{ key: string; range: FromRange | null; complete: boolean } | null>(null);
  const key = `${String(chain)}:${asset}`;
  const done = read !== null && read.key === key;
  const range = done ? read.range : null;
  const complete = done && read.complete;
  // Every provider of the chain at every rate it serves: the widest range over them holds an amount that at least
  // one of them takes at some rate, which the next step shows and settles (D-21 of the scan of 13 Oct 2026).
  const pairs = useMemo(
    () => (chain === null ? [] : providersOf(chain).flatMap((id) => ratesOf(id).map((rate) => ({ id, rate })))),
    [chain],
  );

  useEffect(() => {
    if (chain === null) return;
    let live = true;
    Promise.allSettled(pairs.map((pair) => client.payRange(pair.id, chain, asset, pair.rate))).then((results) => {
      const found = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      // A provider that gave no range tells it when the amount falls outside it, on the next step.
      if (live) setRead({ key, range: widestRange(found), complete: found.length === pairs.length });
    });
    return () => {
      live = false;
    };
  }, [chain, asset, pairs, key]);

  if (!ok || chain === null) return null;

  const facts = CHAIN_FACTS[chain];
  const words = COPY.chains[chain];
  const valid = validAmount(fromAmount, chain);
  const amount = Number(fromAmount);
  const outside =
    valid &&
    complete &&
    range !== null &&
    (amount < range.minFrom || (range.maxFrom !== null && amount > range.maxFrom));
  const error =
    fromAmount !== "" && !AMOUNT_PATTERN.test(fromAmount)
      ? COPY.receive.badAmount
      : fromAmount !== "" && decimalsOf(fromAmount) > facts.decimals
        ? COPY.receive.tooManyDecimals(facts.decimals)
        : outside && range !== null
          ? amount < range.minFrom
            ? COPY.receive.belowMin(formatFrom(range.minFrom, chain), facts.coin)
            : COPY.receive.aboveMax(formatFrom(range.maxFrom ?? amount, chain), facts.coin)
          : null;
  const rangeHint =
    range === null
      ? null
      : !complete
        ? COPY.receive.rangePartial
        : range.maxFrom === null
          ? COPY.receive.rangeFrom(formatFrom(range.minFrom, chain), facts.coin)
          : COPY.receive.rangeHint(formatFrom(range.minFrom, chain), formatFrom(range.maxFrom, chain), facts.coin);

  return (
    <PageFrame wide title={COPY.receive.title} lead={COPY.receive.amountLead}>
      <Stepper current={1} />
      <Glass>
        <SwapBox
          label={COPY.receive.youSend}
          coin={<CoinPill code={facts.coin} sub={COPY.receive.onChainOf(words.name)} logo={CHAIN_LOGOS[chain]} />}
          notes={
            error !== null ? (
              <p className="t-small danger-text">{error}</p>
            ) : rangeHint !== null ? (
              <p className="t-small soft">{rangeHint}</p>
            ) : done ? (
              <p className="t-small soft">{COPY.receive.rangeUnknown}</p>
            ) : (
              <p>
                <Waiting>{COPY.receive.rangeLoading}</Waiting>
              </p>
            )
          }
        >
          <input
            className="swapbox__input t-send-figure"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder={COPY.receive.amountHint}
            aria-label={COPY.receive.youSend}
            value={fromAmount}
            onChange={(event) => update({ fromAmount: event.target.value.trim(), quote: null })}
          />
        </SwapBox>
        <div className="swap-arrow" aria-hidden="true">
          <Icon name="arrowDown" size={18} />
        </div>
        <SwapBox
          label={COPY.receive.arrivesAs}
          coin={
            <CoinPill
              code={asset}
              sub={COPY.receive.onChain}
              logo={COIN_LOGOS[asset]}
              menu={{
                options: ASSETS,
                value: asset,
                logoOf: (choice) => COIN_LOGOS[choice],
                onChange: (choice) => update({ asset: choice, quote: null }),
              }}
            />
          }
        >
          <p className="t-body-regular soft">{COPY.receive.arrivesText}</p>
        </SwapBox>
        <PillButton expand disabled={!valid || outside} onClick={() => navigate(ROUTES.receiveProvider)}>
          {COPY.receive.continue}
        </PillButton>
      </Glass>
    </PageFrame>
  );
}
