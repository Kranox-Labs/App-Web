import { useEffect, useState } from "react";

import { AMOUNT_PATTERN, EVM_ADDRESS_PATTERN } from "../../chain.ts";
import { COPY } from "../../copy.ts";
import { useDraft } from "../../gate/draft.tsx";
import { checkPrivacy, warningCount } from "../../gate/privacy.ts";
import { useSwaps } from "../../gate/store.ts";
import type { AddressScan } from "../../gate/types.ts";
import { client } from "../../gate/use-client.ts";
import { formatDay, shortAddress } from "../../format.ts";
import { useNow } from "../../use-now.ts";
import { useWallet } from "../../wallet/provider.ts";
import { PageFrame, PillButton, Ring, RuleRow, Surface } from "../widgets/bits.tsx";
import { Field } from "../widgets/Field.tsx";

/** The privacy page, as the menu Privacy of the app: the checks of the next swap, and a scan of any address. */
export function PrivacyPage() {
  const { draft, update } = useDraft();
  const { connection } = useWallet();
  const swaps = useSwaps();
  const now = useNow(60_000);
  const address = connection?.address ?? null;
  const scanned = draft.scan?.address ?? null;

  // The history of the connected address, as the connect page reads it, read here too when the user came straight here.
  useEffect(() => {
    if (address === null || scanned?.toLowerCase() === address.toLowerCase()) return;
    let live = true;
    client
      .scanAddress(address)
      .then((scan) => {
        if (live) update({ scan });
      })
      .catch(() => {
        // The rule of the address says that it is unread.
      });
    return () => {
      live = false;
    };
  }, [address, scanned, update]);

  const scan = address !== null && scanned?.toLowerCase() === address.toLowerCase() ? draft.scan : null;
  const fromAmount =
    AMOUNT_PATTERN.test(draft.fromAmount) && Number(draft.fromAmount) > 0 ? Number(draft.fromAmount) : null;
  const report = checkPrivacy({ recipient: address, chain: draft.chain, fromAmount, swaps, scan, now });
  const warnings = warningCount(report);

  const rules = [
    {
      label: COPY.privacy.address,
      finding: report.address,
      known: address !== null && report.addressChecked,
      clear:
        address === null
          ? COPY.privacy.addressNone
          : report.addressChecked
            ? COPY.privacy.addressClear
            : COPY.privacy.addressUnchecked,
    },
    {
      label: COPY.privacy.amount,
      finding: report.amount,
      known: fromAmount !== null,
      clear: fromAmount === null ? COPY.privacy.amountNone : COPY.privacy.amountClear,
    },
    { label: COPY.privacy.timing, finding: report.timing, known: true, clear: COPY.privacy.timingClear },
  ];

  return (
    <PageFrame title={COPY.privacy.title} lead={COPY.privacy.lead}>
      <Surface warn={warnings > 0}>
        <div className="ringcard">
          <Ring parts={rules.map((rule) => rule.finding === null && rule.known)} />
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
              state={rule.finding !== null ? "warn" : rule.known ? "pass" : "off"}
              title={rule.finding?.title ?? rule.label}
              text={rule.finding?.text ?? rule.clear}
            />
          ))}
        </ul>
      </Surface>
      <ScanCard />
    </PageFrame>
  );
}

/** A scan of any address: its public history, and its part in the swaps of this browser. */
function ScanCard() {
  const swaps = useSwaps();
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AddressScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const valid = EVM_ADDRESS_PATTERN.test(text);

  const scan = async () => {
    if (!valid) {
      setError(COPY.privacy.scanInvalid);
      return;
    }
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await client.scanAddress(text));
    } catch {
      setError(COPY.privacy.scanFailed);
    } finally {
      setScanning(false);
    }
  };

  const inSwaps =
    result === null
      ? 0
      : swaps.filter((swap) => swap.payoutAddress.toLowerCase() === result.address.toLowerCase()).length;

  return (
    <Surface>
      <div className="stack stack--tight">
        <p className="t-card-title">{COPY.privacy.scanTitle}</p>
        <p className="t-body-regular soft">{COPY.privacy.scanLead}</p>
      </div>
      <Field
        label={COPY.privacy.scanField}
        mono
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        hint={COPY.privacy.scanNote}
        value={text}
        onChange={(event) => {
          setText(event.target.value.trim());
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") void scan();
        }}
        error={error}
        action={
          <PillButton
            small
            busy={scanning}
            busyLabel={COPY.privacy.scanning}
            disabled={text === ""}
            onClick={() => void scan()}
          >
            {COPY.privacy.scanAction}
          </PillButton>
        }
      />
      {result !== null && (
        <div className="ringcard">
          <Ring parts={[result.transfers === 0, inSwaps === 0]} />
          <div className="ringcard__text">
            <p className="t-small-strong soft">{COPY.privacy.scanShows(shortAddress(result.address))}</p>
            <p className="t-board-title">{COPY.privacy.transfers(result.transfers)}</p>
            <p className="t-body-regular soft">
              {result.firstSeenAt !== null && `${COPY.privacy.firstSeen(formatDay(result.firstSeenAt))}. `}
              {COPY.privacy.inSwaps(inSwaps)}.
            </p>
          </div>
        </div>
      )}
    </Surface>
  );
}
