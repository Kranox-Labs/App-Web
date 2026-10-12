import type { PayRange } from "./types.ts";

/** The least and the most XMR of a swap at a rate, over several providers. */
export interface XmrRange {
  minXmr: number;
  maxXmr: number | null;
}

/**
 * The widest range over [ranges]: the least minimum and the greatest maximum, with no top once one provider has none.
 * An amount inside it has at least one provider; the provider step shows which. Null without a range.
 */
export function widestRange(ranges: readonly PayRange[]): XmrRange | null {
  if (ranges.length === 0) return null;
  const minXmr = Math.min(...ranges.map((range) => range.minXmr));
  const maxXmr = ranges.some((range) => range.maxXmr === null)
    ? null
    : Math.max(...ranges.map((range) => range.maxXmr as number));
  return { minXmr, maxXmr };
}
