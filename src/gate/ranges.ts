import type { PayRange } from "./types.ts";

/** The least and the most of the coin of origin of a swap at a rate, over several providers. */
export interface FromRange {
  minFrom: number;
  maxFrom: number | null;
}

/**
 * The widest range over [ranges]: the least minimum and the greatest maximum, with no top once one provider has none.
 * An amount inside it has at least one provider; the provider step shows which. Null without a range.
 */
export function widestRange(ranges: readonly PayRange[]): FromRange | null {
  if (ranges.length === 0) return null;
  const minFrom = Math.min(...ranges.map((range) => range.minFrom));
  const maxFrom = ranges.some((range) => range.maxFrom === null)
    ? null
    : Math.max(...ranges.map((range) => range.maxFrom as number));
  return { minFrom, maxFrom };
}
