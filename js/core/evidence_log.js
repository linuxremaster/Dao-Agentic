import { createHash } from "node:crypto";

export class EvidenceLogError extends Error {
  constructor(message) { super(message); this.name = "EvidenceLogError"; }
}

export const EMPTY_EVIDENCE_HASH = createHash("sha256").update("").digest("hex");

function stableValue(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new EvidenceLogError("evidence numbers must be safe integers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (typeof value !== "object") throw new EvidenceLogError("unsupported evidence value");
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
}

export function canonicalEvidence(value) { return stableValue(value); }

function hashMaterial(previousHash, body) {
  if (typeof previousHash !== "string" || !/^[0-9a-f]{64}$/.test(previousHash)) {
    throw new EvidenceLogError("previous_hash must be lowercase sha256 hex");
  }
  const prior = Buffer.from(previousHash, "hex");
  const payload = Buffer.from(canonicalEvidence(body), "utf8");
  return createHash("sha256").update(Buffer.concat([prior, payload])).digest("hex");
}

export function makeEvidenceEntry(previousEntry, record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new EvidenceLogError("record must be an object");
  }
  const sequence = previousEntry ? previousEntry.sequence + 1 : 1;
  const previous_hash = previousEntry ? previousEntry.entry_hash : EMPTY_EVIDENCE_HASH;
  const body = { sequence, previous_hash, record };
  return Object.freeze({ ...body, entry_hash: hashMaterial(previous_hash, body) });
}

export function verifyEvidenceChain(entries) {
  if (!Array.isArray(entries)) throw new EvidenceLogError("entries must be an array");
  let previous = null;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new EvidenceLogError(`entry ${i + 1} must be an object`);
    }
    const expectedSequence = previous ? previous.sequence + 1 : 1;
    const expectedPrevious = previous ? previous.entry_hash : EMPTY_EVIDENCE_HASH;
    if (entry.sequence !== expectedSequence) throw new EvidenceLogError(`entry ${i + 1} sequence mismatch`);
    if (entry.previous_hash !== expectedPrevious) throw new EvidenceLogError(`entry ${i + 1} previous hash mismatch`);
    const body = { sequence: entry.sequence, previous_hash: entry.previous_hash, record: entry.record };
    const expectedHash = hashMaterial(entry.previous_hash, body);
    if (entry.entry_hash !== expectedHash) throw new EvidenceLogError(`entry ${i + 1} hash mismatch`);
    previous = entry;
  }
  return Object.freeze({
    ok: true,
    count: entries.length,
    last_hash: previous?.entry_hash ?? EMPTY_EVIDENCE_HASH,
  });
}
