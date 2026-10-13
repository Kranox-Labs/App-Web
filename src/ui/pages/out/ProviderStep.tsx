import { useEffect, useMemo, useState } from "react";

import { QUOTE_DELAY_MS } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { providersOutOf } from "../../../gate/catalog.ts";
import { CHAIN_FACTS } from "../../../gate/chains.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { describeError } from "../../../gate/errors.ts";
import { outQuoteMatches, quoteHolds } from "../../../gate/quote.ts";
import type { ChainAsset, OutQuote, ProviderId } from "../../../gate/types.ts";
import { client } from "../../../gate/use-client.ts";
import { formatFrom, formatRateOut, formatSend } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useNow } from "../../../use-now.ts";
import { useWallet } from "../../../wallet/provider.ts";
import { Glass, PageFrame, PillButton, Spinner, Waiting } from "../../widgets/bits.tsx";
import { Icon } from "../../widgets/Icon.tsx";
import { Link } from "../../widgets/Link.tsx";
import { PROVIDER_LOGOS } from "../../provider-logos.ts";
import { Stepper } from "../receive/Stepper.tsx";
import { onRobinhoodChain } from "../receive/steps.ts";
import { useOutStepGuard } from "./steps.ts";

/** The quote of one provider for the amount, or why it has none. */
type ProviderQuote = { quote: OutQuote; error: null } | { quote: null; error: string };

type Quotes = Partial<Record<ProviderId, ProviderQuote>>;

/** The amount a provider gives, when its quote has one and still holds. */
function amountOf(own: ProviderQuote | undefined, now: number): number | null {
  if (own === undefined || own.quote === null || own.quote.amount === null || !quoteHolds(own.quote, now)) return null;
  return own.quote.amount;
}

/** The provider whose quote gives the most of the quotes that hold, or null before any came. */
function bestOf(providers: readonly ProviderId[], quotes: Quotes, now: number): ProviderId | null {
  let best: { id: ProviderId; amount: number } | null = null;
  for (const id of providers) {
    const amount = amountOf(quotes[id], now);
    if (amount !== null && (best === null || amount > best.amount)) best = { id, amount };
  }
  return best?.id ?? null;
}

/** The line under a quote that has no amount: the range it fell outside of, or what went wrong. */
function quoteProblem(own: ProviderQuote | undefined, asset: ChainAsset): string | null {
  if (own === undefined) return null;
  if (own.quote === null) return own.error;
  const { limit, minFrom, maxFrom } = own.quote;
  if (limit === "below" && minFrom !== null) return COPY.receive.belowMin(formatSend(minFrom, asset), asset);
  if (limit === "above" && maxFrom !== null) return COPY.receive.aboveMax(formatSend(maxFrom, asset), asset);
  return null;
}

