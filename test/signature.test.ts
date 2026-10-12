import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { answerMessage, importSigningKey, verifiesAnswer, type SignedAnswer } from "../src/gate/signature.ts";

// A key of a relay of the test, and its public key as the app holds one: the uncompressed point in base64.
const pair = generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = pair.publicKey.export({ format: "jwk" });
const point = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(jwk.x ?? "", "base64url"),
  Buffer.from(jwk.y ?? "", "base64url"),
]).toString("base64");

/** The signature of the relay over [text]: 64 bytes of r and s, in base64. */
function signedByRelay(text: string): string {
  return sign("sha256", Buffer.from(text, "utf8"), { key: pair.privateKey, dsaEncoding: "ieee-p1363" }).toString(
    "base64",
  );
}

const answer: SignedAnswer = {
  nonce: "0123456789abcdef0123456789abcdef",
  method: "GET",
  target: "/v1/pay/range?asset=eth&rate=fixed",
  requestBody: new Uint8Array(),
  status: 200,
  body: '{"asset":"eth","rate":"fixed","minXmr":0.02,"maxXmr":1.4}',
};

test("the message of a signature has one field on each line and the body last", async () => {
  const message = await answerMessage(answer);
  const lines = message.split("\n");
  assert.equal(lines[0], "kranox/answer/2");
  assert.equal(lines[1], answer.nonce);
  assert.equal(lines[2], "GET");
  assert.equal(lines[3], answer.target);
  // The SHA-256 of no bytes.
  assert.equal(lines[4], "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(lines[5], "200");
  assert.equal(lines.slice(6).join("\n"), answer.body);
});

test("accepts the signature of the relay over the request and the answer, and nothing else", async () => {
  const key = await importSigningKey(point);
  const signature = signedByRelay(await answerMessage(answer));
  assert.equal(await verifiesAnswer([key], answer, signature), true);
  assert.equal(await verifiesAnswer([key], { ...answer, status: 201 }, signature), false, "another status");
  assert.equal(await verifiesAnswer([key], { ...answer, body: "{}" }, signature), false, "another body");
  assert.equal(await verifiesAnswer([key], { ...answer, nonce: "fedcba9876543210fedcba9876543210" }, signature), false);
  assert.equal(await verifiesAnswer([key], { ...answer, target: "/v1/pay/range?asset=usdg" }, signature), false);
  assert.equal(await verifiesAnswer([key], answer, null), false, "no signature");
  assert.equal(await verifiesAnswer([key], answer, "not base64!"), false, "no base64");
  assert.equal(await verifiesAnswer([key], answer, Buffer.alloc(63).toString("base64")), false, "too short");
  const otherPair = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const otherSignature = sign("sha256", Buffer.from(await answerMessage(answer), "utf8"), {
    key: otherPair.privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64");
  assert.equal(await verifiesAnswer([key], answer, otherSignature), false, "another key");
});

test("binds the body of the request into the signature", async () => {
  const key = await importSigningKey(point);
  const posted: SignedAnswer = {
    ...answer,
    method: "POST",
    target: "/v1/pay/swaps",
    requestBody: new TextEncoder().encode('{"asset":"eth"}'),
    status: 201,
  };
  const signature = signedByRelay(await answerMessage(posted));
  assert.equal(await verifiesAnswer([key], posted, signature), true);
  const otherBody = { ...posted, requestBody: new TextEncoder().encode('{"asset":"usdg"}') };
  assert.equal(await verifiesAnswer([key], otherBody, signature), false);
});

test("refuses a key that is no uncompressed point of P-256", async () => {
  await assert.rejects(importSigningKey(Buffer.alloc(65).toString("base64")), /uncompressed point/);
  await assert.rejects(
    importSigningKey(Buffer.from([4, ...Array(32).fill(1)]).toString("base64")),
    /uncompressed point/,
  );
  // The right length and the right first byte, and still no point of the curve.
  await assert.rejects(importSigningKey(Buffer.from([4, ...Array(64).fill(7)]).toString("base64")));
});
