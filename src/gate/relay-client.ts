// The gate through the relay of Kranox, as the Mac app talks to it (apps/wallet/lib/bridge/client.dart): each request
// carries a nonce, and an answer counts only with the signature of the relay over that request and that answer, an
// error too. The relay holds the key of the exchanger and keeps no log of a request.
import { AMOUNT_MATCH_TOLERANCE, MONERO_DEPOSIT_PATTERN, RELAY_ANSWER_MAX_BYTES, RELAY_TIMEOUT_MS } from "../chain.ts";
import type { GateClient } from "./client.ts";
import { COPY } from "../copy.ts";
import { RelayError } from "./errors.ts";
import {
  readArray,
  readChoice,
  readNullableNumber,
  readNullableString,
  readNullableText,
  readNumber,
  readObject,
  readString,
  type Fields,
} from "./readers.ts";
import { importSigningKey, randomToken, verifiesAnswer, type SignedAnswer } from "./signature.ts";
import {
  PROVIDER_IDS,
  SWAP_STATUSES,
  type AddressScan,
  type ChainAsset,
  type CreatedPay,
  type PayLimit,
  type PayQuote,
  type PayRange,
  type PayRate,
  type PayRequest,
  type ProviderId,
  type SwapState,
} from "./types.ts";

/**
 * The headers of the nonce of a request, of the signature of an answer over its request, of the key of a creation,
 * and of the read token of a swap, as the relay reads and writes them.
 */
const NONCE_HEADER = "kranox-nonce";
const SIGNATURE_HEADER = "kranox-signature-v2";
const CREATION_KEY_HEADER = "idempotency-key";
const SWAP_TOKEN_HEADER = "kranox-swap-token";
const JSON_MEDIA_TYPE = "application/json";

/** A nonce has this many random bytes, as in the app. */
const NONCE_BYTES = 16;

/** The status with which nginx refuses a client over its limit, before the relay sees the request. */
const TOO_MANY_REQUESTS = 429;

/** The coins as the relay names them. */
const RELAY_ASSETS: Record<ChainAsset, string> = { ETH: "eth", USDG: "usdg" };
const RATES: readonly PayRate[] = ["fixed", "floating"];
const LIMITS: readonly PayLimit[] = ["below", "above"];

type Method = "GET" | "POST";

