import { useSyncExternalStore } from "react";

import { ROBINHOOD_CHAIN } from "../chain.ts";

// The wallet of the user, found through EIP-6963: each wallet extension announces itself with a name and an icon,
// and the user picks one. The door asks it for its address and its network, and for a switch to Robinhood Chain.
// It never asks the wallet to sign: the coins arrive from the exchanger, so the wallet only receives.

/** A wallet as it speaks to a page (EIP-1193). */
export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

/** How a wallet names itself (EIP-6963). */
export interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface WalletChoice {
  info: WalletInfo;
  provider: EIP1193Provider;
}

export interface Connection {
  choice: WalletChoice;
  address: string;
  chainId: number;
}

export interface WalletState {
  /** The wallets that announced themselves in this browser. */
  wallets: readonly WalletChoice[];
  connection: Connection | null;
  /** Whether the app waits for the wallet, such as for the user to approve the connection. */
  busy: boolean;
  /** What went wrong with the last request, in a sentence for the page. */
  error: string | null;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

interface AnnounceEvent extends Event {
  detail?: { info?: Partial<WalletInfo>; provider?: EIP1193Provider };
}

/** The wallet that the user connected last, remembered so that a reload connects it again without a prompt. */
const REMEMBER_KEY = "kranox.door.wallet";

/** A wallet that speaks the old way only, through window.ethereum, gets this name. */
const FALLBACK_RDNS = "window.ethereum";
const FALLBACK_WAIT_MS = 400;

/** The code with which a wallet says that it does not know the chain (EIP-3085). */
const UNKNOWN_CHAIN_CODE = 4902;

/** The code with which a wallet says that the user refused (EIP-1193). */
const USER_REFUSED_CODE = 4001;

const listeners = new Set<() => void>();
let state: WalletState = { wallets: [], connection: null, busy: false, error: null };
let discovered = false;
let detach: (() => void) | null = null;

function set(next: Partial<WalletState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The wallets of this browser and the connection, kept fresh on every change. */
export function useWallet(): WalletState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Asks the wallets of this browser to announce themselves, once, and connects the remembered one without a prompt. */
export function discoverWallets(): void {
  if (discovered) return;
  discovered = true;
  window.addEventListener("eip6963:announceProvider", (event: AnnounceEvent) => {
    const info = event.detail?.info;
    const provider = event.detail?.provider;
    if (!info || !provider || typeof info.uuid !== "string" || typeof info.name !== "string") return;
    if (state.wallets.some((wallet) => wallet.info.uuid === info.uuid)) return;
    const choice: WalletChoice = {
      info: { uuid: info.uuid, name: info.name, icon: info.icon ?? "", rdns: info.rdns ?? info.uuid },
      provider,
    };
    set({ wallets: [...state.wallets, choice] });
    if (state.connection === null && remembered() === choice.info.rdns) void reconnect(choice);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // A wallet that announces nothing may still sit at window.ethereum, as in the browser of some wallet apps.
  window.setTimeout(() => {
    if (state.wallets.length > 0 || window.ethereum === undefined) return;
    const choice: WalletChoice = {
      info: { uuid: FALLBACK_RDNS, name: "Browser wallet", icon: "", rdns: FALLBACK_RDNS },
      provider: window.ethereum,
    };
    set({ wallets: [choice] });
    if (remembered() === FALLBACK_RDNS) void reconnect(choice);
  }, FALLBACK_WAIT_MS);
}

/** Connects [choice]: the wallet asks the user, and the first address it gives becomes the one that receives. */
export async function connectWallet(choice: WalletChoice): Promise<void> {
  set({ busy: true, error: null });
  try {
    const accounts = await choice.provider.request({ method: "eth_requestAccounts" });
    const address = firstAddress(accounts);
    if (address === null) throw new Error("The wallet gave no address.");
    const chainId = await readChainId(choice.provider);
    attach(choice);
    remember(choice.info.rdns);
    set({ connection: { choice, address, chainId }, busy: false });
  } catch (error) {
    set({ busy: false, error: messageOf(error, "The wallet refused the connection.") });
  }
}

/** Connects a wallet that the user connected before, without a prompt: the wallet gives its addresses or none. */
async function reconnect(choice: WalletChoice): Promise<void> {
  try {
    const accounts = await choice.provider.request({ method: "eth_accounts" });
    const address = firstAddress(accounts);
    if (address === null) return;
    const chainId = await readChainId(choice.provider);
    attach(choice);
    set({ connection: { choice, address, chainId } });
  } catch {
    // The wallet answers later, or not at all. The user connects by hand.
  }
}

/** Forgets the connection. The wallet itself keeps its own list of connected sites. */
export function forgetWallet(): void {
  detach?.();
  detach = null;
  try {
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Nothing to forget without storage.
  }
  set({ connection: null, error: null });
}

/** Asks the wallet to switch to Robinhood Chain, and to add it first when it does not know it. */
export async function switchToRobinhoodChain(): Promise<void> {
  const connection = state.connection;
  if (connection === null) return;
  const provider = connection.choice.provider;
  set({ busy: true, error: null });
  try {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ROBINHOOD_CHAIN.hex }] });
    } catch (error) {
      if (codeOf(error) !== UNKNOWN_CHAIN_CODE) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ROBINHOOD_CHAIN.hex,
            chainName: ROBINHOOD_CHAIN.name,
            rpcUrls: [ROBINHOOD_CHAIN.rpcUrl],
            nativeCurrency: ROBINHOOD_CHAIN.currency,
          },
        ],
      });
    }
    const chainId = await readChainId(provider);
    set({ connection: { ...connection, chainId }, busy: false });
  } catch (error) {
    set({ busy: false, error: messageOf(error, "The wallet did not switch the network.") });
  }
}

