import { CHAIN_ASSETS, XMR_DECIMALS } from "./chain.ts";
import type { ChainAsset } from "./door/types.ts";

/** An amount of XMR with up to eight decimals and no trailing zeros. */
export function formatXmr(amount: number): string {
  return trimZeros(amount.toFixed(XMR_DECIMALS));
}

/** An amount of a coin of Robinhood Chain with the decimals of that coin. */
export function formatAsset(amount: number, asset: ChainAsset): string {
  return trimZeros(amount.toFixed(CHAIN_ASSETS[asset].decimals));
}

/** A balance of a coin of Robinhood Chain with all the decimals of that coin, as a balance card shows one. */
export function formatBalance(amount: number, asset: ChainAsset): string {
  return amount.toFixed(asset === "USDG" ? 2 : 4);
}

function trimZeros(text: string): string {
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}

/** An address cut to its ends, for a pill. The pages show every address in full. */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** A moment as the browser of the user writes it, in the language of the browser. */
export function formatMoment(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** A moment as a day only. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** The time until [iso] as minutes and seconds, or null once it has passed. */
export function formatTimeLeft(iso: string, now: number): string | null {
  const left = Math.floor((new Date(iso).getTime() - now) / 1000);
  if (left <= 0) return null;
  const minutes = Math.floor(left / 60);
  const seconds = left % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** How long ago [iso] was, in whole hours or minutes. */
export function formatAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}
