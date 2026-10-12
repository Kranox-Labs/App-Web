import { useEffect, useState } from "react";

import { ROBINHOOD_CHAIN } from "../../chain.ts";
import { COPY } from "../../copy.ts";
import { useSwaps } from "../../gate/store.ts";
import type { Balances } from "../../gate/types.ts";
import { balanceReader } from "../../gate/use-client.ts";
import { formatAgo, formatBalance, shortAddress } from "../../format.ts";
import { ROUTES } from "../../router.ts";
import { useNow } from "../../use-now.ts";
import { useWallet } from "../../wallet/provider.ts";
import { copyText, PageFrame, RoundButton, Surface, Waiting } from "../widgets/bits.tsx";
import { Icon } from "../widgets/Icon.tsx";
import { Link } from "../widgets/Link.tsx";
import { SwapRow } from "../widgets/SwapRow.tsx";

/** The home shows this many of the latest swaps, as the app does. */
const RECENT_COUNT = 5;

/** A swap less than this old makes the next one easier to pair, as the rule of the timing says. */
const TIMING_WINDOW_MS = 86_400_000;

/** The home, as the home of the app: the balance card, the address and the privacy at its side, and the activity. */
export function HomePage() {
  const { connection } = useWallet();
  const swaps = useSwaps();
  const now = useNow(60_000);
  // The balances of an address, kept with the address, so that another wallet shows none until its own are read.
  const [read, setRead] = useState<{ address: string; balances: Balances } | null>(null);
  const address = connection?.address ?? null;
  const balances = read !== null && address !== null && read.address === address ? read.balances : null;

  // The balances come through the wallet, which talks to the chain for its own balance anyway.
  useEffect(() => {
    // A wallet on another network holds other coins: the card shows nothing until it switches.
    if (connection === null || connection.chainId !== ROBINHOOD_CHAIN.id) return;
    let live = true;
    const owner = connection.address;
    balanceReader(connection.choice.provider)
      .readBalances(owner)
      .then((found) => {
        if (live) setRead({ address: owner, balances: found });
      })
      .catch(() => {
        // The card keeps saying that it reads the balance.
      });
    return () => {
      live = false;
    };
  }, [connection]);

  const recent = swaps.slice(0, RECENT_COUNT);
  const lastSwap = swaps.find((swap) => now - new Date(swap.createdAt).getTime() <= TIMING_WINDOW_MS) ?? null;
  const hour = new Date(now).getHours();

  return (
    <PageFrame full title={COPY.home.greeting(hour)} lead={COPY.home.lead}>
      <div className="home">
        <section className="hero">
          <div className="hero__grain" aria-hidden="true" />
          <div className="hero__body">
            <p className="t-label hero__label">{COPY.home.balance}</p>
            {address === null ? (
              <>
                <p className="t-card-figure">{COPY.home.noWallet}</p>
                <p className="t-body-regular hero__soft">{COPY.home.noWalletText}</p>
                <div className="hero__actions">
                  <Link href={ROUTES.connect} className="pill pill--heroMain">
                    {COPY.wallet.connect}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="hero__figure">
                  <span className="t-figure">{balances === null ? "—" : formatBalance(balances.usdg, "USDG")}</span>
                  <span className="t-figure-unit"> USDG</span>
                </p>
                <p className="t-row-figure hero__second">
                  {balances === null ? (
                    <Waiting className="t-small hero__soft">{COPY.home.updating}</Waiting>
                  ) : (
                    <>
                      {formatBalance(balances.eth, "ETH")}
                      <span className="t-unit-label"> ETH</span>
                    </>
                  )}
                </p>
                <div className="hero__actions">
                  <Link href={ROUTES.receive} className="pill pill--heroMain">
                    {COPY.home.receive}
                  </Link>
                  <span className="pill pill--heroAlt pill--off" aria-disabled="true">
                    {COPY.home.send}
                    <span className="tag tag--dark">{COPY.home.soon}</span>
                  </span>
                  <Link href={ROUTES.receive} className="round round--hero hero__arrow" aria-label={COPY.home.receive}>
                    <Icon name="receive" size={19} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
        <div className="home__side">
          <Surface>
            <div className="between">
              <p className="t-card-title">{COPY.home.address}</p>
              {address !== null && (
                <RoundButton icon="copy" label={COPY.swap.copy} small onClick={() => void copyText(address)} />
              )}
            </div>
            {address === null ? (
              <p className="t-body-regular soft">{COPY.home.noWalletText}</p>
            ) : (
              <div className="stack stack--tight">
                <p className="t-card-figure t-mono-figure" title={address}>
                  {shortAddress(address)}
                </p>
                <p className="t-small soft">{COPY.home.onChain}</p>
              </div>
            )}
          </Surface>
          <Surface warn={lastSwap !== null}>
            <div className="between">
              <p className="t-card-title">{COPY.home.privacyTitle}</p>
              <span
                className={
                  lastSwap === null
                    ? "rule__mark rule__mark--pass rule__mark--small"
                    : "rule__mark rule__mark--warn rule__mark--small"
                }
                aria-hidden="true"
              >
                <Icon name={lastSwap === null ? "check" : "priorityHigh"} size={14} />
              </span>
            </div>
            <p className="t-body-regular soft">
              {lastSwap === null ? COPY.home.privacyGood : COPY.home.privacyWait(formatAgo(lastSwap.createdAt, now))}
            </p>
            <div>
              <Link href={ROUTES.privacy} className="pill pill--quiet pill--small">
                {COPY.home.privacyLink}
              </Link>
            </div>
          </Surface>
        </div>
        <Surface className="home__recent">
          <div className="between">
            <p className="t-card-title">{COPY.home.recent}</p>
            <Link href={ROUTES.activity} className="t-body soft">
              {COPY.home.all}
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="t-body-regular soft">{COPY.home.none}</p>
          ) : (
            <div className="list">
              {recent.map((swap) => (
                <SwapRow key={swap.id} swap={swap} />
              ))}
            </div>
          )}
        </Surface>
      </div>
    </PageFrame>
  );
}