interface Call {
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export class RelayClient implements GateClient {
  readonly #base: URL;
  readonly #keys: Promise<readonly CryptoKey[]>;

  /** Talks to the relay at [relayUrl] and trusts an answer only under one of [signingKeys]. */
  constructor(relayUrl: string, signingKeys: readonly string[]) {
    this.#base = new URL(relayUrl);
    this.#keys = Promise.all(signingKeys.map(importSigningKey));
  }

  async payRange(provider: ProviderId, asset: ChainAsset, rate: PayRate): Promise<PayRange> {
    const fields = await this.#call("GET", "/v1/pay/range", {
      query: { provider, asset: RELAY_ASSETS[asset], rate },
    });
    return {
      provider: readProvider(fields, provider),
      asset: readAsset(fields, asset),
      rate: readRate(fields, rate),
      minXmr: readNumber(fields, "minXmr"),
      maxXmr: readNullableNumber(fields, "maxXmr"),
    };
  }

  async payQuote(provider: ProviderId, asset: ChainAsset, rate: PayRate, xmrAmount: string): Promise<PayQuote> {
    const fields = await this.#call("GET", "/v1/pay/quote", {
      query: { provider, asset: RELAY_ASSETS[asset], rate, xmrAmount },
    });
    if (readString(fields, "xmrAmount") !== xmrAmount) {
      throw new RelayError("failed", "The relay answered a quote for another amount.");
    }
    const limit = readNullableString(fields, "limit");
    return {
      provider: readProvider(fields, provider),
      asset: readAsset(fields, asset),
      rate: readRate(fields, rate),
      xmrAmount,
      amount: readNullableNumber(fields, "amount"),
      rateId: readNullableString(fields, "rateId"),
      validUntil: readNullableString(fields, "validUntil"),
      warning: readNullableString(fields, "warning"),
      depositFee: readNullableNumber(fields, "depositFee"),
      withdrawalFee: readNullableNumber(fields, "withdrawalFee"),
      speedMinutes: readNullableText(fields, "speedMinutes"),
      limit: limit === null ? null : readChoice(fields, "limit", LIMITS),
      minXmr: readNullableNumber(fields, "minXmr"),
      maxXmr: readNullableNumber(fields, "maxXmr"),
    };
  }

  async createPay(request: PayRequest): Promise<CreatedPay> {
    const fields = await this.#call("POST", "/v1/pay/swaps", {
      body: {
        provider: request.provider,
        asset: RELAY_ASSETS[request.asset],
        rate: request.rate,
        xmrAmount: request.xmrAmount,
        address: request.address,
        refundAddress: request.refundAddress,
        rateId: request.rateId,
      },
      headers: { [CREATION_KEY_HEADER]: request.creationKey },
    });
    const payoutAddress = readString(fields, "payoutAddress");
    if (payoutAddress.toLowerCase() !== request.address.toLowerCase()) {
      throw new RelayError("failed", "The relay opened a swap for another address.");
    }
    // The relay hands back the refund address that the exchanger recorded, so that a swap never promises a refund to
    // an address that the exchanger does not hold.
    const refundAddress = readNullableString(fields, "refundAddress");
    if (refundAddress !== request.refundAddress) {
      throw new RelayError("failed", "The relay opened a swap with another refund address.");
    }
    // The page tells the user to send exactly the amount of the swap, so it must be the amount of the request, and
    // the deposit address must be one of Monero, as the relay checks before it signs.
    const xmrAmount = readNumber(fields, "xmrAmount");
    if (!amountsMatch(Number(request.xmrAmount), xmrAmount)) {
      throw new RelayError("failed", "The relay opened a swap for another amount of XMR.");
    }
    const depositAddress = readString(fields, "depositAddress");
    if (!MONERO_DEPOSIT_PATTERN.test(depositAddress)) {
      throw new RelayError("failed", "The relay opened a swap with a deposit address that is not a Monero address.");
    }
    return {
      id: readString(fields, "id"),
      provider: readProvider(fields, request.provider),
      asset: readAsset(fields, request.asset),
      amount: readNumber(fields, "amount"),
      xmrAmount,
      depositAddress,
      payoutAddress,
      refundAddress,
      readToken: readString(fields, "readToken"),
    };
  }

  async readSwap(provider: ProviderId, id: string, readToken: string): Promise<SwapState> {
    const fields = await this.#call("GET", `/v1/swaps/${encodeURIComponent(id)}`, {
      query: { provider },
      headers: { [SWAP_TOKEN_HEADER]: readToken },
    });
    if (readString(fields, "id") !== id) throw new RelayError("failed", "The relay answered for another swap.");
    readProvider(fields, provider);
    return {
      id,
      status: readChoice(fields, "status", SWAP_STATUSES),
      expectedOut: readNullableNumber(fields, "expectedOut"),
      amountOut: readNullableNumber(fields, "amountOut"),
      depositHash: readNullableString(fields, "depositHash"),
      payoutHash: readNullableString(fields, "payoutHash"),
      refundHash: readNullableString(fields, "refundHash"),
      refundAmount: readNullableNumber(fields, "refundAmount"),
      updatedAt: readNullableString(fields, "updatedAt"),
      validUntil: readNullableString(fields, "validUntil"),
    };
  }

  async scanAddress(address: string): Promise<AddressScan> {
    const fields = await this.#call("GET", "/v1/scan/robinhood", { query: { address } });
    if (readString(fields, "address").toLowerCase() !== address.toLowerCase()) {
      throw new RelayError("failed", "The relay scanned another address.");
    }
    return summarizeScan(address, fields);
  }

  /**
   * One call to the relay: the request with its nonce, the answer read with a cap on its size and checked for the
   * signature of the relay over this request and this answer, and its fields. An error of the relay comes back as a
   * refusal with its text, or as a failure.
   */
  async #call(method: Method, path: string, call: Call = {}): Promise<Fields> {
    const url = new URL(this.#base);
    // The relay may sit under a path of its address, so the path of the call follows it.
    url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
    url.search = call.query === undefined ? "" : new URLSearchParams(call.query).toString();
    const target = `${url.pathname}${url.search}`;
    const nonce = randomToken(NONCE_BYTES);
    const requestBody = new TextEncoder().encode(call.body === undefined ? "" : JSON.stringify(call.body));
    const headers: Record<string, string> = { [NONCE_HEADER]: nonce, ...call.headers };
    if (call.body !== undefined) headers["content-type"] = JSON_MEDIA_TYPE;
    let response: Response;
    let text: string;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: call.body === undefined ? null : requestBody,
        signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
      });
      text = await readCapped(response);
    } catch (error) {
      if (error instanceof RelayError) throw error;
      throw new RelayError("down", error instanceof Error ? error.message : String(error));
    }
    // The limit of nginx in front of the relay answers 429 itself, without a signature; the app shows its own line for
    // it and reads nothing of the answer (12 Oct 2026).
    if (response.status === TOO_MANY_REQUESTS && response.headers.get(SIGNATURE_HEADER) === null) {
      throw new RelayError("refused", COPY.relay.busy);
    }
    const answer: SignedAnswer = { nonce, method, target, requestBody, status: response.status, body: text };
    if (!(await verifiesAnswer(await this.#keys, answer, response.headers.get(SIGNATURE_HEADER)))) {
      throw new RelayError("failed", `The relay answered ${response.status} without a valid signature.`);
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new RelayError("failed", `The relay answered ${response.status} without JSON.`);
    }
    const fields = readObject(data, "an answer");
    if (response.status >= 400) {
      const message = fields.error;
      const detail = typeof message === "string" ? message : `HTTP ${response.status}`;
      // A 503 of the relay says in its own words why it cannot serve right now, such as a missing key of a provider.
      const refused = response.status === 400 || response.status === 422 || response.status === 503;
      throw new RelayError(refused ? "refused" : "failed", detail);
    }
    return fields;
  }
}

