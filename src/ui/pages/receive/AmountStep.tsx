import { useEffect, useState } from "react";

import { AMOUNT_PATTERN, XMR_DECIMALS } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { decimalsOf } from "../../../gate/amount.ts";
import { OPEN_PROVIDERS } from "../../../gate/catalog.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { widestRange, type XmrRange } from "../../../gate/ranges.ts";
import type { ChainAsset } from "../../../gate/types.ts";
import { client } from "../../../gate/use-client.ts";
import { formatXmr } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { CoinPill, Glass, PageFrame, PillButton, SwapBox, Waiting } from "../../widgets/bits.tsx";
import { Icon } from "../../widgets/Icon.tsx";
import { COIN_LOGOS } from "../../coin-logos.ts";
import { Stepper } from "./Stepper.tsx";
import { useStepGuard, validAmount } from "./steps.ts";

const ASSETS: readonly ChainAsset[] = ["USDG", "ETH"];

/** The second step of receive: the XMR to send and the coin that arrives, in the boxes of the form of pay. */
export function AmountStep() {
  const ok = useStepGuard(1);
  const { draft, update } = useDraft();
  const [range, setRange] = useState<XmrRange | null>(null);
  const { asset, rate, xmrAmount } = draft;

  // The widest range over the providers: an amount inside it has at least one, which the next step shows.
  useEffect(() => {
    let live = true;
    Promise.allSettled(OPEN_PROVIDERS.map((provider) => client.payRange(provider, asset, rate))).then((results) => {
      const found = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      // A provider that gave no range tells it when the amount falls outside it, on the next step.
      if (live) setRange(widestRange(found));
    });
    return () => {
      live = false;
    };
  }, [asset, rate]);

  if (!ok) return null;

  const valid = validAmount(xmrAmount);
  const amount = Number(xmrAmount);
  const outside =
    valid && range !== null && (amount < range.minXmr || (range.maxXmr !== null && amount > range.maxXmr));
  const error =
    xmrAmount !== "" && !AMOUNT_PATTERN.test(xmrAmount)
      ? COPY.receive.badAmount
      : xmrAmount !== "" && decimalsOf(xmrAmount) > XMR_DECIMALS
        ? COPY.receive.tooManyDecimals(XMR_DECIMALS)
        : outside && range !== null
          ? amount < range.minXmr
            ? COPY.receive.belowMin(formatXmr(range.minXmr))
            : COPY.receive.aboveMax(formatXmr(range.maxXmr ?? amount))
          : null;
  const rangeHint =
    range === null
      ? null
      : range.maxXmr === null
        ? COPY.receive.rangeFrom(formatXmr(range.minXmr))
        : COPY.receive.rangeHint(formatXmr(range.minXmr), formatXmr(range.maxXmr));

  return (
    <PageFrame wide title={COPY.receive.title} lead={COPY.receive.amountLead}>
      <Stepper current={1} />
      <Glass>
        <SwapBox
          label={COPY.receive.youSend}
          coin={<CoinPill code="XMR" sub={COPY.receive.onMonero} logo={COIN_LOGOS.XMR} />}
          notes={
            error !== null ? (
              <p className="t-small danger-text">{error}</p>
            ) : rangeHint !== null ? (
              <p className="t-small soft">{rangeHint}</p>
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
            value={xmrAmount}
            onChange={(event) => update({ xmrAmount: event.target.value.trim(), quote: null })}
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
