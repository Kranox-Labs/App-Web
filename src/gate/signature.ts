// The check of the signature that the relay puts on each answer (apps/relay/src/signing.mts): ECDSA on P-256 with
// SHA-256 over the request with its nonce and the answer, as 64 bytes of r and s in base64. The app holds the public
// keys of the relay, so an interception of the connection cannot answer for the relay, and a signed answer answers only
// the request that the app sent: its nonce, its method, its path with the query, its body, and the status.

/** What a signature of the relay binds: the request with its nonce, and the answer. */
export interface SignedAnswer {
  nonce: string;
  method: string;
  /** The path of the request with its query, as the app sent it. */
  target: string;
  /** The bytes of the body of the request; none for a request without a body. */
  requestBody: Uint8Array<ArrayBuffer>;
  status: number;
  body: string;
}

/** The first line of the text that a signature covers. A nonce holds no slash, so no other text reads as one. */
const ANSWER_V2 = "kranox/answer/2";

const POINT_BYTES = 65;
const UNCOMPRESSED_POINT = 4;
const SIGNATURE_BYTES = 64;

const CURVE = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGNING = { name: "ECDSA", hash: "SHA-256" } as const;

/** The bytes of [text] in base64. Throws for text that is not base64. */
export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

/** The SHA-256 of [bytes], in hex. */
export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A random token of [bytes] bytes, in hex: a nonce of a request, or the key of a creation. */
export function randomToken(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/** A public key of the relay as the browser checks with it. Takes the uncompressed point of P-256 in base64. */
export async function importSigningKey(base64Point: string): Promise<CryptoKey> {
  const bytes = fromBase64(base64Point);
  if (bytes.length !== POINT_BYTES || bytes[0] !== UNCOMPRESSED_POINT) {
    throw new Error("A signing key of the relay must be an uncompressed point of P-256 in base64.");
  }
  // The import fails for a point that does not lie on the curve.
  return crypto.subtle.importKey("raw", bytes, CURVE, false, ["verify"]);
}

/**
 * The text that the signature covers: one field on each line, with the SHA-256 of the body of the request in hex, and
 * the body of the answer last.
 */
export async function answerMessage(answer: SignedAnswer): Promise<string> {
  const { nonce, method, target, requestBody, status, body } = answer;
  return [ANSWER_V2, nonce, method, target, await sha256Hex(requestBody), String(status), body].join("\n");
}

/** Whether [signature] signs [answer] under one of the [keys] of the relay. */
export async function verifiesAnswer(
  keys: readonly CryptoKey[],
  answer: SignedAnswer,
  signature: string | null,
): Promise<boolean> {
  if (signature === null) return false;
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = fromBase64(signature);
  } catch {
    return false;
  }
  if (bytes.length !== SIGNATURE_BYTES) return false;
  const message = new TextEncoder().encode(await answerMessage(answer));
  for (const key of keys) {
    if (await crypto.subtle.verify(SIGNING, key, bytes, message)) return true;
  }
  return false;
}
