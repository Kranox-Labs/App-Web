import { useEffect, useState } from "react";

import { ROBINHOOD_CHAIN } from "../../chain.ts";
import { COPY } from "../../copy.ts";
import { useDraft } from "../../gate/draft.tsx";
import { checkPrivacy } from "../../gate/privacy.ts";
import { useSwaps } from "../../gate/store.ts";
import { client } from "../../gate/use-client.ts";
import { navigate, ROUTES } from "../../router.ts";
import { useNow } from "../../use-now.ts";
import {
  connectWallet,
  forgetWallet,
  switchToRobinhoodChain,
  useWallet,
  type WalletChoice,
} from "../../wallet/provider.ts";
import { AddressBox, Glass, Notice, PageFrame, PillButton, Surface } from "../widgets/bits.tsx";
import { Icon } from "../widgets/Icon.tsx";

/**
 * The connect page: the wallets of this browser to pick from, then the address that receives and its history. A
 * step of receive that sent the user here gets them back on "Continue".
 */
/** The wallets of this browser to pick from, or the way to get one. A pick connects it, and [onPicked] hears of it. */
function WalletList({ onPicked }: { onPicked?: () => void }) {
  const { wallets, busy } = useWallet();
  const pick = async (wallet: WalletChoice) => {
    await connectWallet(wallet);
    onPicked?.();
  };
  return (
    <>
      <p className="t-small-strong soft">{COPY.wallet.choose}</p>
      {wallets.length > 0 ? (
        <div className="wallets">
          {wallets.map((wallet) => (
            <button
              key={wallet.info.uuid}
              type="button"
              className="walletpick"
              disabled={busy}
              onClick={() => void pick(wallet)}
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
    </>
  );
}

export function ConnectPage() {
  const { connection, busy, error } = useWallet();
  // Whether the user asked for another wallet or account while one is connected: the list shows again, and the
  // wallet asks which accounts this site may see, so that another one can take the place of the connected one.
  const [choosing, setChoosing] = useState(false);
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
          <WalletList />
          {error !== null && <Notice tone="warn">{error}</Notice>}
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
        {choosing && (
          <Surface>
            <WalletList onPicked={() => setChoosing(false)} />
          </Surface>
        )}
        <div className="pill-row">
          {choosing ? (
            <PillButton tone="quiet" small onClick={() => setChoosing(false)}>
              {COPY.wallet.keep}
            </PillButton>
          ) : (
            <PillButton tone="quiet" small icon="wallet" onClick={() => setChoosing(true)}>
              {COPY.wallet.change}
            </PillButton>
          )}
          <PillButton tone="quiet" small icon="logout" onClick={forgetWallet}>
            {COPY.wallet.forget}
          </PillButton>
        </div>
      </Glass>
    </PageFrame>
  );
}
