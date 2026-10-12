import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConfig } from "../src/config.ts";

// The public key of the relay of 8 Oct 2026, as .env.production holds it.
const KEY = "BB4chM66jqZnchD0UpwidNxMraJruYq9wtklECLjmxfO16kSU1zwaytcXxw/Pe7ZgELErnFzgLtqHLenYTnzZPk=";

test("talks to the relay with its address and its keys", () => {
  const config = parseConfig({
    VITE_RELAY_URL: "https://relay.kranox.cash",
    VITE_RELAY_SIGNING_KEYS: `${KEY}, ${KEY}`,
  });
  assert.deepEqual(config, { relayUrl: "https://relay.kranox.cash/", relaySigningKeys: [KEY, KEY] });
  const local = parseConfig({ VITE_RELAY_URL: "http://127.0.0.1:8787", VITE_RELAY_SIGNING_KEYS: KEY });
  assert.equal(local.relayUrl, "http://127.0.0.1:8787/");
});

test("stops with the name of a missing or wrong variable", () => {
  assert.throws(() => parseConfig({}), /VITE_RELAY_URL is missing/);
  assert.throws(
    () => parseConfig({ VITE_RELAY_URL: "https://relay.kranox.cash" }),
    /VITE_RELAY_SIGNING_KEYS is missing/,
  );
  assert.throws(() => parseConfig({ VITE_RELAY_URL: "relay", VITE_RELAY_SIGNING_KEYS: KEY }), /address of the relay/);
  assert.throws(
    () => parseConfig({ VITE_RELAY_URL: "http://relay.kranox.cash", VITE_RELAY_SIGNING_KEYS: KEY }),
    /HTTPS/,
  );
  assert.throws(
    () => parseConfig({ VITE_RELAY_URL: "https://user@relay.kranox.cash", VITE_RELAY_SIGNING_KEYS: KEY }),
    /HTTPS/,
  );
  assert.throws(
    () => parseConfig({ VITE_RELAY_URL: "https://relay.kranox.cash", VITE_RELAY_SIGNING_KEYS: "not a key" }),
    /uncompressed points/,
  );
  assert.throws(
    () =>
      parseConfig({
        VITE_RELAY_URL: "https://relay.kranox.cash",
        VITE_RELAY_SIGNING_KEYS: Buffer.alloc(65).toString("base64"),
      }),
    /uncompressed points/,
  );
});
