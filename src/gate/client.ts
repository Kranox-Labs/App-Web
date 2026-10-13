import type {
  AddressScan,
  ChainAsset,
  CreatedOut,
  CreatedPay,
  FromChain,
  OutQuote,
  OutRange,
  OutRequest,
  PayQuote,
  PayRange,
  PayRate,
  PayRequest,
  ProviderId,
  SwapState,
} from "./types.ts";

/** What the app asks of the relay. The relay holds the keys of the exchangers; the browser never sees them. */
export interface GateClient {
  payRange(provider: ProviderId, chain: FromChain, asset: ChainAsset, rate: PayRate): Promise<PayRange>;
  payQuote(
    provider: ProviderId,
    chain: FromChain,
    asset: ChainAsset,
    rate: PayRate,
    fromAmount: string,
  ): Promise<PayQuote>;
  createPay(request: PayRequest): Promise<CreatedPay>;
  /** The way out: a coin on Robinhood Chain into the coin of a chain, at the floating rate. */
  outRange(provider: ProviderId, chain: FromChain, asset: ChainAsset): Promise<OutRange>;
  outQuote(provider: ProviderId, chain: FromChain, asset: ChainAsset, fromAmount: string): Promise<OutQuote>;
  createOut(request: OutRequest): Promise<CreatedOut>;
  readSwap(provider: ProviderId, id: string, readToken: string): Promise<SwapState>;
  scanAddress(address: string): Promise<AddressScan>;
}
