import { useEffect, useState } from "react";

import { QUOTE_DELAY_MS } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { PROVIDERS } from "../../../gate/catalog.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { describeError } from "../../../gate/errors.ts";
import type { PayRange, PayRate } from "../../../gate/types.ts";
import { client } from "../../../gate/use-client.ts";
import { formatAsset, formatTimeLeft, formatXmr } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useNow } from "../../../use-now.ts";
import { useWallet } from "../../../wallet/provider.ts";
import { ChoiceCard, Glass, PageFrame, PillButton } from "../../widgets/bits.tsx";
import { Icon } from "../../widgets/Icon.tsx";
import { Stepper } from "./Stepper.tsx";
import { onRobinhoodChain, useStepGuard } from "./steps.ts";

const RATES: readonly PayRate[] = ["fixed", "floating"];

/** The third step of receive: the provider that makes the swap, with its quote, and the rate. */
export function ProviderStep() {
  const ok = useStepGuard(2);
  const { draft, update } = useDraft();
  const { connection } = useWallet();
  const now = useNow();
  const [ranges, setRanges] = useState<Partial<Record<PayRate, PayRange>>>({});
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const { asset, rate, xmrAmount, quote, provider } = draft;

  // The one provider is the choice until there are more.
  useEffect(() => {
    if (provider === null) update({ provider: "changenow" });
  }, [provider, update]);

  // The range of each rate, for the cards of the rate.
  useEffect(() => {
    let live = true;
    for (const each of RATES) {
      client
        .payRange(asset, each)
        .then((found) => {
          if (live) setRanges((current) => ({ ...current, [each]: found }));
        })
        .catch(() => {
          // The quote tells the range when the amount falls outside it.
        });
    }
    return () => {
      live = false;
    };
  }, [asset]);

  // The quote of the provider for the amount, a moment after the rate changes, and again when it is missing.
  useEffect(() => {
    if (!ok || quote !== null) return;
    let live = true;
    const timer = window.setTimeout(async () => {
      setQuoting(true);
      setQuoteError(null);
      try {
        const found = await client.payQuote(asset, rate, xmrAmount);
        if (live) update({ quote: found });
      } catch (error) {
        if (live) setQuoteError(describeError(error));
      } finally {
        if (live) setQuoting(false);
      }
    }, QUOTE_DELAY_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [ok, quote, asset, rate, xmrAmount, update]);

  if (!ok) return null;

  const timeLeft = quote?.validUntil == null ? null : formatTimeLeft(quote.validUntil, now);
  const limitError =
    quote?.limit === "below" && quote.minXmr !== null
      ? COPY.receive.belowMin(formatXmr(quote.minXmr))
      : quote?.limit === "above" && quote.maxXmr !== null
        ? COPY.receive.aboveMax(formatXmr(quote.maxXmr))
        : quoteError;
  const ready = quote !== null && quote.amount !== null && !quoting;

  const goOn = () => {
    if (onRobinhoodChain(connection)) {
      navigate(ROUTES.receivePrivacy);
    } else {
      update({ returnTo: ROUTES.receivePrivacy });
      navigate(ROUTES.connect);
    }
  };

  return (
    <PageFrame wide title={COPY.receive.title} lead={COPY.receive.providerLead}>
      <Stepper current={2} />
      <Glass>
        <div className="picks">
          {PROVIDERS.map((each) => {
            const words = COPY.providers[each.id];
            const on = provider === each.id;
            return (
              <button
                key={each.id}
                type="button"
                className={on ? "provider provider--on" : "provider"}
                aria-pressed={on}
                onClick={() => update({ provider: each.id })}
              >
                <span className="provider__head">
                  <span className="pick__mark t-small-strong" aria-hidden="true">
                    {words.name.charAt(0)}
                  </span>
                  <span className="pick__body">
                    <span className="t-card-title">{words.name}</span>
                    <span className="t-small soft">{words.text}</span>
                  </span>
                  <span className="pick__end">{on && <Icon name="checkCircle" size={20} className="accent" />}</span>
                </span>
                <span className="provider__quote">
                  <span className="t-label soft">{COPY.receive.youGet}</span>
                  <span className="t-swap-figure" aria-live="polite">
                    {quote?.amount != null ? (
                      COPY.receive.youGetLine(formatAsset(quote.amount, asset), asset)
                    ) : (
                      <span className="faint">{COPY.receive.amountHint}</span>
                    )}
                  </span>
                  {quoting && <span className="t-small soft">{COPY.receive.quoting}</span>}
                  {limitError !== null && <span className="t-small danger-text">{limitError}</span>}
                  {quote?.amount != null && (
                    <>
                      <span className="t-small soft">
                        {COPY.receive.rateLine(formatAsset(quote.amount / Number(xmrAmount), asset), asset)}
                      </span>
                      {timeLeft !== null && <span className="t-small soft">{COPY.receive.fixedLine(timeLeft)}</span>}
                      {quote.withdrawalFee !== null && quote.withdrawalFee > 0 && (
                        <span className="t-small soft">
                          {COPY.receive.feeLine(formatAsset(quote.withdrawalFee, asset), asset)}
                        </span>
                      )}
                      {quote.speedMinutes !== null && (
                        <span className="t-small soft">{COPY.receive.speedLine(quote.speedMinutes)}</span>
                      )}
                    </>
                  )}
                </span>
                <span className="provider__sees">
                  <span className="t-small-strong soft">{COPY.receive.sees}</span>
                  <span className="t-small soft">{words.sees}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="stack">
          <p className="t-label soft">{COPY.receive.rate}</p>
          <div className="choices">
            <ChoiceCard
              on={rate === "fixed"}
              icon="lock"
              title={COPY.receive.fixedRate}
              text={COPY.receive.fixedText}
              note={ranges.fixed === undefined ? null : COPY.receive.minLine(formatXmr(ranges.fixed.minXmr))}
              onClick={() => update({ rate: "fixed", quote: null })}
            />
            <ChoiceCard
              on={rate === "floating"}
              icon="trendingUp"
              title={COPY.receive.floatingRate}
              text={COPY.receive.floatingText}
              note={ranges.floating === undefined ? null : COPY.receive.minLine(formatXmr(ranges.floating.minXmr))}
              onClick={() => update({ rate: "floating", quote: null })}
            />
          </div>
        </div>
        <PillButton expand disabled={!ready} onClick={goOn}>
          {COPY.receive.continue}
        </PillButton>
      </Glass>
    </PageFrame>
  );
}
