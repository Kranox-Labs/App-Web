import { loadConfig } from "../config.ts";
import { WalletBalanceReader, type BalanceReader } from "../wallet/balances.ts";
import type { EIP1193Provider } from "../wallet/provider.ts";
import type { GateClient } from "./client.ts";
import { RelayClient } from "./relay-client.ts";

const config = loadConfig();

/** The one client of the app: the relay of the settings of the build. */
export const client: GateClient = new RelayClient(config.relayUrl, config.relaySigningKeys);

/** The name of the relay that the app talks to, for the sidebar. */
export const relayHost: string = new URL(config.relayUrl).host;

/** The reader of what a wallet holds, through the wallet itself, so that no other service learns the address. */
export function balanceReader(provider: EIP1193Provider): BalanceReader {
  return new WalletBalanceReader(provider);
}