/** The coin of an answer, which must be the coin of the request. */
function readAsset(fields: Fields, asset: ChainAsset): ChainAsset {
  if (readString(fields, "asset") !== RELAY_ASSETS[asset]) {
    throw new RelayError("failed", "The relay answered for another coin.");
  }
  return asset;
}

/** The provider of an answer, which must be the provider of the request. */
function readProvider(fields: Fields, provider: ProviderId): ProviderId {
  if (readChoice(fields, "provider", PROVIDER_IDS) !== provider) {
    throw new RelayError("failed", "The relay answered for another provider.");
  }
  return provider;
}

/** The rate of an answer, which must be the rate of the request. */
function readRate(fields: Fields, rate: PayRate): PayRate {
  if (readChoice(fields, "rate", RATES) !== rate) {
    throw new RelayError("failed", "The relay answered for another rate.");
  }
  return rate;
}

/** Whether two amounts differ by less than the tolerance, as the relay compares them. */
function amountsMatch(sent: number, answered: number): boolean {
  return Math.abs(sent - answered) <= AMOUNT_MATCH_TOLERANCE * Math.max(Math.abs(sent), Math.abs(answered));
}

/** The body of an answer, read up to the cap of the app, so that an answer of any size cannot fill its memory. */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (reader === undefined) return "";
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > RELAY_ANSWER_MAX_BYTES) {
      await reader.cancel();
      throw new RelayError("failed", "The relay answered with more bytes than the app reads.");
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** The time of a transfer of a scan, or null for no transfer. */
function transferTime(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return readString(readObject(value, "a transfer"), "time");
}

/** The times of the transfers of a list of a scan. */
function transferTimes(fields: Fields, name: string): string[] {
  return readArray(fields, name).map((item) => readString(readObject(item, "a transfer"), "time"));
}

/**
 * What the app shows of a scan of the relay: the count of transfers, and the first and the last time the address
 * was seen. The lists of the relay start with the newest transfer.
 */
export function summarizeScan(address: string, fields: Fields): AddressScan {
  const firsts = [
    transferTime(fields.firstTransaction),
    transferTime(fields.firstTokenTransfer),
    transferTime(fields.firstFunding),
  ].filter((time): time is string => time !== null);
  const lasts = [
    ...transferTimes(fields, "transactions").slice(0, 1),
    ...transferTimes(fields, "tokenTransfers").slice(0, 1),
  ];
  const earliest = (times: string[]) => (times.length === 0 ? null : times.reduce((a, b) => (a < b ? a : b)));
  const latest = (times: string[]) => (times.length === 0 ? null : times.reduce((a, b) => (a > b ? a : b)));
  return {
    address,
    transfers: readNumber(fields, "transactionCount") + readNumber(fields, "tokenTransferCount"),
    firstSeenAt: earliest(firsts),
    lastSeenAt: latest(lasts),
  };
}
