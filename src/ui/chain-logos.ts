import monero from "../assets/chains/monero.svg";
import starknet from "../assets/chains/starknet.svg";
import zcash from "../assets/chains/zcash.svg";
import type { FromChain } from "../gate/types.ts";

/** The official mark of each chain the coins can come from: the files of src/assets/chains/, each with its source. */
export const CHAIN_LOGOS: Record<FromChain, string> = { XMR: monero, ZEC: zcash, STRK: starknet };
