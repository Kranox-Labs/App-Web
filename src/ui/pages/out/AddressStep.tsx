import { useEffect, useState } from "react";

import { EVM_ADDRESS_PATTERN } from "../../../chain.ts";
import { COPY } from "../../../copy.ts";
import { CHAIN_FACTS } from "../../../gate/chains.ts";
import { useDraft } from "../../../gate/draft.tsx";
import { checkPrivacy, warningCount } from "../../../gate/privacy.ts";
import { useSwaps } from "../../../gate/store.ts";
import { client } from "../../../gate/use-client.ts";
import { navigate, ROUTES } from "../../../router.ts";
import { useNow } from "../../../use-now.ts";
import { useWallet } from "../../../wallet/provider.ts";
import {
  AddressBox,
  Glass,
  Notice,
  PageFrame,
  PillButton,
  Ring,
  RuleRow,
  Surface,
  Waiting,
} from "../../widgets/bits.tsx";
import { Field } from "../../widgets/Field.tsx";
import { Stepper } from "../receive/Stepper.tsx";
import { onRobinhoodChain } from "../receive/steps.ts";
import { useOutStepGuard } from "./steps.ts";

/**
 * The fourth step of the way out: the address on the chain that receives, and the privacy review of the swap, whose
 * side on Robinhood Chain is the wallet that sends.
 */
export function OutAddressStep() {
  const ok = useOutStepGuard(3);
  const { draft, update, updateOut } = useDraft();
  const { connection } = useWallet();
  const swaps = useSwaps();
  const now = useNow(60_000);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const address = onRobinhoodChain(connection) ? connection.address : null;
  const scanned = draft.scan?.address ?? null;
  const scanFailed = failedFor !== null && failedFor === address;

  // The public history of the wallet that sends, read once per address and kept in the draft.
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

  if (!ok || draft.out.chain === null) return null;

  const toConnect = () => {
    update({ returnTo: ROUTES.outAddress });
    navigate(ROUTES.connect);
  };

  if (address === null) {
    return (
      <PageFrame wide title={COPY.out.title} lead={COPY.out.addressLead}>
        <Stepper current={3} steps={COPY.out.steps} />
        <Surface>
          <p className="t-body-regular soft">{COPY.out.connectFirst}</p>
          <PillButton expand onClick={toConnect}>
            {COPY.wallet.connect}
          </PillButton>
        </Surface>
      </PageFrame>
    );
  }

  const chain = draft.out.chain;
  const facts = CHAIN_FACTS[chain];
  const words = COPY.chains[chain];
  const typed = draft.out.address;
  const addressValid = facts.isRefundAddress(typed);
  // The address of the wallet on Robinhood Chain pasted here by mistake gets its own line (D-17).
  const addressError =
    typed === "" || addressValid
      ? null
      : EVM_ADDRESS_PATTERN.test(typed)
        ? COPY.out.addressEvm(words.name)
        : COPY.out.addressInvalid[chain];
  const scan = scanned?.toLowerCase() === address.toLowerCase() ? draft.scan : null;
  const report = checkPrivacy({
    recipient: address,
    amount: { direction: "out", asset: draft.out.asset, value: Number(draft.out.fromAmount) },
    swaps,
    scan,
    now,
  });
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

  const paste = async () => {
    try {
      updateOut({ address: (await navigator.clipboard.readText()).trim() });
    } catch {
      // A browser that keeps the clipboard to itself leaves the field to the keyboard.
    }
  };

  return (
    <PageFrame wide title={COPY.out.title} lead={COPY.out.addressLead}>
      <Stepper current={3} steps={COPY.out.steps} />
      <Glass>
        <Field
          label={COPY.out.addressField(words.name)}
          mono
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          hint={COPY.receive.refundHint[chain]}
          good={addressValid ? COPY.receive.refundValid(words.name) : null}
          value={typed}
          onChange={(event) => updateOut({ address: event.target.value.trim() })}
          error={addressError}
          action={
            <PillButton tone="quiet" small onClick={() => void paste()}>
              {COPY.receive.paste}
            </PillButton>
          }
        />
        <p className="t-small faint">{COPY.out.addressTip[chain]}</p>
        {words.outNote !== null && <Notice>{words.outNote}</Notice>}
      </Glass>
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
        <AddressBox label={COPY.out.from} text={address} />
        <p className="t-small soft">{COPY.out.fromText}</p>
        {scan !== null && scan.transfers === 0 && report.address === null ? (
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
      {!addressValid && <p className="t-small soft text-center">{COPY.out.addressNeeded(words.name)}</p>}
      <PillButton expand disabled={!addressValid} onClick={() => navigate(ROUTES.outSend)}>
        {COPY.receive.continue}
      </PillButton>
    </PageFrame>
  );
}
