import { useEffect, useState } from "react";

import { QUOTE_DELAY_MS } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { OPEN_PROVIDERS, PROVIDERS } from "../../../gate/catalog.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { describeError } from "../../../gate/errors.ts";
import { quoteHolds, quoteMatches } from "../../../gate/quote.ts";
import type { PayQuote, PayRange, PayRate, ProviderId } from "../../../gate/types.ts";
import { client } from "../../../gate/use-client.ts";
import { formatAsset, formatTimeLeft, formatXmr } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useNow } from "../../../use-now.ts";
import { useWallet } from "../../../wallet/provider.ts";
import { ChoiceCard, Glass, PageFrame, PillButton } from "../../widgets/bits.tsx";
import { Icon } from "../../widgets/Icon.tsx";
import { Link } from "../../widgets/Link.tsx";
import { PROVIDER_LOGOS } from "../../provider-logos.ts";
import { Stepper } from "./Stepper.tsx";
import { onRobinhoodChain, useStepGuard } from "./steps.ts";

const RATES: readonly PayRate[] = ["fixed", "floating"];

/** The quote of one provider for the amount, or why it has none. */
type ProviderQuote = { quote: PayQuote; error: null } | { quote: null; error: string };

type Quotes = Partial<Record<ProviderId, ProviderQuote>>;

/** The ranges of the rates, each under the provider and the rate it belongs to. */
type Ranges = Partial<Record<string, PayRange>>;

const rangeKey = (provider: ProviderId, rate: PayRate): string => `${provider}:${rate}`;

/** The amount a provider gives, when its quote has one and still holds. */
function amountOf(own: ProviderQuote | undefined, now: number): number | null {
  if (own === undefined || own.quote === null || own.quote.amount === null || !quoteHolds(own.quote, now)) return null;
  return own.quote.amount;
}

/** The provider whose quote gives the most of the quotes that hold, or null before any came. */
function bestOf(quotes: Quotes, now: number): ProviderId | null {
  let best: { id: ProviderId; amount: number } | null = null;
  for (const id of OPEN_PROVIDERS) {
    const amount = amountOf(quotes[id], now);
    if (amount !== null && (best === null || amount > best.amount)) best = { id, amount };
  }
  return best?.id ?? null;
}

/** The line under a quote that has no amount: the range it fell outside of, or what went wrong. */
function quoteProblem(own: ProviderQuote | undefined): string | null {
  if (own === undefined) return null;
  if (own.quote === null) return own.error;
  const { limit, minXmr, maxXmr } = own.quote;
  if (limit === "below" && minXmr !== null) return COPY.receive.belowMin(formatXmr(minXmr));
  if (limit === "above" && maxXmr !== null) return COPY.receive.aboveMax(formatXmr(maxXmr));
  return null;
}

