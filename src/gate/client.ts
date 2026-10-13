import type {
  AddressScan,
  ChainAsset,
  CreatedPay,
  FromChain,
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
  readSwap(provider: ProviderId, id: string, readToken: string): Promise<SwapState>;
  scanAddress(address: string): Promise<AddressScan>;
}
