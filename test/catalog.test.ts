import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAINS, PROVIDERS, providersOf, ratesOf } from "../src/gate/catalog.ts";
import { CHAIN_FACTS } from "../src/gate/chains.ts";
import { COPY } from "../src/copy.ts";
import { formatFrom } from "../src/format.ts";

// A known address of each open chain, as a wallet shows it.
const KNOWN_ADDRESSES = {
  XMR: "883z7Wmbd5nhoH6xQxLzgniNhN6jqdvxFiza4rMdErWA1XW1TCL1tqrCwWFwhG1QkuL17RRHP45J33y6u4sH8Rfa7kryRza",
  STRK: "0x04a3f9c1b2e7d8a5c6f0e1d2c3b4a5968778695a4b3c2d1e0f1a2b3c4d5e6f70",
  ZEC: "t1URu8q83ibd8sgDoW3VnJoPjUusRz97h8J",
} as const;

test("Monero, Zcash, and Starknet are open, with their providers in order", () => {
  assert.deepEqual(
    CHAINS.filter((chain) => chain.open).map((chain) => chain.code),
    ["XMR", "ZEC", "STRK"],
  );
  assert.deepEqual(providersOf("XMR"), ["changenow", "simpleswap"]);
  assert.deepEqual(providersOf("STRK"), ["oneclick", "changenow"]);
  assert.deepEqual(providersOf("ZEC"), ["oneclick", "changenow", "simpleswap"]);
});

test("each provider serves its rates, and each chain starts at a rate its providers serve", () => {
  assert.deepEqual(ratesOf("changenow"), ["fixed", "floating"]);
  assert.deepEqual(ratesOf("simpleswap"), ["fixed", "floating"]);
  assert.deepEqual(ratesOf("oneclick"), ["floating"]);
  for (const chain of CHAINS.filter((each) => each.open).map((each) => each.code)) {
    const rate = CHAIN_FACTS[chain].defaultRate;
    const [first] = providersOf(chain);
    assert.ok(first !== undefined, `${chain} has a provider`);
    // The first provider is the one the provider step picks on arrival: it must serve the rate the chain starts at,
    // or the step would switch the rate at once (D-31).
    assert.ok(ratesOf(first).includes(rate), `${chain} starts at the ${rate} rate, which ${first} serves`);
  }
});

test("every open chain has its words for a refund and takes a known address of its own (D-23)", () => {
  for (const chain of CHAINS.filter((each) => each.open).map((each) => each.code)) {
    assert.notEqual(COPY.receive.refundHint[chain], "", `${chain} has a hint`);
    assert.notEqual(COPY.receive.refundInvalid[chain], "", `${chain} has a refusal`);
    assert.notEqual(COPY.receive.refundTip[chain], "", `${chain} has a tip`);
    assert.ok(chain in KNOWN_ADDRESSES, `${chain} has a known address in this test`);
    const known = KNOWN_ADDRESSES[chain as keyof typeof KNOWN_ADDRESSES];
    assert.equal(CHAIN_FACTS[chain].isRefundAddress(known), true, `${chain} takes its own address`);
    assert.equal(CHAIN_FACTS[chain].isDepositAddress(known), true);
  }
});

test("the providers of a chain and the chains of a provider agree both ways (D-24)", () => {
  for (const chain of CHAINS.map((each) => each.code)) {
    for (const id of providersOf(chain)) {
      const entry = PROVIDERS.find((each) => each.id === id);
      assert.ok(entry?.chains.includes(chain), `${id} lists ${chain}`);
    }
  }
  for (const entry of PROVIDERS.filter((each) => each.open)) {
    for (const chain of entry.chains) {
      assert.ok(providersOf(chain).includes(entry.id), `${chain} lists ${entry.id} in its order`);
    }
  }
});

test("the facts of a chain: its coin, its name at the relay, its addresses, and its link of payment", () => {
  const xmr = CHAIN_FACTS.XMR;
  assert.equal(xmr.relayName, "xmr");
  assert.equal(xmr.decimals, 8);
  assert.equal(xmr.paymentLink("4address", "0.5"), "monero:4address?tx_amount=0.5");
  assert.equal(xmr.sameAddress("4a", "4a"), true);
  assert.equal(xmr.sameAddress("4a", "4A"), false, "a Monero address reads in one case");
  const strk = CHAIN_FACTS.STRK;
  assert.equal(strk.relayName, "strk");
  assert.equal(strk.decimals, 6);
  assert.equal(strk.defaultRate, "floating");
  assert.equal(strk.paymentLink("0x1", "1000"), null, "a wallet of Starknet opens no link of payment");
  assert.equal(strk.isRefundAddress("0x04a3f9c1b2e7d8a5c6f0e1d2c3b4a5968778695a4b3c2d1e0f1a2b3c4d5e6f70"), true);
  assert.equal(
    strk.isRefundAddress(
      "883z7Wmbd5nhoH6xQxLzgniNhN6jqdvxFiza4rMdErWA1XW1TCL1tqrCwWFwhG1QkuL17RRHP45J33y6u4sH8Rfa7kryRza",
    ),
    false,
  );
  assert.equal(
    strk.sameAddress(KNOWN_ADDRESSES.STRK, `0x${KNOWN_ADDRESSES.STRK.slice(3).toUpperCase()}`),
    true,
    "the same account without its zero and in another case",
  );
  assert.equal(strk.isRefundAddress("0x7A3Fc0E1b9D24a6C58E0F3B1d9A7C4e2F6B8D015"), false, "an EVM address (D-17)");
  const zec = CHAIN_FACTS.ZEC;
  assert.equal(zec.decimals, 8);
  assert.equal(zec.defaultRate, "floating");
  assert.equal(zec.paymentLink("t1address", "0.1"), "zcash:t1address?amount=0.1", "a link after ZIP 321");
  assert.equal(
    zec.paymentLink(KNOWN_ADDRESSES.ZEC, formatFrom(0.00000001, "ZEC")),
    `zcash:${KNOWN_ADDRESSES.ZEC}?amount=0.00000001`,
    "the least amount writes without an exponent",
  );
  assert.equal(formatFrom(1.23456789, "ZEC"), "1.23456789", "eight decimals for ZEC");
  assert.equal(formatFrom(0.1, "ZEC"), "0.1");
  assert.notEqual(COPY.chains.ZEC.note, null, "Zcash says what its transparent side shows");
  assert.equal(
    zec.isRefundAddress("zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8f3g2d4kv4v9q0jfgcm3vhk3wm6ajqmp8"),
    false,
  );
});
