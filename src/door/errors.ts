import { COPY } from "../copy.ts";

/**
 * Why a call to the relay gave no answer to use: the relay or the network is down; the relay refused the request and
 * its text tells the user what to change; or the relay answered in a way the app cannot use, such as without a valid
 * signature.
 */
export type RelayFailure = "down" | "refused" | "failed";

export class RelayError extends Error {
  readonly kind: RelayFailure;

  constructor(kind: RelayFailure, message: string) {
    super(message);
    this.name = "RelayError";
    this.kind = kind;
  }
}

/** What a page says about [error]: the text of a refusal, and a fixed line for the rest. */
export function describeError(error: unknown): string {
  if (error instanceof RelayError) {
    if (error.kind === "refused") return error.message;
    if (error.kind === "down") return COPY.relay.down;
  }
  return COPY.relay.failed;
}
