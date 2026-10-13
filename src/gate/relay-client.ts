// The gate through the relay of Kranox, as the Mac app talks to it (apps/wallet/lib/bridge/client.dart): each request
// carries a nonce, and an answer counts only with the signature of the relay over that request and that answer, an
// error too. The relay holds the key of the exchanger and keeps no log of a request. From 13 Oct 2026 a payment names
// its chain of origin (from) and its amount as fromAmount, the names the relay holds for every coin; and the way out
// names the coin on Robinhood Chain as from and the chain that receives as to, at the floating rate alone.
import {
  AMOUNT_MATCH_TOLERANCE,
  EVM_ADDRESS_PATTERN,
  RELAY_ANSWER_MAX_BYTES,
  RELAY_TIMEOUT_MS,
  SWAP_ID_PATTERN,
} from "../chain.ts";
import { CHAIN_FACTS } from "./chains.ts";
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
  type CreatedOut,
  type CreatedPay,
  type FromChain,
  type OutQuote,
  type OutRange,
  type OutRequest,
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

  async payRange(provider: ProviderId, chain: FromChain, asset: ChainAsset, rate: PayRate): Promise<PayRange> {
    const fields = await this.#call("GET", "/v1/pay/range", {
      query: { provider, from: CHAIN_FACTS[chain].relayName, asset: RELAY_ASSETS[asset], rate },
    });
    return {
      provider: readProvider(fields, provider),
      chain: readChain(fields, chain),
      asset: readAsset(fields, asset),
      rate: readRate(fields, rate),
      minFrom: readNumber(fields, "minFrom"),
      maxFrom: readNullableNumber(fields, "maxFrom"),
    };
  }

  async payQuote(
    provider: ProviderId,
    chain: FromChain,
    asset: ChainAsset,
    rate: PayRate,
    fromAmount: string,
  ): Promise<PayQuote> {
    const fields = await this.#call("GET", "/v1/pay/quote", {
      query: { provider, from: CHAIN_FACTS[chain].relayName, asset: RELAY_ASSETS[asset], rate, fromAmount },
    });
    if (readString(fields, "fromAmount") !== fromAmount) {
      throw new RelayError("failed", "The relay answered a quote for another amount.");
    }
    const limit = readNullableString(fields, "limit");
    return {
      provider: readProvider(fields, provider),
      chain: readChain(fields, chain),
      asset: readAsset(fields, asset),
      rate: readRate(fields, rate),
      fromAmount,
      amount: readNullableNumber(fields, "amount"),
      rateId: readNullableString(fields, "rateId"),
      validUntil: readNullableString(fields, "validUntil"),
      warning: readNullableString(fields, "warning"),
      depositFee: readNullableNumber(fields, "depositFee"),
      withdrawalFee: readNullableNumber(fields, "withdrawalFee"),
      speedMinutes: readNullableText(fields, "speedMinutes"),
      limit: limit === null ? null : readChoice(fields, "limit", LIMITS),
      minFrom: readNullableNumber(fields, "minFrom"),
      maxFrom: readNullableNumber(fields, "maxFrom"),
    };
  }

  async createPay(request: PayRequest): Promise<CreatedPay> {
    const fields = await this.#call("POST", "/v1/pay/swaps", {
      body: {
        provider: request.provider,
        from: CHAIN_FACTS[request.chain].relayName,
        asset: RELAY_ASSETS[request.asset],
        rate: request.rate,
        fromAmount: request.fromAmount,
        address: request.address,
        refundAddress: request.refundAddress,
        rateId: request.rateId,
      },
      headers: { [CREATION_KEY_HEADER]: request.creationKey },
    });
    return createdPayOf(request, fields);
  }

  async outRange(provider: ProviderId, chain: FromChain, asset: ChainAsset): Promise<OutRange> {
    const fields = await this.#call("GET", "/v1/out/range", {
      query: { provider, from: RELAY_ASSETS[asset], to: CHAIN_FACTS[chain].relayName },
    });
    return {
      provider: readProvider(fields, provider),
      chain: readOutChain(fields, chain),
      asset: readOutAsset(fields, asset),
      minFrom: readNumber(fields, "minFrom"),
      maxFrom: readNullableNumber(fields, "maxFrom"),
    };
  }

  async outQuote(provider: ProviderId, chain: FromChain, asset: ChainAsset, fromAmount: string): Promise<OutQuote> {
    const fields = await this.#call("GET", "/v1/out/quote", {
      query: { provider, from: RELAY_ASSETS[asset], to: CHAIN_FACTS[chain].relayName, fromAmount },
    });
    if (readString(fields, "fromAmount") !== fromAmount) {
      throw new RelayError("failed", "The relay answered a quote for another amount.");
    }
    const limit = readNullableString(fields, "limit");
    return {
      provider: readProvider(fields, provider),
      chain: readOutChain(fields, chain),
      asset: readOutAsset(fields, asset),
      fromAmount,
      amount: readNullableNumber(fields, "amount"),
      validUntil: readNullableString(fields, "validUntil"),
      warning: readNullableString(fields, "warning"),
      depositFee: readNullableNumber(fields, "depositFee"),
      withdrawalFee: readNullableNumber(fields, "withdrawalFee"),
      speedMinutes: readNullableText(fields, "speedMinutes"),
      limit: limit === null ? null : readChoice(fields, "limit", LIMITS),
      minFrom: readNullableNumber(fields, "minFrom"),
      maxFrom: readNullableNumber(fields, "maxFrom"),
    };
  }

  async createOut(request: OutRequest): Promise<CreatedOut> {
    const fields = await this.#call("POST", "/v1/out/swaps", {
      body: {
        provider: request.provider,
        from: RELAY_ASSETS[request.asset],
        to: CHAIN_FACTS[request.chain].relayName,
        fromAmount: request.fromAmount,
        address: request.address,
        refundAddress: request.refundAddress,
      },
      headers: { [CREATION_KEY_HEADER]: request.creationKey },
    });
    return createdOutOf(request, fields);
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

