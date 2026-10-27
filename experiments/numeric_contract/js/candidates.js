// WO-003A browser-targeted experiment. No Node imports or runtime globals.
import { KINDS } from "../../../js/core/events.js";
import { admit } from "../../../js/core/predicates.js";

export class Hold extends Error {}
class Numeric { constructor(text) { this.text = text; } }
const numberPattern = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
const integerPattern = /^-?(?:0|[1-9][0-9]*)(?![\s\S])/;
const own = (obj, key) => Object.hasOwn(obj, key);
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Numeric);
const encoder = new TextEncoder();

function scalarString(value) {
  if (!value.isWellFormed()) throw new Hold("lone surrogate");
  return value;
}

export function parse(raw) {
  if (typeof raw !== "string") throw new Hold("raw input must be text");
  let index = 0;
  let payloadText = null;
  function space() { while (index < raw.length && /[ \t\r\n]/.test(raw[index])) index += 1; }
  function string() {
    if (raw[index] !== '"') throw new Hold("invalid JSON");
    const start = index++;
    while (index < raw.length) {
      const ch = raw[index++];
      if (ch === "\\") index += 1;
      else if (ch === '"') return scalarString(JSON.parse(raw.slice(start, index)));
    }
    throw new Hold("invalid JSON");
  }
  function value(depth = 0) {
    if (depth > 64) throw new Hold("nesting outside subset");
    space();
    const ch = raw[index];
    if (ch === '"') return string();
    if (ch === "{" || ch === "[") {
      index += 1;
      const obj = ch === "{" ? Object.create(null) : [];
      const close = ch === "{" ? "}" : "]";
      space();
      if (raw[index] === close) { index += 1; return obj; }
      while (true) {
        space();
        if (ch === "{") {
          const key = string();
          if (own(obj, key)) throw new Hold("duplicate key");
          space();
          if (raw[index++] !== ":") throw new Hold("invalid JSON");
          space();
          const start = index;
          obj[key] = value(depth + 1);
          if (depth === 0 && key === "payload") payloadText = raw.slice(start, index);
        } else obj.push(value(depth + 1));
        space();
        if (raw[index] === close) { index += 1; return obj; }
        if (raw[index++] !== ",") throw new Hold("invalid JSON");
      }
    }
    for (const [token, literal] of [["true", true], ["false", false], ["null", null]]) {
      if (raw.startsWith(token, index)) { index += token.length; return literal; }
    }
    numberPattern.lastIndex = index;
    const match = numberPattern.exec(raw);
    if (!match) throw new Hold("invalid JSON");
    index = numberPattern.lastIndex;
    return new Numeric(match[0]);
  }
  try {
    const event = value();
    space();
    if (index !== raw.length) throw new Hold("invalid JSON");
    return { event, payloadText };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) throw new Hold("invalid or excessively nested JSON");
    throw error;
  }
}

function control(event) {
  const fields = ["event_id", "sequence", "kind", "payload"];
  if (!object(event) || Object.keys(event).length !== 4 || fields.some((key) => !own(event, key))) throw new Hold("event fields");
  if (typeof event.event_id !== "string" || !event.event_id) throw new Hold("event_id");
  if (typeof event.kind !== "string" || !KINDS.includes(event.kind)) throw new Hold("kind");
  const seq = event.sequence;
  if (!(seq instanceof Numeric) || !/^[1-9][0-9]*$/.test(seq.text)) throw new Hold("sequence requires positive integer token");
  if (seq.text.length > 16 || BigInt(seq.text) > 9007199254740991n) throw new Hold("sequence outside safe integer range");
  if (!object(event.payload)) throw new Hold("payload must be object");
  return { ...event, sequence: Number(seq.text) };
}

function explicitTag(obj) {
  if (!own(obj, "$numeric")) return false;
  const tag = obj.$numeric;
  if (Object.keys(obj).length !== 1 || !object(tag)
      || Object.keys(tag).length !== 2 || !own(tag, "kind") || !own(tag, "text")
      || typeof tag.text !== "string" || !["integer", "decimal"].includes(tag.kind)
      || !/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?(?![\s\S])/.test(tag.text)
      || (tag.kind === "integer" && !integerPattern.test(tag.text))) throw new Hold("reserved numeric tag shape");
  return true;
}

