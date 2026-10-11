import { useState } from "react";

import { COPY } from "../../copy.ts";
import { clearSwaps, useSwaps } from "../../door/store.ts";
import { PageFrame, PillButton, Surface } from "../widgets/bits.tsx";
import { SwapRow } from "../widgets/SwapRow.tsx";

/** The swaps of this browser, newest first, as the activity of the app. */
export function ActivityPage() {
  const swaps = useSwaps();
  // Forgetting takes two clicks, so that one slip loses nothing.
  const [sure, setSure] = useState(false);
  const forget = () => {
    if (!sure) {
      setSure(true);
      return;
    }
    clearSwaps();
    setSure(false);
  };
  return (
    <PageFrame title={COPY.activity.title} lead={COPY.activity.lead}>
      <Surface>
        {swaps.length === 0 ? (
          <p className="t-body-regular soft">{COPY.activity.empty}</p>
        ) : (
          <div className="list">
            {swaps.map((swap) => (
              <SwapRow key={swap.id} swap={swap} />
            ))}
          </div>
        )}
      </Surface>
      {swaps.length > 0 && (
        <div className="text-center">
          <PillButton tone="quiet" small onClick={forget} onBlur={() => setSure(false)}>
            {sure ? COPY.activity.forgetSure : COPY.activity.forget}
          </PillButton>
        </div>
      )}
    </PageFrame>
  );
}
