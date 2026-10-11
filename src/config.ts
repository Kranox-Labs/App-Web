// The settings of the app. This module is the only one that reads the environment of the build, and it checks every
// variable before the app starts: a missing or wrong one stops the app with a clear message. .env.example lists them.

/** The names of the variables, as the build of Vite exposes them. */
export const ENV_SAMPLE_DATA = "VITE_SAMPLE_DATA";
export const ENV_RELAY_URL = "VITE_RELAY_URL";
export const ENV_RELAY_SIGNING_KEYS = "VITE_RELAY_SIGNING_KEYS";

/** A public key of the relay: the uncompressed point of P-256, 65 bytes that start with 4, in base64. */
const SIGNING_KEY_BYTES = 65;
const UNCOMPRESSED_POINT = 4;

/** The hosts that may talk to a relay over plain HTTP: a relay on the machine of a developer. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The settings: the app runs on sample data, with no relay and no network at all, or it talks to the relay at
 * [relayUrl] and trusts an answer only under one of [relaySigningKeys].
 */
export type AppConfig =
  { sampleData: true } | { sampleData: false; relayUrl: string; relaySigningKeys: readonly string[] };

type Env = Readonly<Record<string, string | undefined>>;

function missing(name: string): Error {
  return new Error(`The variable ${name} is missing. .env.example lists the variables of the app.`);
}

/** A variable that is "true" or "false", or absent for false. */
function readFlag(env: Env, name: string): boolean {
  const value = env[name]?.trim() ?? "";
  if (value === "" || value === "false") return false;
  if (value === "true") return true;
  throw new Error(`The variable ${name} must be "true" or "false".`);
}

/** The address of the relay: HTTPS, or plain HTTP on the machine of a developer, without a user or a query. */
function readRelayUrl(env: Env): string {
  const value = env[ENV_RELAY_URL]?.trim();
  if (!value) throw missing(ENV_RELAY_URL);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `The variable ${ENV_RELAY_URL} must hold the address of the relay, such as https://relay.kranox.cash.`,
    );
  }
  const plainAllowed = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if ((url.protocol !== "https:" && !plainAllowed) || url.username !== "" || url.search !== "" || url.hash !== "") {
    throw new Error(`The variable ${ENV_RELAY_URL} must be an HTTPS address of the relay without a user or a query.`);
  }
  return url.toString();
}

/** The public keys of the relay, separated by commas, each the uncompressed point of P-256 in base64. */
function readSigningKeys(env: Env): string[] {
  const value = env[ENV_RELAY_SIGNING_KEYS]?.trim();
  if (!value) throw missing(ENV_RELAY_SIGNING_KEYS);
  return value.split(",").map((item) => {
    const key = item.trim();
    if (!isSigningKey(key)) {
      throw new Error(
        `The variable ${ENV_RELAY_SIGNING_KEYS} must list public keys of the relay: uncompressed points of P-256 in base64.`,
      );
    }
    return key;
  });
}

function isSigningKey(key: string): boolean {
  let bytes: string;
  try {
    bytes = atob(key);
  } catch {
    return false;
  }
  return bytes.length === SIGNING_KEY_BYTES && bytes.charCodeAt(0) === UNCOMPRESSED_POINT;
}

/** The settings from the variables of [env], checked. */
export function parseConfig(env: Env): AppConfig {
  if (readFlag(env, ENV_SAMPLE_DATA)) return { sampleData: true };
  return { sampleData: false, relayUrl: readRelayUrl(env), relaySigningKeys: readSigningKeys(env) };
}

/** The settings of this build. */
export function loadConfig(): AppConfig {
  return parseConfig(import.meta.env as Env);
}
