import assert from "node:assert/strict";
import { test } from "node:test";
import { balanceOfCallData, fromUnits, WalletBalanceReader } from "../src/wallet/balances.ts";

const ADDRESS = "0x7a3fC0e1b9D24A6c58E0f3B1d9a7C4e2F6b8D015";

test("asks balanceOf with the selector and the address as one word", () => {
  assert.equal(
    balanceOfCallData(ADDRESS),
    "0x70a082310000000000000000000000007a3fc0e1b9d24a6c58e0f3b1d9a7c4e2f6b8d015",
  );
});

test("turns the smallest units into an amount of the coin", () => {
  assert.equal(fromUnits("0x0", 18), 0);
  assert.equal(fromUnits("0x", 6), 0);
  // 1.5 ETH in wei.
  assert.equal(fromUnits("0x14d1120d7b160000", 18), 1.5);
  // 1,250.75 USDG in its units of six decimals.
  assert.equal(fromUnits("0x4a8cee30", 6), 1250.75);
  // More ETH than a double counts exactly in wei still reads as whole ETH plus the fraction.
  assert.equal(fromUnits("0x" + (12345678n * 10n ** 18n + 25n * 10n ** 16n).toString(16), 18), 12345678.25);
});

test("reads both balances through the wallet", async () => {
  const calls: unknown[] = [];
  const reader = new WalletBalanceReader({
    async request(args) {
      calls.push(args);
      return args.method === "eth_getBalance" ? "0x14d1120d7b160000" : "0x4a8cee30";
    },
  });
  assert.deepEqual(await reader.readBalances(ADDRESS), { eth: 1.5, usdg: 1250.75 });
  assert.deepEqual(calls, [
    { method: "eth_getBalance", params: [ADDRESS, "latest"] },
    {
      method: "eth_call",
      params: [{ to: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", data: balanceOfCallData(ADDRESS) }, "latest"],
    },
  ]);
  const broken = new WalletBalanceReader({
    async request() {
      return 12;
    },
  });
  await assert.rejects(broken.readBalances(ADDRESS), /wrong form/);
});
