// Inert-input boundary for the Friction Probe (WO-004 Phase B).
//
// Preferred entry: JSON text, parsed with JSON.parse, which yields inert data by construction.
// In-memory entry: accepted only if every node is inert JSON-derived data. The check reads
// property descriptors and never reads a property through [[Get]], so a getter is detected
// without being run. Rejected: accessor properties, symbol-keyed properties, non-enumerable
// properties, non-plain prototypes, non-finite numbers, undefined/functions/bigint, cycles.
//
// Known limit: a Proxy cannot be detected from JavaScript; its descriptor traps run during the
// check. Hosts that cannot exclude Proxies must use the JSON-text entry.
//
// Reuses AdmissionError and the plain-object / finite-number / no-cycle rules of
// js/core/events.js (validateJson); js/core is not modified.

import { AdmissionError } from "../core/events.js";

function isPlainProto(value) {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null || proto === Array.prototype;
}

function check(value, ancestors, path) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return;
    throw new AdmissionError(`non-finite number at ${path}`);
  }
  if (typeof value !== "object") throw new AdmissionError(`non-JSON value at ${path}`);
  if (!isPlainProto(value)) throw new AdmissionError(`non-plain object at ${path}`);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new AdmissionError(`symbol-keyed property at ${path}`);
  }
  if (ancestors.has(value)) throw new AdmissionError(`cycle at ${path}`);
  const next = new Set(ancestors);
  next.add(value);
  const isArray = Array.isArray(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    if (isArray && key === "length") continue;
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (!("value" in desc)) throw new AdmissionError(`accessor property at ${path}.${key}`);
    if (!desc.enumerable) throw new AdmissionError(`non-enumerable property at ${path}.${key}`);
    check(desc.value, next, `${path}.${key}`);
  }
  if (isArray) {
    for (let i = 0; i < value.length; i += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, String(i))) {
        throw new AdmissionError(`sparse array at ${path}[${i}]`);
      }
    }
  }
}

export function assertInert(value) {
  check(value, new Set(), "$");
  return value;
}

export function parseInert(text) {
  if (typeof text !== "string") throw new AdmissionError("packet text must be a string");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new AdmissionError("packet text is not valid JSON");
  }
  return assertInert(value);
}
