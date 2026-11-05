import { createHash } from "node:crypto";

export class CanonicalizationError extends Error {
  constructor(message, reason = "CANONICALIZATION_INVALID") {
    super(message);
    this.name = "CanonicalizationError";
    this.reason = reason;
  }
}

function reject(message, reason) { throw new CanonicalizationError(message, reason); }

function hasLoneSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(i + 1);
      if (!(d >= 0xdc00 && d <= 0xdfff)) return true;
      i += 1;
    } else if (c >= 0xdc00 && c <= 0xdfff) return true;
  }
  return false;
}

function validateString(text) {
  if (typeof text !== "string") reject("expected string", "INVALID_JSON");
  if (hasLoneSurrogate(text)) reject("lone surrogate is not valid Unicode", "INVALID_UNICODE_LONE_SURROGATE");
  return text;
}

/** Strict JSON parser used at the SOCRATES ingestion boundary. Unlike JSON.parse,
 * it detects duplicate object members before map collapse and rejects lone
 * surrogates. */
export function parseStrictJson(raw) {
  if (typeof raw !== "string") reject("raw JSON must be a string", "INVALID_JSON");
  let i = 0;
  const ws = () => { while (/[\x20\x09\x0a\x0d]/.test(raw[i] ?? "")) i += 1; };
  const peek = () => raw[i];
  const expect = (ch) => { if (raw[i] !== ch) reject(`expected ${ch} at offset ${i}`, "INVALID_JSON"); i += 1; };

  function parseString() {
    expect('"');
    let out = "";
    while (i < raw.length) {
      const ch = raw[i++];
      if (ch === '"') return validateString(out);
      if (ch === "\\") {
        if (i >= raw.length) reject("unterminated escape", "INVALID_JSON");
        const esc = raw[i++];
        if (esc === '"' || esc === "\\" || esc === "/") out += esc;
        else if (esc === "b") out += "\b";
        else if (esc === "f") out += "\f";
        else if (esc === "n") out += "\n";
        else if (esc === "r") out += "\r";
        else if (esc === "t") out += "\t";
        else if (esc === "u") {
          const hex = raw.slice(i, i + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) reject("invalid unicode escape", "INVALID_JSON");
          i += 4;
          const first = Number.parseInt(hex, 16);
          if (first >= 0xd800 && first <= 0xdbff) {
            if (raw.slice(i, i + 2) !== "\\u") reject("lone high surrogate", "INVALID_UNICODE_LONE_SURROGATE");
            i += 2;
            const hex2 = raw.slice(i, i + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex2)) reject("invalid unicode escape", "INVALID_JSON");
            i += 4;
            const second = Number.parseInt(hex2, 16);
            if (!(second >= 0xdc00 && second <= 0xdfff)) reject("lone high surrogate", "INVALID_UNICODE_LONE_SURROGATE");
            out += String.fromCharCode(first, second);
          } else if (first >= 0xdc00 && first <= 0xdfff) {
            reject("lone low surrogate", "INVALID_UNICODE_LONE_SURROGATE");
          } else out += String.fromCharCode(first);
        } else reject("invalid string escape", "INVALID_JSON");
      } else {
        if (ch.charCodeAt(0) < 0x20) reject("unescaped control character", "INVALID_JSON");
        out += ch;
      }
    }
    reject("unterminated string", "INVALID_JSON");
  }

  function parseNumber() {
    const start = i;
    if (raw[i] === "-") i += 1;
    if (raw[i] === "0") i += 1;
    else {
      if (!/[1-9]/.test(raw[i] ?? "")) reject("invalid number", "INVALID_JSON");
      while (/\d/.test(raw[i] ?? "")) i += 1;
    }
    if (raw[i] === "." || raw[i] === "e" || raw[i] === "E") {
      // SOCRATES-C14N-2 requires exact non-integers to use a schema-defined
      // string/tuple representation, never binary floating JSON numbers.
      reject("non-integer JSON numbers are forbidden", "NON_INTEGER_JSON_NUMBER");
    }
    const token = raw.slice(start, i);
    const n = Number(token);
    if (!Number.isSafeInteger(n)) reject("integer is outside safe canonical range", "INTEGER_OUT_OF_RANGE");
    return n;
  }

  function parseArray() {
    expect("["); ws();
    const out = [];
    if (peek() === "]") { i += 1; return out; }
    while (true) {
      out.push(parseValue()); ws();
      if (peek() === "]") { i += 1; return out; }
      expect(","); ws();
    }
  }

  function parseObject() {
    expect("{"); ws();
    const out = Object.create(null);
    const rawNames = new Set();
    const nfcOwners = new Map();
    if (peek() === "}") { i += 1; return out; }
    while (true) {
      if (peek() !== '"') reject("object member name must be string", "INVALID_JSON");
      const key = parseString();
      if (rawNames.has(key)) reject(`duplicate member: ${key}`, "DUPLICATE_MEMBER");
      rawNames.add(key);
      const shadow = key.normalize("NFC");
      if (nfcOwners.has(shadow) && nfcOwners.get(shadow) !== key) {
        reject(`NFC-colliding property names: ${nfcOwners.get(shadow)} / ${key}`, "NFC_COLLIDING_PROPERTY_NAMES");
      }
      nfcOwners.set(shadow, key);
      ws(); expect(":"); ws();
      out[key] = parseValue(); ws();
      if (peek() === "}") { i += 1; return out; }
      expect(","); ws();
    }
  }

  function parseValue() {
    ws();
    const ch = peek();
    if (ch === '"') return parseString();
    if (ch === "{") return parseObject();
    if (ch === "[") return parseArray();
    if (raw.startsWith("true", i)) { i += 4; return true; }
    if (raw.startsWith("false", i)) { i += 5; return false; }
    if (raw.startsWith("null", i)) { i += 4; return null; }
    if (ch === "-" || /\d/.test(ch ?? "")) return parseNumber();
    reject(`invalid JSON value at offset ${i}`, "INVALID_JSON");
  }

  const value = parseValue(); ws();
  if (i !== raw.length) reject(`trailing data at offset ${i}`, "INVALID_JSON");
  return value;
}

