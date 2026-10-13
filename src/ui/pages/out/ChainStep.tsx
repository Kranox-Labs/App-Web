import { COPY } from "../../../copy.ts";
import { CHAINS } from "../../../gate/catalog.ts";
import { useDraft } from "../../../gate/draft.tsx";
import type { FromChain } from "../../../gate/types.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { CHAIN_LOGOS } from "../../chain-logos.ts";
import { PageFrame, Pick, PillButton } from "../../widgets/bits.tsx";
import { Stepper } from "../receive/Stepper.tsx";

/** The first step of the way out: the chain the coins go to. */
export function OutChainStep() {
  const { draft, updateOut } = useDraft();
  const { out } = draft;
  const pick = (code: FromChain) => {
    if (code === out.chain) return;
    // Another chain means another coin arrives: the provider, the quote, and the address start over; the amount of
    // the coin on Robinhood Chain to send stays.
    updateOut({ chain: code, provider: null, quote: null, address: "" });
  };
  return (
    <PageFrame wide title={COPY.out.title} lead={COPY.out.chainLead}>
      <Stepper current={0} steps={COPY.out.steps} />
      <div className="picks">
        {CHAINS.map((chain) => {
          const words = COPY.chains[chain.code];
          return (
            <Pick
              key={chain.code}
              on={out.chain === chain.code}
              soon={!chain.open}
              logo={CHAIN_LOGOS[chain.code]}
              title={words.name}
              text={words.outText}
              onClick={() => pick(chain.code)}
            />
          );
        })}
      </div>
      <PillButton expand disabled={out.chain === null} onClick={() => navigate(ROUTES.outAmount)}>
        {COPY.receive.continue}
      </PillButton>
    </PageFrame>
  );
}
