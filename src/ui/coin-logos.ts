import monero from "../assets/chains/monero.svg";
import eth from "../assets/coins/eth.svg";
import usdg from "../assets/coins/usdg.svg";
import type { ChainAsset } from "../gate/types.ts";

/** The official mark of each coin of the form: XMR on the way in, and the coins of Robinhood Chain on the way out. */
export const COIN_LOGOS: Record<"XMR" | ChainAsset, string> = { XMR: monero, ETH: eth, USDG: usdg };
