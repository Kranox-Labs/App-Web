// The readers of an answer of the relay: each takes the field it names, in the form it names, or throws. An answer
// of another form is a fault of the relay, so the app never shows a number or an address that it did not read.
import { RelayError } from "./errors.ts";

export type Fields = Readonly<Record<string, unknown>>;

function wrongForm(what: string): RelayError {
  return new RelayError("failed", `The relay answered ${what} of the wrong form.`);
}

/** [value] as an object of fields. */
export function readObject(value: unknown, what: string): Fields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw wrongForm(what);
  return value as Fields;
}

export function readString(fields: Fields, name: string): string {
  const value = fields[name];
  if (typeof value !== "string") throw wrongForm(name);
  return value;
}

export function readNullableString(fields: Fields, name: string): string | null {
  const value = fields[name];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw wrongForm(name);
  return value;
}

export function readNumber(fields: Fields, name: string): number {
  const value = fields[name];
  if (typeof value !== "number" || !Number.isFinite(value)) throw wrongForm(name);
  return value;
}

export function readNullableNumber(fields: Fields, name: string): number | null {
  const value = fields[name];
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw wrongForm(name);
  return value;
}

/** A field that holds text or a number, as the words of the exchanger about the speed of a swap, as text. */
export function readNullableText(fields: Fields, name: string): string | null {
  const value = fields[name];
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw wrongForm(name);
}

export function readArray(fields: Fields, name: string): readonly unknown[] {
  const value = fields[name];
  if (!Array.isArray(value)) throw wrongForm(name);
  return value;
}

/** [value] when it is one of [choices], such as the state of a swap. */
export function readChoice<T extends string>(fields: Fields, name: string, choices: readonly T[]): T {
  const value = readString(fields, name);
  const choice = choices.find((each) => each === value);
  if (choice === undefined) throw wrongForm(name);
  return choice;
}
