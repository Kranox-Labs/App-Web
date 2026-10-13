import { COPY, stageText } from "../../copy.ts";
import type { SwapRecord } from "../../gate/store.ts";
import { isOpen } from "../../gate/types.ts";
import { formatAsset, formatFrom, formatMoment } from "../../format.ts";
import { ROUTES } from "../../router.ts";
import { ListRow } from "./bits.tsx";
import type { IconName } from "./Icon.tsx";

/** One swap in a list, as a transfer in the activity of the app. A click opens its page. */
export function SwapRow({ swap }: { swap: SwapRecord }) {
  const open = isOpen(swap.status);
  const words = COPY.chains[swap.chain];
  const [icon, tone]: [IconName, "accent" | "solid" | "danger"] =
    swap.status === "finished"
      ? ["check", "solid"]
      : swap.status === "refunded"
        ? ["undo", "solid"]
        : open
          ? ["arrowDown", "accent"]
          : ["priorityHigh", "danger"];
  return (
    <ListRow
      href={ROUTES.swap(swap.id)}
      icon={icon}
      tone={tone}
      title={`${formatFrom(swap.fromAmount, swap.chain)} ${words.coin}`}
      subtitle={`${formatMoment(swap.createdAt)} · ${stageText(swap.status, words.name)}`}
      amount={`+${formatAsset(swap.amount, swap.asset)}`}
      unit={swap.asset}
    />
  );
}