/** A connection to a made-up wallet, for a look at the pages during development only. */
export function connectSampleWallet(): void {
  if (!import.meta.env.DEV) return;
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const address = `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const provider: EIP1193Provider = {
    request: async ({ method }) => {
      if (method === "eth_chainId") return ROBINHOOD_CHAIN.hex;
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [address];
      // The made-up wallet holds nothing, so a balance reads as zero.
      if (method === "eth_getBalance" || method === "eth_call") return "0x0";
      return null;
    },
  };
  const choice: WalletChoice = {
    info: { uuid: "sample", name: "Sample wallet", icon: "", rdns: "sample" },
    provider,
  };
  set({ connection: { choice, address, chainId: ROBINHOOD_CHAIN.id }, error: null });
}

function attach(choice: WalletChoice): void {
  detach?.();
  const onAccounts = (...args: unknown[]) => {
    const address = firstAddress(args[0]);
    if (address === null) {
      forgetWallet();
    } else if (state.connection !== null) {
      set({ connection: { ...state.connection, address } });
    }
  };
  const onChain = (...args: unknown[]) => {
    const chainId = parseChainId(args[0]);
    if (chainId !== null && state.connection !== null) set({ connection: { ...state.connection, chainId } });
  };
  choice.provider.on?.("accountsChanged", onAccounts);
  choice.provider.on?.("chainChanged", onChain);
  detach = () => {
    choice.provider.removeListener?.("accountsChanged", onAccounts);
    choice.provider.removeListener?.("chainChanged", onChain);
  };
}

async function readChainId(provider: EIP1193Provider): Promise<number> {
  return parseChainId(await provider.request({ method: "eth_chainId" })) ?? 0;
}

function parseChainId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 16);
  return Number.isNaN(parsed) ? null : parsed;
}

function firstAddress(accounts: unknown): string | null {
  if (!Array.isArray(accounts)) return null;
  const first: unknown = accounts[0];
  return typeof first === "string" && first.length > 0 ? first : null;
}

function remembered(): string | null {
  try {
    return localStorage.getItem(REMEMBER_KEY);
  } catch {
    return null;
  }
}

function remember(rdns: string): void {
  try {
    localStorage.setItem(REMEMBER_KEY, rdns);
  } catch {
    // Without storage the user connects again after a reload.
  }
}

function codeOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const code: unknown = (error as { code?: unknown }).code;
  return typeof code === "number" ? code : null;
}

function messageOf(error: unknown, fallback: string): string {
  if (codeOf(error) === USER_REFUSED_CODE) return "You refused the request in the wallet.";
  return fallback;
}