/**
 * The swap that the relay opened for [request], read from the fields of its answer, each checked against the request:
 * the page shows the user where to send and how much, so nothing of it may come from anywhere but a checked answer.
 */
export function createdPayOf(request: PayRequest, fields: Fields): CreatedPay {
  const facts = CHAIN_FACTS[request.chain];
  const payoutAddress = readString(fields, "payoutAddress");
  if (payoutAddress.toLowerCase() !== request.address.toLowerCase()) {
    throw new RelayError("failed", "The relay opened a swap for another address.");
  }
  // The relay hands back the refund address that the exchanger recorded, so that a swap never promises a refund to
  // an address that the exchanger does not hold. The chain says whether two spellings name one account; the record
  // keeps the spelling of the user, which is the one they compare with their wallet (D-25 of the scan of 13 Oct 2026).
  const recorded = readNullableString(fields, "refundAddress");
  if (recorded === null || !facts.sameAddress(recorded, request.refundAddress)) {
    throw new RelayError("failed", "The relay opened a swap with another refund address.");
  }
  // The page tells the user to send exactly the amount of the swap, so it must be the amount of the request, and
  // the deposit address must be one of the chain of origin, as the relay checks before it signs.
  const fromAmount = readNumber(fields, "fromAmount");
  if (!amountsMatch(Number(request.fromAmount), fromAmount)) {
    throw new RelayError("failed", `The relay opened a swap for another amount of ${facts.coin}.`);
  }
  const depositAddress = readString(fields, "depositAddress");
  if (!facts.isDepositAddress(depositAddress)) {
    throw new RelayError("failed", "The relay opened a swap with a deposit address that is not one of the chain.");
  }
  // An id of another form than the relay issues could never be opened again in the app (D-18).
  const id = readString(fields, "id");
  if (!SWAP_ID_PATTERN.test(id))
    throw new RelayError("failed", "The relay opened a swap with an id of the wrong form.");
  return {
    id,
    provider: readProvider(fields, request.provider),
    chain: readChain(fields, request.chain),
    asset: readAsset(fields, request.asset),
    amount: readNumber(fields, "amount"),
    fromAmount,
    depositAddress,
    payoutAddress,
    refundAddress: request.refundAddress,
    validUntil: readNullableString(fields, "validUntil"),
    readToken: readString(fields, "readToken"),
  };
}

