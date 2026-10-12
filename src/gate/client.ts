import { EVM_ADDRESS_PATTERN, MONERO_ADDRESS_PATTERN } from "../chain.ts";
import type {
  AddressScan,
  ChainAsset,
  CreatedPay,
  PayQuote,
  PayRange,
  PayRate,
  PayRequest,
  SwapState,
} from "./types.ts";

/** What the app asks of the relay. The relay holds the key of the exchanger; the browser never sees it. */
export interface GateClient {
  /** Whether the answers are made up, so that the app says so. */
  readonly sample: boolean;
  payRange(asset: ChainAsset, rate: PayRate): Promise<PayRange>;
  payQuote(asset: ChainAsset, rate: PayRate, xmrAmount: string): Promise<PayQuote>;
  createPay(request: PayRequest): Promise<CreatedPay>;
  readSwap(id: string, readToken: string): Promise<SwapState>;
  scanAddress(address: string): Promise<AddressScan>;
}

// The sample client answers from thin air, so that every page of the app shows without the relay. Nothing leaves the
// browser, and no swap is made anywhere. Its swaps move through their steps with the clock, a step every half minute,
// so that the page of a swap shows each one.
const SAMPLE_RATES: Record<ChainAsset, number> = { ETH: 0.0712, USDG: 318.5 };
const SAMPLE_WITHDRAWAL_FEES: Record<ChainAsset, number> = { ETH: 0.0003, USDG: 1.2 };
const SAMPLE_MIN_XMR = 0.013;
const SAMPLE_MAX_XMR = 72;
const SAMPLE_SPREAD = 0.005;
const SAMPLE_SPEED_MINUTES = "10";
const SAMPLE_QUOTE_MINUTES = 10;
const SAMPLE_DEPOSIT_MINUTES = 20;
const SAMPLE_STEP_SECONDS = 30;
const SAMPLE_DELAY_MS = 500;
const SAMPLE_KEY = "kranox.gate.sample";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";
const HEX = "0123456789abcdef";

function randomText(alphabet: string, length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** A number from an address, the same for the same address, so that a page shows the same thing twice. */
function seedOf(address: string): number {
  return Array.from(address.toLowerCase()).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export class SampleClient implements GateClient {
  readonly sample = true;

  // When each sample swap started, kept in the browser so that a reload shows the same step.
  private readonly starts: Map<string, number> = readStarts();

  async payRange(asset: ChainAsset, rate: PayRate): Promise<PayRange> {
    await wait(SAMPLE_DELAY_MS);
    return { asset, rate, minXmr: SAMPLE_MIN_XMR, maxXmr: rate === "fixed" ? SAMPLE_MAX_XMR : null };
  }

  async payQuote(asset: ChainAsset, rate: PayRate, xmrAmount: string): Promise<PayQuote> {
    await wait(SAMPLE_DELAY_MS);
    const xmr = Number(xmrAmount);
    const empty = {
      asset,
      rate,
      xmrAmount,
      amount: null,
      rateId: null,
      validUntil: null,
      warning: null,
      depositFee: null,
      withdrawalFee: null,
      speedMinutes: null,
    };
    if (xmr < SAMPLE_MIN_XMR) return { ...empty, limit: "below", minXmr: SAMPLE_MIN_XMR, maxXmr: SAMPLE_MAX_XMR };
    if (xmr > SAMPLE_MAX_XMR) return { ...empty, limit: "above", minXmr: SAMPLE_MIN_XMR, maxXmr: SAMPLE_MAX_XMR };
    const gross = xmr * SAMPLE_RATES[asset] * (1 - SAMPLE_SPREAD);
    const amount = Math.max(0, gross - SAMPLE_WITHDRAWAL_FEES[asset]);
    return {
      ...empty,
      amount: Number(amount.toFixed(8)),
      rateId: rate === "fixed" ? randomText(BASE36, 24) : null,
      validUntil: rate === "fixed" ? minutesFromNow(SAMPLE_QUOTE_MINUTES) : null,
      depositFee: 0,
      withdrawalFee: SAMPLE_WITHDRAWAL_FEES[asset],
      speedMinutes: SAMPLE_SPEED_MINUTES,
      limit: null,
      minXmr: null,
      maxXmr: null,
    };
  }

  async createPay(request: PayRequest): Promise<CreatedPay> {
    await wait(SAMPLE_DELAY_MS);
    if (!EVM_ADDRESS_PATTERN.test(request.address)) throw new Error("The address must be a Robinhood Chain address.");
    if (!MONERO_ADDRESS_PATTERN.test(request.refundAddress))
      throw new Error("The refund address must be a Monero address.");
    const quote = await this.payQuote(request.asset, request.rate, request.xmrAmount);
    if (quote.amount === null) throw new Error("The amount is outside the range of the rate.");
    const id = randomText(BASE36, 14);
    this.starts.set(id, Date.now());
    writeStarts(this.starts);
    return {
      id,
      asset: request.asset,
      amount: quote.amount,
      xmrAmount: Number(request.xmrAmount),
      depositAddress: `4${randomText(BASE58, 94)}`,
      payoutAddress: request.address,
      refundAddress: request.refundAddress,
      readToken: randomText(HEX, 32),
    };
  }

  async readSwap(id: string): Promise<SwapState> {
    await wait(SAMPLE_DELAY_MS);
    const start = this.starts.get(id);
    const step = start === undefined ? 99 : Math.floor((Date.now() - start) / (SAMPLE_STEP_SECONDS * 1000));
    const status =
      step <= 0
        ? "waiting"
        : step === 1
          ? "confirming"
          : step === 2
            ? "exchanging"
            : step === 3
              ? "sending"
              : "finished";
    const validUntil = start === undefined ? null : new Date(start + SAMPLE_DEPOSIT_MINUTES * 60_000).toISOString();
    return {
      id,
      status,
      expectedOut: null,
      amountOut: null,
      depositHash: step >= 1 ? randomText(HEX, 64) : null,
      payoutHash: step >= 4 ? `0x${randomText(HEX, 64)}` : null,
      refundHash: null,
      refundAmount: null,
      updatedAt: new Date().toISOString(),
      validUntil,
    };
  }

  async scanAddress(address: string): Promise<AddressScan> {
    await wait(SAMPLE_DELAY_MS);
    const kind = seedOf(address) % 3;
    if (kind === 0) return { address, transfers: 0, firstSeenAt: null, lastSeenAt: null };
    const transfers = kind === 1 ? 3 : 41;
    return {
      address,
      transfers,
      firstSeenAt: new Date(Date.now() - transfers * 86_400_000).toISOString(),
      lastSeenAt: new Date(Date.now() - 3_600_000).toISOString(),
    };
  }
}

function readStarts(): Map<string, number> {
  try {
    const raw = localStorage.getItem(SAMPLE_KEY);
    if (raw === null) return new Map();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return new Map();
    const entries = Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === "number");
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function writeStarts(starts: Map<string, number>): void {
  try {
    localStorage.setItem(SAMPLE_KEY, JSON.stringify(Object.fromEntries(starts)));
  } catch {
    // Without storage the sample swap stays at its first step after a reload. Nothing to do.
  }
}
