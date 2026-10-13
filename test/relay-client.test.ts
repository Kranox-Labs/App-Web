import assert from "node:assert/strict";
import { test } from "node:test";
import { RelayError } from "../src/gate/errors.ts";
import { createdOutOf, createdPayOf } from "../src/gate/relay-client.ts";
import type { OutRequest, PayRequest } from "../src/gate/types.ts";

// The addresses of the tests of the relay: a wallet on Robinhood Chain that holds nothing, a refund address on
// Starknet, the deposit address of a swap at NEAR Intents, and a Monero mainnet subaddress of a throwaway wallet.
const RECIPIENT = "0x7a3fC0e1b9D24A6c58E0f3B1d9a7C4e2F6b8D015";
const STRK_REFUND = "0x04a3f9c1b2e7d8a5c6f0e1d2c3b4a5968778695a4b3c2d1e0f1a2b3c4d5e6f70";
const STRK_DEPOSIT = "0x01fe9d23d596cb6caf7140cb0a9dad3804366d551332bc2bebef6007b8316606";
const XMR_REFUND = "883z7Wmbd5nhoH6xQxLzgniNhN6jqdvxFiza4rMdErWA1XW1TCL1tqrCwWFwhG1QkuL17RRHP45J33y6u4sH8Rfa7kryRza";
const XMR_DEPOSIT = "48PFnHrr8bVGx463yo8SMXGZUp7PyYPgwZJR4MnpgjKCDXpw3XvK6UTbarKkpwaPbPSYSdJ4rozjZjGxr2t3qVP4B4DzzVs";

const request: PayRequest = {
  provider: "oneclick",
  chain: "STRK",
  asset: "USDG",
  rate: "floating",
  fromAmount: "1000",
  address: RECIPIENT,
  refundAddress: STRK_REFUND,
  rateId: null,
  creationKey: "key",
};

/** The answer of the relay to the request above, as it came on 13 Oct 2026. */
const answer = {
  id: STRK_DEPOSIT,
  provider: "oneclick",
  from: "strk",
  asset: "usdg",
  amount: 87.052803,
  fromAmount: 1000,
  depositAddress: STRK_DEPOSIT,
  payoutAddress: RECIPIENT.toLowerCase(),
  refundAddress: STRK_REFUND,
  validUntil: "2026-10-13T05:15:45.460Z",
  readToken: "token",
};

const refused = (fields: Record<string, unknown>, reason: RegExp, what: string) =>
  assert.throws(
    () => createdPayOf(request, { ...answer, ...fields }),
    (error: unknown) => error instanceof RelayError && error.kind === "failed" && reason.test(error.message),
    what,
  );

test("reads the swap the relay opened, with the spelling of the refund address of the user (D-25)", () => {
  assert.deepEqual(createdPayOf(request, answer), {
    id: STRK_DEPOSIT,
    provider: "oneclick",
    chain: "STRK",
    asset: "USDG",
    amount: 87.052803,
    fromAmount: 1000,
    depositAddress: STRK_DEPOSIT,
    payoutAddress: RECIPIENT.toLowerCase(),
    refundAddress: STRK_REFUND,
    validUntil: "2026-10-13T05:15:45.460Z",
    readToken: "token",
  });
  // The exchanger may write the same account without its leading zero or in another case: the same swap.
  const spelled = createdPayOf(request, { ...answer, refundAddress: `0x${STRK_REFUND.slice(3).toUpperCase()}` });
  assert.equal(spelled.refundAddress, STRK_REFUND);
});

test("refuses an answer that differs from the request in anything the page shows", () => {
  refused({ payoutAddress: STRK_DEPOSIT }, /another address/, "another recipient");
  refused({ refundAddress: null }, /another refund address/, "no refund address");
  refused({ refundAddress: XMR_REFUND }, /another refund address/, "a refund address of another chain");
  refused({ refundAddress: `0x${STRK_REFUND.slice(3, -1)}1` }, /another refund address/, "another account");
  refused({ fromAmount: 999 }, /another amount of STRK/, "another amount");
  refused({ depositAddress: XMR_DEPOSIT }, /deposit address/, "a deposit address of another chain");
  refused({ depositAddress: RECIPIENT }, /deposit address/, "a deposit address of an EVM chain (D-17)");
  refused({ from: "xmr" }, /another chain/, "another chain");
  refused({ provider: "changenow" }, /another provider/, "another provider");
  refused({ asset: "eth" }, /another coin/, "another coin");
  refused({ id: "bad id!" }, /id of the wrong form/, "an id the app could never open (D-18)");
  refused({ id: `0x${"a".repeat(127)}` }, /id of the wrong form/, "an id too long");
});

