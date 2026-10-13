import eth from "../assets/coins/eth.svg";
import usdg from "../assets/coins/usdg.svg";
import type { ChainAsset } from "../gate/types.ts";

/** The official mark of each coin of Robinhood Chain on the way out; the coins on the way in wear the marks of their chains. */
export const COIN_LOGOS: Record<ChainAsset, string> = { ETH: eth, USDG: usdg };
