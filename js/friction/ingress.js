// Inert-input boundary for the Friction Probe (WO-004 Phase B).
//
// Only JSON text parsed here establishes inert provenance. Parsed nodes are deeply frozen
// and registered privately; arbitrary in-memory objects (including Proxies) reject before
// reflection or property reads. Portable JavaScript cannot safely identify arbitrary Proxies.

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

const parsedNodes = new WeakSet();

function retain(value) {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) retain(child);
    Object.freeze(value);
    parsedNodes.add(value);
  }
  return value;
}

export function assertInert(value) {
  if (value !== null && typeof value === "object") {
    if (!parsedNodes.has(value)) {
      throw new AdmissionError("untrusted in-memory input; use parseInert with JSON text");
    }
  } else {
    check(value, new Set(), "$");
  }
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
  check(value, new Set(), "$");
  return retain(value);
}
