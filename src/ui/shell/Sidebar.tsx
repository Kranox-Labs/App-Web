import logo from "../../assets/kranox-logo-small.svg";
import { ROBINHOOD_CHAIN } from "../../chain.ts";
import { COPY } from "../../copy.ts";
import { client, relayHost } from "../../gate/use-client.ts";
import { shortAddress } from "../../format.ts";
import { ROUTES } from "../../router.ts";
import { useWallet, type Connection } from "../../wallet/provider.ts";
import { Icon } from "../widgets/Icon.tsx";
import { Link } from "../widgets/Link.tsx";
import { isActive, LEGAL_LINKS, NAV } from "./nav.tsx";

/**
 * The sidebar, as the app draws it after the sidebar of System Settings in macOS: a panel of glass with the brand
 * at its top, the wallet, the pages with their icons, and the state of the relay at the foot. On a wide screen it
 * stands at the left; on a narrow one it slides in from the left when the user opens the menu.
 */
export function Sidebar({ path, open, onClose }: { path: string; open: boolean; onClose: () => void }) {
  const { connection } = useWallet();
  return (
    <>
      <div className={open ? "scrim scrim--open" : "scrim"} onClick={onClose} aria-hidden="true" />
      <aside className={open ? "sidebar sidebar--open" : "sidebar"} aria-label={COPY.nav.menu} id="sidebar">
        <button type="button" className="tile-button sidebar__close" aria-label={COPY.nav.closeMenu} onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
        <Link href={ROUTES.home} className="brand" aria-label={COPY.appName}>
          <img className="brand__logo" src={logo} alt="" width="470" height="951" />
        </Link>
        <WalletRow connection={connection} />
        <nav className="nav" aria-label={COPY.nav.pages}>
          {NAV.map((item) => {
            const active = isActive(item.href, path);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav__item nav__item--active" : "nav__item"}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav__tile">
                  <Icon name={item.icon} size={15} />
                </span>
                <span className="t-body">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar__spacer" />
        <StatusCard />
        <nav className="legal" aria-label={COPY.legal.label}>
          {LEGAL_LINKS.map((link) => (
            <a key={link.href} className="t-small faint" href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}

/** The wallet at the top of the sidebar, like the account in System Settings: a round mark, the name, and the network. */
function WalletRow({ connection }: { connection: Connection | null }) {
  if (connection === null) {
    return (
      <Link href={ROUTES.connect} className="walletrow">
        <span className="walletrow__avatar walletrow__avatar--off" aria-hidden="true">
          <Icon name="wallet" size={16} />
        </span>
        <span className="walletrow__text">
          <span className="t-body">{COPY.sidebar.noWallet}</span>
          <span className="t-small soft">{COPY.sidebar.connectToReceive}</span>
        </span>
      </Link>
    );
  }
  const onChain = connection.chainId === ROBINHOOD_CHAIN.id;
  const icon = connection.choice.info.icon;
  return (
    <Link href={ROUTES.connect} className="walletrow" title={connection.address}>
      <span className="walletrow__avatar" aria-hidden="true">
        {icon !== "" ? (
          <img src={icon} alt="" />
        ) : (
          <span className="t-button">{connection.choice.info.name.charAt(0)}</span>
        )}
      </span>
      <span className="walletrow__text">
        <span className="t-mono">{shortAddress(connection.address)}</span>
        <span className={onChain ? "t-small soft" : "t-small danger-text"}>
          {onChain ? ROBINHOOD_CHAIN.name : COPY.sidebar.anotherNetwork}
        </span>
      </span>
    </Link>
  );
}

/** The state of the relay at the foot of the sidebar, where the app shows the progress of its scan. */
function StatusCard() {
  return (
    <div className="status">
      <div className="status__row">
        <span className="t-small-strong">{client.sample ? COPY.sidebar.sampleTitle : COPY.sidebar.relayTitle}</span>
        <span className={client.sample ? "status__dot status__dot--off" : "status__dot"} aria-hidden="true" />
      </div>
      <p className="t-small faint">{relayHost === null ? COPY.sidebar.sampleNote : relayHost}</p>
    </div>
  );
}
