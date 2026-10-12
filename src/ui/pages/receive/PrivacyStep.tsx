import { useEffect, useState } from "react";

import { COPY } from "../../../copy.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { checkPrivacy, warningCount } from "../../../gate/privacy.ts";
import { useSwaps } from "../../../gate/store.ts";
import { client } from "../../../gate/use-client.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useNow } from "../../../use-now.ts";
import { useWallet } from "../../../wallet/provider.ts";
import { AddressBox, Notice, PageFrame, PillButton, Ring, RuleRow, Surface, Waiting } from "../../widgets/bits.tsx";
import { Stepper } from "./Stepper.tsx";
import { onRobinhoodChain, useStepGuard } from "./steps.ts";

/** The fourth step of receive: the privacy review of the swap, with the address that receives. */
export function PrivacyStep() {
  const ok = useStepGuard(3);
  const { draft, update } = useDraft();
  const { connection } = useWallet();
  const swaps = useSwaps();
  const now = useNow(60_000);
  // The address whose scan failed, so that the page says so for that address and tries again for another.
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const address = onRobinhoodChain(connection) ? connection.address : null;
  const scanned = draft.scan?.address ?? null;
  const scanFailed = failedFor !== null && failedFor === address;

  // The public history of the address, read once per address and kept in the draft.
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

  if (!ok) return null;

  const toConnect = () => {
    update({ returnTo: ROUTES.receivePrivacy });
    navigate(ROUTES.connect);
  };

  if (address === null) {
    return (
      <PageFrame wide title={COPY.receive.title} lead={COPY.receive.privacyLead}>
        <Stepper current={3} />
        <Surface>
          <p className="t-body-regular soft">{COPY.receive.connectFirst}</p>
          <PillButton expand onClick={toConnect}>
            {COPY.wallet.connect}
          </PillButton>
        </Surface>
      </PageFrame>
    );
  }

  const scan = scanned?.toLowerCase() === address.toLowerCase() ? draft.scan : null;
  const report = checkPrivacy({ recipient: address, xmrAmount: Number(draft.xmrAmount), swaps, scan, now });
  const warnings = warningCount(report);
  const rules = [
    {
      label: COPY.privacy.address,
      finding: report.address,
      checked: report.addressChecked,
      clear: COPY.privacy.addressClear,
    },
    { label: COPY.privacy.amount, finding: report.amount, checked: true, clear: COPY.privacy.amountClear },
    { label: COPY.privacy.timing, finding: report.timing, checked: true, clear: COPY.privacy.timingClear },
  ];

  return (
    <PageFrame wide title={COPY.receive.title} lead={COPY.receive.privacyLead}>
      <Stepper current={3} />
      <Surface warn={warnings > 0}>
        <div className="ringcard">
          <Ring parts={rules.map((rule) => rule.finding === null && rule.checked)} />
          <div className="ringcard__text">
            <p className="t-small-strong soft">{COPY.privacy.shows}</p>
            <p className="t-board-title">{warnings === 0 ? COPY.privacy.allClear : COPY.privacy.toImprove(warnings)}</p>
            <p className="t-body-regular soft">{COPY.privacy.inBrowser}</p>
          </div>
        </div>
        <ul className="rules">
          {rules.map((rule) => (
            <RuleRow
              key={rule.label}
              state={rule.finding !== null ? "warn" : rule.checked ? "pass" : "off"}
              title={rule.finding?.title ?? rule.label}
              text={rule.finding?.text ?? (rule.checked ? rule.clear : COPY.privacy.addressUnchecked)}
            />
          ))}
        </ul>
      </Surface>
      <Surface>
        <AddressBox label={COPY.receive.arrivesAt} text={address} />
        {scan !== null && scan.transfers === 0 ? (
          <Notice tone="good">{COPY.connect.fresh}</Notice>
        ) : scan === null && scanFailed ? (
          <Notice>{COPY.connect.unchecked}</Notice>
        ) : (
          scan === null && (
            <p>
              <Waiting>{COPY.connect.checking}</Waiting>
            </p>
          )
        )}
        <div>
          <PillButton tone="quiet" small icon="wallet" onClick={toConnect}>
            {COPY.receive.useAnother}
          </PillButton>
        </div>
      </Surface>
      <PillButton expand onClick={() => navigate(ROUTES.receiveTransaction)}>
        {COPY.receive.continue}
      </PillButton>
    </PageFrame>
  );
}
