import { useEffect, useState } from "react";

import { DraftProvider } from "./door/draft.tsx";
import { ROUTES, swapIdOf, useRoute } from "./router.ts";
import { ActivityPage } from "./ui/pages/ActivityPage.tsx";
import { ConnectPage } from "./ui/pages/ConnectPage.tsx";
import { HomePage } from "./ui/pages/HomePage.tsx";
import { PrivacyPage } from "./ui/pages/PrivacyPage.tsx";
import { AmountStep } from "./ui/pages/receive/AmountStep.tsx";
import { ChainStep } from "./ui/pages/receive/ChainStep.tsx";
import { PrivacyStep } from "./ui/pages/receive/PrivacyStep.tsx";
import { ProviderStep } from "./ui/pages/receive/ProviderStep.tsx";
import { TransactionStep } from "./ui/pages/receive/TransactionStep.tsx";
import { SwapPage } from "./ui/pages/SwapPage.tsx";
import { Sidebar } from "./ui/shell/Sidebar.tsx";
import { TopBar } from "./ui/shell/TopBar.tsx";
import { ToastHost } from "./ui/widgets/toast.tsx";
import { discoverWallets } from "./wallet/provider.ts";

/**
 * The app, laid out as the window of the Mac app: the ground with its picture and glows, the sidebar at the left,
 * and the page at the right. On a narrow screen the sidebar hides, and a button in the bar at the top opens it.
 */
export function App() {
  const path = useRoute();
  // The menu knows the page where it opened: a new page closes it, as does the Escape key.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOpen = menuFor === path;
  useEffect(() => discoverWallets(), []);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  return (
    <DraftProvider>
      <div className="ground" aria-hidden="true">
        <div className="ground__art" />
        <div className="ground__calm" />
        <div className="ground__glow ground__glow--ember" />
        <div className="ground__glow ground__glow--violet" />
      </div>
      <div className="app">
        <Sidebar path={path} open={menuOpen} onClose={() => setMenuFor(null)} />
        <div className="main">
          <TopBar onMenu={() => setMenuFor(path)} />
          <main className="page">{pageOf(path)}</main>
          <ToastHost />
        </div>
      </div>
    </DraftProvider>
  );
}

function pageOf(path: string) {
  const swapId = swapIdOf(path);
  if (swapId !== null) return <SwapPage id={swapId} />;
  switch (path) {
    case ROUTES.receive:
      return <ChainStep />;
    case ROUTES.receiveAmount:
      return <AmountStep />;
    case ROUTES.receiveProvider:
      return <ProviderStep />;
    case ROUTES.receivePrivacy:
      return <PrivacyStep />;
    case ROUTES.receiveTransaction:
      return <TransactionStep />;
    case ROUTES.connect:
      return <ConnectPage />;
    case ROUTES.activity:
      return <ActivityPage />;
    case ROUTES.privacy:
      return <PrivacyPage />;
    default:
      return <HomePage />;
  }
}