test("reads a swap of XMR with the refund address as typed, and a deposit address of Monero alone", () => {
  const xmr: PayRequest = {
    ...request,
    provider: "changenow",
    chain: "XMR",
    rate: "fixed",
    fromAmount: "0.1",
    refundAddress: XMR_REFUND,
    rateId: "rate",
  };
  const fields = {
    ...answer,
    id: "9f4e2c71b03ad1",
    provider: "changenow",
    from: "xmr",
    fromAmount: 0.1,
    amount: 51.229932,
    depositAddress: XMR_DEPOSIT,
    refundAddress: XMR_REFUND,
    validUntil: null,
  };
  const created = createdPayOf(xmr, fields);
  assert.equal(created.depositAddress, XMR_DEPOSIT);
  assert.equal(created.validUntil, null);
  assert.throws(() => createdPayOf(xmr, { ...fields, depositAddress: STRK_DEPOSIT }), /deposit address/);
  assert.throws(() => createdPayOf(xmr, { ...fields, refundAddress: XMR_REFUND.toLowerCase() }), /refund address/);
});

// The way out: the answer of the relay to a swap of USDG into XMR through ChangeNOW, as it came on 13 Oct 2026 through
// the relay on the Mac (the quote; the swap itself was never opened).
const outRequest: OutRequest = {
  provider: "changenow",
  chain: "XMR",
  asset: "USDG",
  fromAmount: "50",
  address: XMR_REFUND,
  refundAddress: RECIPIENT,
  creationKey: "key",
};
const CHAIN_DEPOSIT = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const outAnswer = {
  id: "6c1d9e2f4b7a38",
  provider: "changenow",
  from: "usdg",
  to: "xmr",
  amount: 0.0836667,
  fromAmount: 50,
  depositAddress: CHAIN_DEPOSIT,
  payoutAddress: XMR_REFUND,
  refundAddress: RECIPIENT.toLowerCase(),
  validUntil: null,
  readToken: "token",
};

const refusedOut = (fields: Record<string, unknown>, reason: RegExp, what: string) =>
  assert.throws(
    () => createdOutOf(outRequest, { ...outAnswer, ...fields }),
    (error: unknown) => error instanceof RelayError && error.kind === "failed" && reason.test(error.message),
    what,
  );

test("reads the swap out the relay opened, with the refund to the wallet as the user spells it", () => {
  assert.deepEqual(createdOutOf(outRequest, outAnswer), {
    id: "6c1d9e2f4b7a38",
    provider: "changenow",
    chain: "XMR",
    asset: "USDG",
    amount: 0.0836667,
    fromAmount: 50,
    depositAddress: CHAIN_DEPOSIT,
    payoutAddress: XMR_REFUND,
    refundAddress: RECIPIENT,
    validUntil: null,
    readToken: "token",
  });
  // A Starknet address of the same account in another spelling is the same swap.
  const strk: OutRequest = { ...outRequest, provider: "oneclick", chain: "STRK", address: STRK_REFUND };
  const padded = createdOutOf(strk, {
    ...outAnswer,
    provider: "oneclick",
    to: "strk",
    payoutAddress: `0x${STRK_REFUND.slice(3).toUpperCase()}`,
    id: CHAIN_DEPOSIT.toLowerCase(),
    depositAddress: CHAIN_DEPOSIT.toLowerCase(),
    validUntil: "2026-10-13T13:30:00.000Z",
  });
  assert.equal(padded.payoutAddress, `0x${STRK_REFUND.slice(3).toUpperCase()}`);
  assert.equal(padded.validUntil, "2026-10-13T13:30:00.000Z");
});

test("refuses an answer of the way out that differs from the request in anything the wallet sends by", () => {
  refusedOut({ payoutAddress: XMR_DEPOSIT }, /another address/, "another address of the chain");
  refusedOut({ refundAddress: null }, /another refund address/, "no refund address");
  refusedOut({ refundAddress: STRK_DEPOSIT.slice(0, 42) }, /another refund address/, "another wallet");
  refusedOut({ fromAmount: 49 }, /another amount of USDG/, "another amount");
  refusedOut({ depositAddress: XMR_DEPOSIT }, /deposit address/, "a deposit address that is not on Robinhood Chain");
  refusedOut({ depositAddress: STRK_DEPOSIT }, /deposit address/, "a deposit address of Starknet");
  refusedOut({ to: "zec" }, /another chain/, "another chain");
  refusedOut({ from: "eth" }, /another coin/, "another coin");
  refusedOut({ provider: "simpleswap" }, /another provider/, "another provider");
  refusedOut({ id: "bad id!" }, /id of the wrong form/, "an id the app could never open");
});
