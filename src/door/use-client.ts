import { loadConfig } from "../config.ts";
import { SampleBalanceReader, WalletBalanceReader, type BalanceReader } from "../wallet/balances.ts";
import type { EIP1193Provider } from "../wallet/provider.ts";
import { SampleClient, type DoorClient } from "./client.ts";
import { RelayClient } from "./relay-client.ts";

const config = loadConfig();

/** The one client of the app: the relay, or the sample client when the build runs on sample data. */
export const client: DoorClient = config.sampleData
  ? new SampleClient()
  : new RelayClient(config.relayUrl, config.relaySigningKeys);

/** The name of the relay that the app talks to, for the sidebar, or null on sample data. */
export const relayHost: string | null = config.sampleData ? null : new URL(config.relayUrl).host;

/** The reader of what a wallet holds: through the wallet itself, or made up when the build runs on sample data. */
export function balanceReader(provider: EIP1193Provider): BalanceReader {
  return config.sampleData ? new SampleBalanceReader() : new WalletBalanceReader(provider);
}
