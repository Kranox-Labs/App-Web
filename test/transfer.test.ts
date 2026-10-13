import assert from "node:assert/strict";
import { test } from "node:test";
import { ROBINHOOD_CHAIN, USDG } from "../src/chain.ts";
import { sendTransfer, toBaseUnits, toHexQuantity, transferCallData, transferOf } from "../src/wallet/transfer.ts";

const FROM = "0x7a3fC0e1b9D24A6c58E0f3B1d9a7C4e2F6b8D015";
const DEPOSIT = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const HASH = "0x4f1e9a7c3b2d8e6f0a5c1b9d7e3f2a8c6b4d0e9f1a7c5b3d2e8f6a4c0b9d1e7f";

test("writes an amount in the smallest unit of its coin, exactly, from its text", () => {
  assert.equal(toBaseUnits("12.5", 6), 12_500_000n);
  assert.equal(toBaseUnits("0.000001", 6), 1n);
  assert.equal(toBaseUnits("1", 18), 1_000_000_000_000_000_000n);
  assert.equal(toBaseUnits("0.123456", 18), 123_456_000_000_000_000n);
  assert.equal(toBaseUnits("0", 6), 0n);
  assert.throws(() => toBaseUnits("0.0000001", 6), RangeError, "more decimals than the coin holds");
  assert.throws(() => toBaseUnits("1.2.3", 6), RangeError);
  assert.throws(() => toBaseUnits("abc", 6), RangeError);
  assert.throws(() => toBaseUnits("-1", 6), RangeError);
  assert.equal(toHexQuantity(12_500_000n), "0xbebc20");
  assert.equal(toHexQuantity(0n), "0x0");
});

test("writes the call of transfer of an ERC-20 contract as its ABI", () => {
  const data = transferCallData(DEPOSIT, 12_500_000n);
  assert.equal(data.length, 2 + 8 + 64 + 64);
  assert.equal(data.slice(0, 10), "0xa9059cbb");
  assert.equal(data.slice(10, 74), `000000000000000000000000${DEPOSIT.slice(2).toLowerCase()}`);
  assert.equal(data.slice(74), "0000000000000000000000000000000000000000000000000000000000bebc20");
  assert.throws(() => transferCallData("4deposit", 1n), RangeError);
});

test("makes a plain transfer of ETH, and a call of the contract of USDG without value, on Robinhood Chain alone", () => {
  assert.deepEqual(transferOf({ asset: "ETH", amount: "0.01", from: FROM, to: DEPOSIT }), {
    from: FROM,
    to: DEPOSIT,
    chainId: "0x1237",
    value: "0x2386f26fc10000",
  });
  const usdg = transferOf({ asset: "USDG", amount: "12.5", from: FROM, to: DEPOSIT });
  assert.equal(usdg.to, USDG.contract);
  assert.equal(usdg.chainId, ROBINHOOD_CHAIN.hex, "a wallet on another network refuses the transfer (D-32)");
  assert.equal(usdg.value, undefined, "a call of the contract carries no ETH");
  assert.equal(usdg.data, transferCallData(DEPOSIT, 12_500_000n));
  assert.throws(() => transferOf({ asset: "USDG", amount: "0", from: FROM, to: DEPOSIT }), RangeError, "nothing");
  assert.throws(() => transferOf({ asset: "USDG", amount: "0.0000001", from: FROM, to: DEPOSIT }), RangeError);
  assert.throws(
    () => transferOf({ asset: "ETH", amount: "1", from: FROM, to: "t1URu8q83ibd8sgDoW3VnJoPjUusRz97h8J" }),
    RangeError,
  );
  assert.throws(() => transferOf({ asset: "ETH", amount: "1", from: "4wallet", to: DEPOSIT }), RangeError);
});

test("asks the wallet to send the transfer, takes the hash it answers, and says when it names none", async () => {
  const sent: unknown[] = [];
  const wallet = {
    async request(args: { method: string; params?: unknown[] | Record<string, unknown> }) {
      sent.push(args);
      return HASH;
    },
  };
  const transfer = transferOf({ asset: "ETH", amount: "0.01", from: FROM, to: DEPOSIT });
  assert.equal(await sendTransfer(wallet, transfer), HASH);
  assert.deepEqual(sent, [{ method: "eth_sendTransaction", params: [transfer] }]);
  // A wallet of a smart account may answer another thing than a hash, having sent the transfer all the same: the
  // page then knows that it sent, and not its hash (D-33).
  const mute = {
    async request() {
      return { hash: HASH };
    },
  };
  assert.equal(await sendTransfer(mute, transfer), null);
  const short = {
    async request() {
      return "0x1234";
    },
  };
  assert.equal(await sendTransfer(short, transfer), null);
  const refusing = {
    async request() {
      throw Object.assign(new Error("User rejected the request."), { code: 4001 });
    },
  };
  await assert.rejects(sendTransfer(refusing, transfer), /rejected/);
});
