import logo from "../../assets/kranox-logo-small.svg";
import { ROBINHOOD_CHAIN } from "../../chain.ts";
import { COPY } from "../../copy.ts";
import { shortAddress } from "../../format.ts";
import { ROUTES } from "../../router.ts";
import { useWallet } from "../../wallet/provider.ts";
import { Icon } from "../widgets/Icon.tsx";
import { Link } from "../widgets/Link.tsx";

/** The bar at the top of a narrow screen: the button that opens the sidebar, the brand, and the wallet. */
export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { connection, busy } = useWallet();
  return (
    <header className="topbar">
      <button
        type="button"
        className="tile-button"
        aria-label={COPY.nav.openMenu}
        aria-controls="sidebar"
        onClick={onMenu}
      >
        <Icon name="menu" size={18} />
      </button>
      <Link href={ROUTES.home} className="topbar__brand" aria-label={COPY.appName}>
        <img src={logo} alt="" width="470" height="951" />
        <span className="t-body">{COPY.appName}</span>
      </Link>
      <div className="topbar__end">
        {busy ? (
          <span className="pill pill--solid pill--small">{COPY.wallet.connecting}</span>
        ) : connection === null ? (
          <Link href={ROUTES.connect} className="pill pill--accent pill--small">
            {COPY.wallet.connect}
          </Link>
        ) : (
          <Link href={ROUTES.connect} className="pill pill--solid pill--small" title={connection.address}>
            <span
              className={
                connection.chainId === ROBINHOOD_CHAIN.id
                  ? "chip__dot chip__dot--accent"
                  : "chip__dot chip__dot--danger"
              }
              aria-hidden="true"
            />
            <span className="t-mono">{shortAddress(connection.address)}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