/**
 * The swap out that the relay opened for [request], read from the fields of its answer, each checked against the
 * request: the page tells the wallet where to send and how much, so nothing of it may come from anywhere but a
 * checked answer.
 */
export function createdOutOf(request: OutRequest, fields: Fields): CreatedOut {
  const facts = CHAIN_FACTS[request.chain];
  // The exchanger pays the address of the chain that the user typed, in the spelling the chain reads.
  const payoutAddress = readString(fields, "payoutAddress");
  if (!facts.sameAddress(payoutAddress, request.address)) {
    throw new RelayError("failed", "The relay opened a swap for another address.");
  }
  // The refund goes to the wallet that sends, which the exchanger must have recorded; the record keeps the spelling
  // of the wallet, which is the one the user compares with it.
  const recorded = readNullableString(fields, "refundAddress");
  if (recorded === null || recorded.toLowerCase() !== request.refundAddress.toLowerCase()) {
    throw new RelayError("failed", "The relay opened a swap with another refund address.");
  }
  const fromAmount = readNumber(fields, "fromAmount");
  if (!amountsMatch(Number(request.fromAmount), fromAmount)) {
    throw new RelayError("failed", `The relay opened a swap for another amount of ${request.asset}.`);
  }
  // The wallet sends to the deposit address, so it must be one of Robinhood Chain, as the relay checks before it signs.
  const depositAddress = readString(fields, "depositAddress");
  if (!EVM_ADDRESS_PATTERN.test(depositAddress)) {
    throw new RelayError(
      "failed",
      "The relay opened a swap with a deposit address that is not one of Robinhood Chain.",
    );
  }
  const id = readString(fields, "id");
  if (!SWAP_ID_PATTERN.test(id))
    throw new RelayError("failed", "The relay opened a swap with an id of the wrong form.");
  return {
    id,
    provider: readProvider(fields, request.provider),
    chain: readOutChain(fields, request.chain),
    asset: readOutAsset(fields, request.asset),
    amount: readNumber(fields, "amount"),
    fromAmount,
    depositAddress,
    payoutAddress,
    refundAddress: request.refundAddress,
    validUntil: readNullableString(fields, "validUntil"),
    readToken: readString(fields, "readToken"),
  };
}

/** The coin on Robinhood Chain of an answer of the way out, under the name from, which must be the coin of the request. */
function readOutAsset(fields: Fields, asset: ChainAsset): ChainAsset {
  if (readString(fields, "from") !== RELAY_ASSETS[asset]) {
    throw new RelayError("failed", "The relay answered for another coin.");
  }
  return asset;
}

/** The chain that receives of an answer of the way out, under the name to, which must be the chain of the request. */
function readOutChain(fields: Fields, chain: FromChain): FromChain {
  if (readString(fields, "to") !== CHAIN_FACTS[chain].relayName) {
    throw new RelayError("failed", "The relay answered for another chain.");
  }
  return chain;
}

/** The coin of an answer, which must be the coin of the request. */
function readAsset(fields: Fields, asset: ChainAsset): ChainAsset {
  if (readString(fields, "asset") !== RELAY_ASSETS[asset]) {
    throw new RelayError("failed", "The relay answered for another coin.");
  }
  return asset;
}

/** The chain of origin of an answer, which must be the chain of the request. */
function readChain(fields: Fields, chain: FromChain): FromChain {
  if (readString(fields, "from") !== CHAIN_FACTS[chain].relayName) {
    throw new RelayError("failed", "The relay answered for another chain.");
  }
  return chain;
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