function validateObjectNames(obj) {
  const owners = new Map();
  for (const key of Object.keys(obj)) {
    validateString(key);
    const shadow = key.normalize("NFC");
    if (owners.has(shadow) && owners.get(shadow) !== key) {
      reject(`NFC-colliding property names: ${owners.get(shadow)} / ${key}`, "NFC_COLLIDING_PROPERTY_NAMES");
    }
    owners.set(shadow, key);
  }
}

function validateValue(value, seen = new Set()) {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") { validateString(value); return; }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) reject("canonical JSON numbers must be safe integers", Number.isInteger(value) ? "INTEGER_OUT_OF_RANGE" : "NON_INTEGER_JSON_NUMBER");
    return;
  }
  if (typeof value !== "object") reject("unsupported canonical value", "UNSUPPORTED_VALUE");
  if (seen.has(value)) reject("cycles are not canonical JSON", "CYCLIC_VALUE");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const x of value) validateValue(x, seen);
  } else {
    validateObjectNames(value);
    for (const x of Object.values(value)) validateValue(x, seen);
  }
  seen.delete(value);
}

function jcsString(text) { validateString(text); return JSON.stringify(text); }
function canonicalValue(value) {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "string") return jcsString(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  const keys = Object.keys(value).sort(); // ECMAScript UTF-16 lexical order, as JCS
  return `{${keys.map((k) => `${jcsString(k)}:${canonicalValue(value[k])}`).join(",")}}`;
}

export function canonicalize(value) {
  validateValue(value);
  return canonicalValue(value);
}

export function canonicalizeRawJson(raw) {
  return canonicalize(parseStrictJson(raw));
}

export function canonicalRecordForHash(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) reject("record must be an object", "INVALID_RECORD");
  const copy = Object.create(null);
  for (const [key, value] of Object.entries(record)) {
    if (key === "record_hash") continue;
    copy[key] = value;
  }
  return canonicalize(copy);
}

export function recordHash(record) {
  const bytes = Buffer.from(canonicalRecordForHash(record), "utf8");
  return createHash("sha256").update(bytes).digest("hex");
}