/** The third step of receive: the providers that make the swap, each with its quote, and the rate. */
export function ProviderStep() {
  const ok = useStepGuard(2);
  const { draft, update } = useDraft();
  const { connection } = useWallet();
  const now = useNow();
  const { asset, rate, xmrAmount, quote, provider } = draft;
  const [ranges, setRanges] = useState<Ranges>({});
  // The quotes of the last batch. A quote of the draft that still answers it seeds the list, so that a return to this
  // step shows it; the other providers are asked again (D-05 of the scan of 12 Oct 2026).
  const [quotes, setQuotes] = useState<Quotes>(() =>
    quote !== null && quoteMatches(quote, draft) ? { [quote.provider]: { quote, error: null } } : {},
  );
  // How many batches are in flight: a batch counts itself out when it ends, whether the step still wants it or not,
  // so that "Getting the quote…" never sticks (D-02).
  const [inFlight, setInFlight] = useState(0);
  // Each tap on a provider card asks once more when the quotes are missing (D-09).
  const [tries, setTries] = useState(0);
  const quoting = inFlight > 0;

  // The first open provider is the choice until the user picks another.
  useEffect(() => {
    const first = OPEN_PROVIDERS[0];
    if (provider === null && first !== undefined) update({ provider: first });
  }, [provider, update]);

  // The range of each rate at the chosen provider, for the cards of the rate.
  useEffect(() => {
    if (provider === null) return;
    let live = true;
    for (const each of RATES) {
      client
        .payRange(provider, asset, each)
        .then((found) => {
          if (live) setRanges((current) => ({ ...current, [rangeKey(provider, each)]: found }));
        })
        .catch(() => {
          // The quote tells the range when the amount falls outside it.
        });
    }
    return () => {
      live = false;
    };
  }, [provider, asset]);

  // A batch of quotes is needed when the draft has no quote for its provider, coin, rate, and amount, when a provider
  // has none yet, or when the chosen quote ran out (D-01, D-06).
  const missing = OPEN_PROVIDERS.some((id) => quotes[id] === undefined);
  const chosenHolds = quote !== null && quoteMatches(quote, draft) && quoteHolds(quote, now);
  const needs = !chosenHolds || missing;

  // The quotes of every provider for the amount, a moment after a change. The chosen provider's quote becomes the
  // quote of the draft. A batch that the step no longer wants is dropped.
  useEffect(() => {
    if (!ok || !needs) return;
    let live = true;
    const timer = window.setTimeout(async () => {
      setInFlight((count) => count + 1);
      try {
        const found = await Promise.all(
          OPEN_PROVIDERS.map(async (id): Promise<[ProviderId, ProviderQuote]> => {
            try {
              return [id, { quote: await client.payQuote(id, asset, rate, xmrAmount), error: null }];
            } catch (error) {
              return [id, { quote: null, error: describeError(error) }];
            }
          }),
        );
        if (!live) return;
        const next: Quotes = Object.fromEntries(found);
        setQuotes(next);
        const chosen = provider === null ? null : (next[provider]?.quote ?? null);
        if (chosen !== null) update({ quote: chosen });
      } finally {
        setInFlight((count) => count - 1);
      }
    }, QUOTE_DELAY_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [ok, needs, asset, rate, xmrAmount, provider, tries, update]);

  if (!ok) return null;

  const best = bestOf(quotes, now);
  const ready = chosenHolds && quote.amount !== null && !quoting;
  // When the chosen provider has no amount, the line under the button names a provider that has one, or says that
  // none does (D-07).
  const chosenAmount = provider === null ? null : amountOf(quotes[provider], now);
  const other = OPEN_PROVIDERS.find((id) => id !== provider && amountOf(quotes[id], now) !== null);
  const guidance =
    quoting || chosenAmount !== null || missing
      ? null
      : other !== undefined
        ? COPY.receive.otherProviderTakes(COPY.providers[other].name)
        : COPY.receive.noProviderTakes;

  const goOn = () => {
    if (onRobinhoodChain(connection)) {
      navigate(ROUTES.receivePrivacy);
    } else {
      update({ returnTo: ROUTES.receivePrivacy });
      navigate(ROUTES.connect);
    }
  };

  const pick = (id: ProviderId) => {
    // The cached quote of the provider counts only when it answers the draft as it stands.
    const cached = quotes[id]?.quote ?? null;
    const usable = cached !== null && quoteMatches(cached, { ...draft, provider: id }) ? cached : null;
    update({ provider: id, quote: usable });
    setTries((count) => count + 1);
  };

  const pickRate = (next: PayRate) => {
    // The quotes of the old rate are no quotes of the new one.
    setQuotes({});
    update({ rate: next, quote: null });
  };

  const rangeNote = (each: PayRate): string | null => {
    const found = provider === null ? undefined : ranges[rangeKey(provider, each)];
    return found === undefined ? null : COPY.receive.minLine(formatXmr(found.minXmr));
  };

  return (
    <PageFrame wide title={COPY.receive.title} lead={COPY.receive.providerLead}>
      <Stepper current={2} />
      <Glass>
        <div className="picks">
          {PROVIDERS.map((each) => {
            const words = COPY.providers[each.id];
            const on = provider === each.id;
            const own = quotes[each.id];
            const amount = amountOf(own, now);
            const timeLeft = own?.quote?.validUntil == null ? null : formatTimeLeft(own.quote.validUntil, now);
            const problem = quoteProblem(own);
            return (
              <button
                key={each.id}
                type="button"
                className={on ? "provider provider--on" : "provider"}
                aria-pressed={on}
                disabled={!each.open}
                onClick={() => pick(each.id)}
              >
                <span className="provider__head">
                  <span className="pick__mark" aria-hidden="true">
                    <img className="pick__logo" src={PROVIDER_LOGOS[each.id]} alt="" />
                  </span>
                  <span className="pick__body">
                    <span className="t-card-title">{words.name}</span>
                    <span className="t-small soft">{words.text}</span>
                  </span>
                  <span className="pick__end">
                    {best === each.id && OPEN_PROVIDERS.length > 1 && (
                      <span className="tag">{COPY.receive.bestRate}</span>
                    )}
                    {on && <Icon name="checkCircle" size={20} className="accent" />}
                  </span>
                </span>
                <span className="provider__quote">
                  <span className="t-label soft">{COPY.receive.youGet}</span>
                  <span className="t-swap-figure" aria-live="polite">
                    {amount !== null ? (
                      COPY.receive.youGetLine(formatAsset(amount, asset), asset)
                    ) : (
                      <span className="faint">{COPY.receive.amountHint}</span>
                    )}
                  </span>
                  {quoting && <span className="t-small soft">{COPY.receive.quoting}</span>}
                  {!quoting && problem !== null && <span className="t-small danger-text">{problem}</span>}
                  {amount !== null && own?.quote && (
                    <>
                      <span className="t-small soft">
                        {COPY.receive.rateLine(formatAsset(amount / Number(xmrAmount), asset), asset)}
                      </span>
                      {timeLeft !== null && <span className="t-small soft">{COPY.receive.fixedLine(timeLeft)}</span>}
                      {own.quote.withdrawalFee !== null && own.quote.withdrawalFee > 0 && (
                        <span className="t-small soft">
                          {COPY.receive.feeLine(formatAsset(own.quote.withdrawalFee, asset), asset)}
                        </span>
                      )}
                      {own.quote.speedMinutes !== null && (
                        <span className="t-small soft">{COPY.receive.speedLine(own.quote.speedMinutes)}</span>
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
              note={rangeNote("fixed")}
              onClick={() => pickRate("fixed")}
            />
            <ChoiceCard
              on={rate === "floating"}
              icon="trendingUp"
              title={COPY.receive.floatingRate}
              text={COPY.receive.floatingText}
              note={rangeNote("floating")}
              onClick={() => pickRate("floating")}
            />
          </div>
        </div>
        {guidance !== null && (
          <p className="t-small soft text-center">
            {guidance}
            {other === undefined && (
              <>
                {" "}
                <Link href={ROUTES.receiveAmount}>{COPY.receive.changeAmount}</Link>
              </>
            )}
          </p>
        )}
        <PillButton expand disabled={!ready} onClick={goOn}>
          {COPY.receive.continue}
        </PillButton>
      </Glass>
    </PageFrame>
  );
}
