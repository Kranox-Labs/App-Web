import { useEffect, useState } from "react";

import { AMOUNT_PATTERN } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { useDraft } from "../../../door/draft.tsx";
import type { ChainAsset, PayRange } from "../../../door/types.ts";
import { client } from "../../../door/use-client.ts";
import { formatXmr } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { CoinPill, Glass, PageFrame, PillButton, SwapBox } from "../../widgets/bits.tsx";
import { Icon } from "../../widgets/Icon.tsx";
import { Stepper } from "./Stepper.tsx";
import { useStepGuard, validAmount } from "./steps.ts";

const ASSETS: readonly ChainAsset[] = ["USDG", "ETH"];

/** The second step of receive: the XMR to send and the coin that arrives, in the boxes of the form of pay. */
export function AmountStep() {
  const ok = useStepGuard(1);
  const { draft, update } = useDraft();
  const [range, setRange] = useState<PayRange | null>(null);
  const { asset, rate, xmrAmount } = draft;

  useEffect(() => {
    let live = true;
    client
      .payRange(asset, rate)
      .then((found) => {
        if (live) setRange(found);
      })
      .catch(() => {
        // The provider tells the range when the amount falls outside it.
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
          coin={<CoinPill code="XMR" sub={COPY.receive.onMonero} />}
          notes={
            error !== null ? (
              <p className="t-small danger-text">{error}</p>
            ) : (
              rangeHint !== null && <p className="t-small soft">{rangeHint}</p>
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
          label={COPY.receive.youGet}
          coin={
            <CoinPill
              code={asset}
              sub={COPY.receive.onChain}
              menu={{ options: ASSETS, value: asset, onChange: (choice) => update({ asset: choice, quote: null }) }}
            />
          }
          notes={<p className="t-small soft">{COPY.receive.quoteNext}</p>}
        >
          <p className="t-send-figure faint">{COPY.receive.amountHint}</p>
        </SwapBox>
        <PillButton expand disabled={!valid || outside} onClick={() => navigate(ROUTES.receiveProvider)}>
          {COPY.receive.continue}
        </PillButton>
      </Glass>
    </PageFrame>
  );
}