/** The third step of the way out: the providers that pay out the coin, each with its quote, at the floating rate. */
export function OutProviderStep() {
  const ok = useOutStepGuard(2);
  const { draft, update, updateOut } = useDraft();
  const { connection } = useWallet();
  const now = useNow();
  const { out } = draft;
  const { chain, asset, fromAmount, quote, provider } = out;
  const providers = useMemo(() => (chain === null ? [] : providersOutOf(chain)), [chain]);
  // The quotes of the last batch. A quote of the draft that still answers it seeds the list, so that a return to this
  // step shows it; the other providers are asked again (D-05 of the scan of 12 Oct 2026).
  const [quotes, setQuotes] = useState<Quotes>(() =>
    quote !== null && outQuoteMatches(quote, out) ? { [quote.provider]: { quote, error: null } } : {},
  );
  // How many batches are in flight, so that "Getting the quote…" never sticks (D-02); each tap on a provider card
  // asks once more when the quotes are missing (D-09); and the batch that answered last, by its draft and its try.
  const [inFlight, setInFlight] = useState(0);
  const [tries, setTries] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);

  // The first provider of the chain is the choice until the user picks another; a provider of another chain gives way.
  useEffect(() => {
    const first = providers[0];
    if ((provider === null || !providers.includes(provider)) && first !== undefined) {
      updateOut({ provider: first, quote: null });
    }
  }, [providers, provider, updateOut]);

  const missing = providers.some((id) => quotes[id] === undefined);
  const chosenHolds = quote !== null && outQuoteMatches(quote, out) && quoteHolds(quote, now);
  const needs = !chosenHolds || missing;
  const batchKey = `${String(chain)}:${asset}:${fromAmount}:${String(tries)}`;
  const quoting = inFlight > 0 || (ok && needs && answered !== batchKey);

  // The quotes of every provider for the amount, a moment after a change. The chosen provider's quote becomes the
  // quote of the draft. A batch that the step no longer wants is dropped.
  useEffect(() => {
    if (!ok || !needs || chain === null) return;
    let live = true;
    const timer = window.setTimeout(async () => {
      setInFlight((count) => count + 1);
      try {
        const found = await Promise.all(
          providers.map(async (id): Promise<[ProviderId, ProviderQuote]> => {
            try {
              return [id, { quote: await client.outQuote(id, chain, asset, fromAmount), error: null }];
            } catch (error) {
              return [id, { quote: null, error: describeError(error) }];
            }
          }),
        );
        if (!live) return;
        const next: Quotes = Object.fromEntries(found);
        setQuotes(next);
        const chosen = provider === null ? null : (next[provider]?.quote ?? null);
        if (chosen !== null) updateOut({ quote: chosen });
        setAnswered(batchKey);
      } finally {
        setInFlight((count) => count - 1);
      }
    }, QUOTE_DELAY_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [ok, needs, chain, asset, fromAmount, provider, providers, tries, updateOut, batchKey]);

  if (!ok || chain === null) return null;

  const facts = CHAIN_FACTS[chain];
  const best = bestOf(providers, quotes, now);
  const ready = chosenHolds && quote.amount !== null && !quoting;
  const chosenAmount = provider === null ? null : amountOf(quotes[provider], now);
  const other = providers.find((id) => id !== provider && amountOf(quotes[id], now) !== null);
  const guidance =
    quoting || chosenAmount !== null || missing
      ? null
      : other !== undefined
        ? COPY.receive.otherProviderTakes(COPY.providers[other].name)
        : COPY.receive.noProviderTakes;

  const goOn = () => {
    if (onRobinhoodChain(connection)) {
      navigate(ROUTES.outAddress);
    } else {
      update({ returnTo: ROUTES.outAddress });
      navigate(ROUTES.connect);
    }
  };

  const pick = (id: ProviderId) => {
    const cached = quotes[id]?.quote ?? null;
    const usable = cached !== null && outQuoteMatches(cached, { ...out, provider: id }) ? cached : null;
    updateOut({ provider: id, quote: usable });
    setTries((count) => count + 1);
  };

  return (
    <PageFrame wide title={COPY.out.title} lead={COPY.out.providerLead(asset, facts.coin)}>
      <Stepper current={2} steps={COPY.out.steps} />
      <Glass>
        <div className="picks">
          {providers.map((id) => {
            const words = COPY.providers[id];
            const on = provider === id;
            const own = quotes[id];
            const amount = amountOf(own, now);
            const problem = quoteProblem(own, asset);
            return (
              <button
                key={id}
                type="button"
                className={on ? "provider provider--on" : "provider"}
                aria-pressed={on}
                onClick={() => pick(id)}
              >
                <span className="provider__head">
                  <span className="pick__mark" aria-hidden="true">
                    <img className="pick__logo" src={PROVIDER_LOGOS[id]} alt="" />
                  </span>
                  <span className="pick__body">
                    <span className="t-card-title">{words.name}</span>
                    <span className="t-small soft">{words.text}</span>
                  </span>
                  <span className="pick__end">
                    {best === id && providers.length > 1 && <span className="tag">{COPY.receive.bestRate}</span>}
                    {on && <Icon name="checkCircle" size={20} className="accent" />}
                  </span>
                </span>
                <span className="provider__quote">
                  <span className="t-label soft">{COPY.receive.youGet}</span>
                  <span className="t-swap-figure" aria-live="polite">
                    {amount !== null ? (
                      COPY.out.youGetLine(formatFrom(amount, chain), facts.coin)
                    ) : quoting ? (
                      <Spinner size="large" />
                    ) : (
                      <span className="faint">{COPY.receive.amountHint}</span>
                    )}
                  </span>
                  {quoting && <Waiting>{COPY.receive.quoting}</Waiting>}
                  {!quoting && problem !== null && <span className="t-small danger-text">{problem}</span>}
                  {amount !== null && own?.quote && (
                    <>
                      <span className="t-small soft">
                        {COPY.out.rateLine(asset, formatRateOut(amount / Number(fromAmount), chain), facts.coin)}
                      </span>
                      {own.quote.withdrawalFee !== null && own.quote.withdrawalFee > 0 && (
                        <span className="t-small soft">
                          {COPY.out.feeLine(formatFrom(own.quote.withdrawalFee, chain), facts.coin)}
                        </span>
                      )}
                      {own.quote.speedMinutes !== null && (
                        <span className="t-small soft">{COPY.receive.speedLine(own.quote.speedMinutes, asset)}</span>
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
        <p className="t-small soft text-center">{COPY.out.floatingLine}</p>
        {guidance !== null && (
          <p className="t-small soft text-center">
            {guidance}
            {other === undefined && (
              <>
                {" "}
                <Link href={ROUTES.outAmount}>{COPY.receive.changeAmount}</Link>
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
