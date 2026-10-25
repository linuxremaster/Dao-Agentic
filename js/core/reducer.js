import { canonicalEvent } from "./events.js";
import { admit } from "./predicates.js";

export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function initialState() {
  return Object.freeze({
    status: "NEW",
    lastSequence: 0,
    eventIds: Object.freeze([]),
    historyHash: EMPTY_SHA256,
  });
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

export async function reduce(state, event) {
  const encoded = canonicalEvent(event);
  const status = admit(state, event);
  const previous = hexToBytes(state.historyHash);
  const material = new Uint8Array(previous.length + encoded.length);
  material.set(previous, 0);
  material.set(encoded, previous.length);
  return Object.freeze({
    status,
    lastSequence: event.sequence,
    eventIds: Object.freeze([...state.eventIds, event.event_id]),
    historyHash: await sha256(material),
  });
}

export async function replay(events) {
  let state = initialState();
  for (const event of events) state = await reduce(state, event);
  return state;
}
