import { COPY } from "../../../copy.ts";
import { CHAINS } from "../../../gate/catalog.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { navigate, ROUTES } from "../../../router.ts";
import { CHAIN_LOGOS } from "../../chain-logos.ts";
import { PageFrame, Pick, PillButton } from "../../widgets/bits.tsx";
import { Stepper } from "./Stepper.tsx";

/** The first step of receive: the chain the coins come from. */
export function ChainStep() {
  const { draft, update } = useDraft();
  return (
    <PageFrame wide title={COPY.receive.title} lead={COPY.receive.chainLead}>
      <Stepper current={0} />
      <div className="picks">
        {CHAINS.map((chain) => {
          const words = COPY.chains[chain.code];
          return (
            <Pick
              key={chain.code}
              on={draft.chain === chain.code}
              soon={!chain.open}
              logo={CHAIN_LOGOS[chain.code]}
              title={words.name}
              text={words.text}
              onClick={() => update({ chain: chain.code })}
            />
          );
        })}
      </div>
      <PillButton expand disabled={draft.chain === null} onClick={() => navigate(ROUTES.receiveAmount)}>
        {COPY.receive.continue}
      </PillButton>
    </PageFrame>
  );
}
