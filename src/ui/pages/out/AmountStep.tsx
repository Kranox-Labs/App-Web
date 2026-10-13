import { useEffect, useMemo, useState } from "react";

import { AMOUNT_PATTERN, CHAIN_ASSETS, ROBINHOOD_CHAIN } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { decimalsOf, isOutAmount } from "../../../gate/amount.ts";
import { providersOutOf } from "../../../gate/catalog.ts";
import { CHAIN_FACTS } from "../../../gate/chains.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { widestRange, type FromRange } from "../../../gate/ranges.ts";
import { CHAIN_ASSET_CODES, type Balances } from "../../../gate/types.ts";
import { balanceReader, client } from "../../../gate/use-client.ts";
import { formatBalance, formatSend } from "../../../format.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useWallet } from "../../../wallet/provider.ts";
import { CHAIN_LOGOS } from "../../chain-logos.ts";
import { CoinPill, Glass, PageFrame, PillButton, SwapBox, Waiting } from "../../widgets/bits.tsx";
import { Icon } from "../../widgets/Icon.tsx";
import { COIN_LOGOS } from "../../coin-logos.ts";
import { Stepper } from "../receive/Stepper.tsx";
import { useOutStepGuard } from "./steps.ts";

/** The second step of the way out: the coin on Robinhood Chain to send and its amount, and the coin that arrives. */
export function OutAmountStep() {
  const ok = useOutStepGuard(1);
  const { draft, updateOut } = useDraft();
  const { connection } = useWallet();
  const { chain, asset, fromAmount } = draft.out;
  // The widest range of the providers of the chain for the coin, and whether every provider gave its range: a range
  // with one missing advises and blocks nothing (D-29 of the scan of 13 Oct 2026).
  const [read, setRead] = useState<{ key: string; range: FromRange | null; complete: boolean } | null>(null);
  const key = `${String(chain)}:${asset}`;
  const done = read !== null && read.key === key;
  const range = done ? read.range : null;
  const complete = done && read.complete;
  const providers = useMemo(() => (chain === null ? [] : providersOutOf(chain)), [chain]);
  // What the wallet holds, read through the wallet, so that the step can say when an amount is more than that.
  const [balances, setBalances] = useState<{ address: string; found: Balances } | null>(null);
  const address = connection !== null && connection.chainId === ROBINHOOD_CHAIN.id ? connection.address : null;
  const held = balances !== null && address !== null && balances.address === address ? balances.found : null;

  useEffect(() => {
    if (chain === null) return;
    let live = true;
    Promise.allSettled(providers.map((id) => client.outRange(id, chain, asset))).then((results) => {
      const found = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      if (live) setRead({ key, range: widestRange(found), complete: found.length === providers.length });
    });
    return () => {
      live = false;
    };
  }, [chain, asset, providers, key]);

  useEffect(() => {
    if (connection === null || connection.chainId !== ROBINHOOD_CHAIN.id) return;
    let live = true;
    const owner = connection.address;
    balanceReader(connection.choice.provider)
      .readBalances(owner)
      .then((found) => {
        if (live) setBalances({ address: owner, found });
      })
      .catch(() => {
        // Without the balance the step says nothing of it.
      });
    return () => {
      live = false;
    };
  }, [connection]);

  if (!ok || chain === null) return null;

  const facts = CHAIN_FACTS[chain];
  const words = COPY.chains[chain];
  const valid = isOutAmount(fromAmount, asset);
  const amount = Number(fromAmount);
  const balance = held === null ? null : asset === "USDG" ? held.usdg : held.eth;
  const outside =
    valid &&
    complete &&
    range !== null &&
    (amount < range.minFrom || (range.maxFrom !== null && amount > range.maxFrom));
  const error =
    fromAmount !== "" && !AMOUNT_PATTERN.test(fromAmount)
      ? COPY.receive.badAmount
      : fromAmount !== "" && decimalsOf(fromAmount) > CHAIN_ASSETS[asset].sendDecimals
        ? COPY.receive.tooManyDecimals(CHAIN_ASSETS[asset].sendDecimals)
        : outside && range !== null
          ? amount < range.minFrom
            ? COPY.receive.belowMin(formatSend(range.minFrom, asset), asset)
            : COPY.receive.aboveMax(formatSend(range.maxFrom ?? amount, asset), asset)
          : valid && balance !== null && amount > balance
            ? COPY.out.overBalance(formatBalance(balance, asset), asset)
            : null;
  const rangeHint =
    range === null
      ? null
      : !complete
        ? COPY.receive.rangePartial
        : range.maxFrom === null
          ? COPY.receive.rangeFrom(formatSend(range.minFrom, asset), asset)
          : COPY.receive.rangeHint(formatSend(range.minFrom, asset), formatSend(range.maxFrom, asset), asset);

  return (
    <PageFrame wide title={COPY.out.title} lead={COPY.out.amountLead}>
      <Stepper current={1} steps={COPY.out.steps} />
      <Glass>
        <SwapBox
          label={COPY.out.youSend}
          coin={
            <CoinPill
              code={asset}
              sub={COPY.out.onChain}
              logo={COIN_LOGOS[asset]}
              menu={{
                options: CHAIN_ASSET_CODES,
                value: asset,
                logoOf: (choice) => COIN_LOGOS[choice],
                // A figure of one coin is no figure of the other: it starts over with the coin (D-38).
                onChange: (choice) => updateOut({ asset: choice, fromAmount: "", quote: null }),
              }}
            />
          }
          notes={
            error !== null ? (
              <p className="t-small danger-text">{error}</p>
            ) : (
              <>
                {rangeHint !== null ? (
                  <p className="t-small soft">{rangeHint}</p>
                ) : done ? (
                  <p className="t-small soft">{COPY.receive.rangeUnknown}</p>
                ) : (
                  <p>
                    <Waiting>{COPY.receive.rangeLoading}</Waiting>
                  </p>
                )}
                {balance !== null && (
                  <p className="t-small soft">{COPY.out.holds(formatBalance(balance, asset), asset)}</p>
                )}
              </>
            )
          }
        >
          <input
            className="swapbox__input t-send-figure"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder={COPY.receive.amountHint}
            aria-label={COPY.out.youSend}
            value={fromAmount}
            onChange={(event) => updateOut({ fromAmount: event.target.value.trim(), quote: null })}
          />
        </SwapBox>
        <div className="swap-arrow" aria-hidden="true">
          <Icon name="arrowDown" size={18} />
        </div>
        <SwapBox
          label={COPY.out.arrivesAs}
          coin={<CoinPill code={facts.coin} sub={COPY.receive.onChainOf(words.name)} logo={CHAIN_LOGOS[chain]} />}
        >
          <p className="t-body-regular soft">{COPY.out.arrivesText}</p>
        </SwapBox>
        <PillButton expand disabled={!valid || outside} onClick={() => navigate(ROUTES.outProvider)}>
          {COPY.receive.continue}
        </PillButton>
      </Glass>
    </PageFrame>
  );
}
