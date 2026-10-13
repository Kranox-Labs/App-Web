/** Robinhood Chain, as the wallet of the user must know it to switch to it (EIP-3085). */
export const ROBINHOOD_CHAIN = {
  id: 4663,
  hex: "0x1237",
  name: "Robinhood Chain",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  currency: { name: "Ether", symbol: "ETH", decimals: 18 },
} as const;

/**
 * The coins that the gate brings in and takes out, and how many decimals the app shows for each: in a balance or a
 * quote, and in an amount to send on the way out, which must be the exact amount the wallet transfers (six for both:
 * all of USDG, and more of ETH than any swap needs).
 */
export const CHAIN_ASSETS = {
  ETH: { label: "ETH", decimals: 6, sendDecimals: 6, chainDecimals: 18 },
  USDG: { label: "USDG", decimals: 2, sendDecimals: 6, chainDecimals: 6 },
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

/** A deposit address of the exchanger for XMR: a standard address or a subaddress of mainnet, or an integrated one. */
export const MONERO_DEPOSIT_PATTERN = /^(?:[48][1-9A-HJ-NP-Za-km-z]{94}|4[1-9A-HJ-NP-Za-km-z]{105})$/;

/**
 * The id of a swap, as the relay issues one: the id of the exchanger, such as 3a2360771439a3 or pch7l7kd1v2mzh1, with
 * "_" and "-" as some write them, or, at NEAR Intents, the deposit address of the swap, 0x and 64 hex digits. The same
 * form as EXCHANGE_ID_PATTERN of the relay (D-18 of the scan of 13 Oct 2026).
 */
export const SWAP_ID_PATTERN = /^[0-9a-zA-Z_-]{6,128}$/;

/** Two amounts match when they differ by less than this share of the larger one, as in the relay. */
export const AMOUNT_MATCH_TOLERANCE = 1e-9;

/** An amount as the relay reads it: digits, with a point for decimals. */
export const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,18})?$/;

/** An amount of XMR in the form has at most this many decimals, as in the app. */
export const XMR_DECIMALS = 8;

/** The form asks for a quote this long after the last change of the amount, as in the app. */
export const QUOTE_DELAY_MS = 600;

/** The app asks for the state of an open swap this often, as in the app. */
export const STATUS_INTERVAL_MS = 15_000;
