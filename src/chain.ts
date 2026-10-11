/** Robinhood Chain, as the wallet of the user must know it to switch to it (EIP-3085). */
export const ROBINHOOD_CHAIN = {
  id: 4663,
  hex: "0x1237",
  name: "Robinhood Chain",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  currency: { name: "Ether", symbol: "ETH", decimals: 18 },
} as const;

/** The coins that the door brings in, and how many decimals the app shows for each. */
export const CHAIN_ASSETS = {
  ETH: { label: "ETH", decimals: 6 },
  USDG: { label: "USDG", decimals: 2 },
} as const;

/**
 * USDG on Robinhood Chain, for the balance of a wallet. CHECKED 8 Oct 2026 for the app (apps/wallet/lib/config/
 * app_config.dart): the contract from the list of ChangeNOW gives the symbol USDG and 6 decimals.
 */
export const USDG = {
  contract: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  decimals: 6,
} as const;

/** A call to the relay that takes longer than this fails, as in the app. */
export const RELAY_TIMEOUT_MS = 30_000;

/** The app reads at most this many bytes of an answer of the relay before it checks the signature, as in the app. */
export const RELAY_ANSWER_MAX_BYTES = 1024 * 1024;

/** An address on Robinhood Chain: 0x and 40 hex digits. */
export const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/** A Monero mainnet address: a standard or a subaddress of 95 characters, as the relay accepts for a refund. */
export const MONERO_ADDRESS_PATTERN = /^[48][1-9A-HJ-NP-Za-km-z]{94}$/;

/** An amount as the relay reads it: digits, with a point for decimals. */
export const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,18})?$/;

/** An amount of XMR in the form has at most this many decimals, as in the app. */
export const XMR_DECIMALS = 8;

/** The form asks for a quote this long after the last change of the amount, as in the app. */
export const QUOTE_DELAY_MS = 600;

/** The app asks for the state of an open swap this often, as in the app. */
export const STATUS_INTERVAL_MS = 15_000;