function jNumber(text) {
  if (text.length > 1024) throw new Hold("J numeric token limit");
  const number = Number(text);
  // Bounds are deliberate, not evidence of full RFC 8785 implementation.
  const [coefficient, exponentText = "0"] = text.toLowerCase().split("e");
  const exponent = BigInt(exponentText);
  if (exponent < -400n || exponent > 400n) throw new Hold("J exponent outside subset");
  const fraction = coefficient.split(".")[1] || "";
  const digits = coefficient.replace(".", "");
  let numerator = BigInt(digits);
  let denominator = 1n;
  const shift = Number(exponent) - fraction.length;
  if (shift >= 0) numerator *= 10n ** BigInt(shift);
  else denominator = 10n ** BigInt(-shift);
  if (numerator % denominator === 0n) {
    const integer = numerator / denominator;
    if (integer < -9007199254740991n || integer > 9007199254740991n) throw new Hold("J unsafe integer: use explicit tag");
    return Number(integer);
  }
  const abs = Math.abs(number);
  if (!Number.isFinite(number) || abs === 0) throw new Hold("J exponent outside subset");
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, number);
  const bits = view.getBigUint64(0);
  const exponentBits = Number((bits >> 52n) & 2047n);
  let binaryNumerator = (bits & ((1n << 52n) - 1n)) + (exponentBits === 0 ? 0n : 1n << 52n);
  if (number < 0) binaryNumerator = -binaryNumerator;
  const power = (exponentBits === 0 ? -1022 : exponentBits - 1023) - 52;
  let binaryDenominator = 1n;
  if (power >= 0) binaryNumerator <<= BigInt(power);
  else binaryDenominator <<= BigInt(-power);
  if (numerator * binaryDenominator !== binaryNumerator * denominator) throw new Hold("J inexact binary64: use explicit tag");
  if (!(abs >= 0.000001 && abs < 1e15)) throw new Hold("J magnitude outside subset");
  // Count exact source digits, not the potentially shorter binary64 rendering.
  const significant = coefficient.replace(/^-/, "").replace(".", "").replace(/^0+/, "").replace(/0+$/, "");
  if (significant.length > 15) throw new Hold("J significant digits outside subset");
  return new Numeric(JSON.stringify(number));
}

function transform(value, candidate) {
  if (value instanceof Numeric) {
    const text = value.text;
    if (candidate === "J") return jNumber(text);
    if (integerPattern.test(text) && text !== "-0" && text.replace(/^-/, "").length <= 16
        && BigInt(text) >= -9007199254740991n && BigInt(text) <= 9007199254740991n) return Number(text);
    return { $numeric: { kind: integerPattern.test(text) ? "integer" : "decimal", text } };
  }
  if (object(value)) {
    if (explicitTag(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, transform(child, candidate)]));
  }
  if (Array.isArray(value)) return value.map((child) => transform(child, candidate));
  return value;
}

function canonical(value, asciiOnly = true) {
  if (value instanceof Numeric) return value.text;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${canonical(key, asciiOnly)}:${canonical(value[key], asciiOnly)}`).join(",")}}`;
  if (Array.isArray(value)) return `[${value.map((child) => canonical(child, asciiOnly)).join(",")}]`;
  const text = JSON.stringify(value);
  return asciiOnly ? text.replace(/[\u007f-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`) : text;
}

export const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const sha256 = async (bytes) => hex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)));

export async function material(candidate, raw) {
  if (!["N", "J", "D"].includes(candidate)) throw new Hold("unknown candidate");
  const { event: parsed, payloadText } = parse(raw);
  const event = control(parsed);
  let payloadDigest = null;
  let wire;
  if (candidate === "D") {
    payloadDigest = await sha256(encoder.encode(payloadText));
    wire = { event_id: event.event_id, sequence: event.sequence, kind: event.kind, format: "D-v1", payload_sha256: payloadDigest };
  } else wire = { ...event, payload: transform(event.payload, candidate) };
  return { encoded: encoder.encode(canonical(wire, candidate !== "J")), event, payloadDigest };
}

export async function observe(candidate, raw) {
  try {
    const { encoded, payloadDigest } = await material(candidate, raw);
    return { result: "ok", canonical_hex: hex(encoded), canonical_text: new TextDecoder().decode(encoded),
      event_sha256: await sha256(encoded), payload_sha256: payloadDigest };
  } catch (error) {
    if (error instanceof Hold) return { result: "HOLD", reason: error.message };
    throw error;
  }
}

export async function replay(candidate, rawEvents) {
  let state = { status: "NEW", last_sequence: 0, event_ids: [], history_hash: await sha256(new Uint8Array()) };
  for (const raw of rawEvents) {
    const { encoded, event } = await material(candidate, raw);
    const status = admit({ status: state.status, lastSequence: state.last_sequence, eventIds: state.event_ids }, event);
    const previous = Uint8Array.from(state.history_hash.match(/../g), (byte) => Number.parseInt(byte, 16));
    const bytes = new Uint8Array(previous.length + encoded.length);
    bytes.set(previous); bytes.set(encoded, previous.length);
    state = { status, last_sequence: event.sequence, event_ids: [...state.event_ids, event.event_id], history_hash: await sha256(bytes) };
  }
  return state;
}
