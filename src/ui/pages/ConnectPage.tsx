import { useEffect, useState } from "react";

import { ROBINHOOD_CHAIN } from "../../chain.ts";
import { COPY } from "../../copy.ts";
import { useDraft } from "../../door/draft.tsx";
import { checkPrivacy } from "../../door/privacy.ts";
import { useSwaps } from "../../door/store.ts";
import { client } from "../../door/use-client.ts";
import { navigate, ROUTES } from "../../router.ts";
import { useNow } from "../../use-now.ts";
import {
  connectSampleWallet,
  connectWallet,
  forgetWallet,
  switchToRobinhoodChain,
  useWallet,
} from "../../wallet/provider.ts";
import { AddressBox, Glass, Notice, PageFrame, PillButton, Surface } from "../widgets/bits.tsx";
import { Icon } from "../widgets/Icon.tsx";

/**
 * The connect page: the wallets of this browser to pick from, then the address that receives and its history. A
 * step of receive that sent the user here gets them back on "Continue".
 */
export function ConnectPage() {
  const { wallets, connection, busy, error } = useWallet();
  const { draft, update } = useDraft();
  const swaps = useSwaps();
  const now = useNow(60_000);
  // The address whose scan failed, so that the page says so for that address and tries again for another.
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const address = connection?.address ?? null;
  const scanned = draft.scan?.address ?? null;
  const scanFailed = failedFor !== null && failedFor === address;

  // The public history of the address, read once per address and kept in the draft for the pages after this one.
  useEffect(() => {
    if (address === null || scanned?.toLowerCase() === address.toLowerCase()) return;
    let live = true;
    client
      .scanAddress(address)
      .then((scan) => {
        if (live) update({ scan });
      })
      .catch(() => {
        if (live) setFailedFor(address);
      });
    return () => {
      live = false;
    };
  }, [address, scanned, update]);

  const onChain = connection !== null && connection.chainId === ROBINHOOD_CHAIN.id;
  const returnTo = draft.returnTo;
  const goOn = () => {
    update({ returnTo: null });
    navigate(returnTo ?? ROUTES.home);
  };

  if (connection === null) {
    return (
      <PageFrame title={COPY.connect.title} lead={COPY.connect.lead}>
        <Surface>
          <p className="t-small-strong soft">{COPY.wallet.choose}</p>
          {wallets.length > 0 ? (
            <div className="wallets">
              {wallets.map((wallet) => (
                <button
                  key={wallet.info.uuid}
                  type="button"
                  className="walletpick"
                  disabled={busy}
                  onClick={() => void connectWallet(wallet)}
                >
                  <span className="walletpick__icon" aria-hidden="true">
                    {wallet.info.icon !== "" ? <img src={wallet.info.icon} alt="" /> : <Icon name="wallet" size={18} />}
                  </span>
                  <span className="t-card-title">{wallet.info.name}</span>
                  <Icon name="chevronDown" size={20} className="walletpick__arrow" />
                </button>
              ))}
            </div>
          ) : (
            <div className="stack stack--tight">
              <p className="t-body">{COPY.wallet.none}</p>
              <p className="t-small soft">{COPY.wallet.noneHint(window.location.host)}</p>
            </div>
          )}
          {busy && <p className="t-small soft">{COPY.wallet.connecting}</p>}
          {error !== null && <Notice tone="warn">{error}</Notice>}
          {import.meta.env.DEV && (
            <div>
              <PillButton tone="quiet" small onClick={connectSampleWallet}>
                {COPY.wallet.sample}
              </PillButton>
            </div>
          )}
        </Surface>
      </PageFrame>
    );
  }

  const scan = scanned?.toLowerCase() === connection.address.toLowerCase() ? draft.scan : null;
  const report = checkPrivacy({ recipient: connection.address, xmrAmount: null, swaps, scan, now });

  return (
    <PageFrame title={COPY.connect.title} lead={COPY.connect.lead}>
      <Glass>
        <div className="stack">
          <AddressBox label={COPY.wallet.address} text={connection.address} />
          {onChain ? (
            <p className="field__good t-small">
              <Icon name="checkCircle" size={14} />
              {COPY.wallet.checkedAddress}
            </p>
          ) : (
            <p className="t-small danger-text">{COPY.wallet.wrongChain}</p>
          )}
          <p className="t-small faint">{COPY.wallet.through(connection.choice.info.name)}</p>
        </div>
        {!onChain && (
          <PillButton
            tone="solid"
            busy={busy}
            busyLabel={COPY.wallet.connecting}
            onClick={() => void switchToRobinhoodChain()}
          >
            {COPY.wallet.switchChain}
          </PillButton>
        )}
        {error !== null && <Notice tone="warn">{error}</Notice>}
        {report.address !== null ? (
          <Notice tone="warn">
            <strong>{report.address.title}.</strong> {report.address.text}
          </Notice>
        ) : scan !== null ? (
          <Notice tone="good">{COPY.connect.fresh}</Notice>
        ) : scanFailed ? (
          <Notice>{COPY.connect.unchecked}</Notice>
        ) : (
          <p className="t-small soft">{COPY.connect.checking}</p>
        )}
        <PillButton expand disabled={!onChain} onClick={goOn}>
          {returnTo === null ? COPY.connect.backHome : COPY.connect.continue}
        </PillButton>
        <div className="text-center">
          <PillButton tone="quiet" small icon="logout" onClick={forgetWallet}>
            {COPY.wallet.forget}
          </PillButton>
        </div>
      </Glass>
    </PageFrame>
  );
}
