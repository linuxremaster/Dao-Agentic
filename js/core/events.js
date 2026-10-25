export const KINDS = Object.freeze([
  "TASK_ADMITTED", "TASK_READY", "WORK_STARTED", "OUTPUT_READY",
  "VERIFICATION_PASSED", "VERIFICATION_FAILED", "HOLD_ENTERED",
  "RECOVERY_COMPLETED", "CHECKPOINTED",
]);

const FIELDS = Object.freeze(["event_id", "sequence", "kind", "payload"]);
const FIELD_SET = new Set(FIELDS);

export class AdmissionError extends Error {
  constructor(message) {
    super(message);
    this.name = "AdmissionError";
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function validateJson(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return;
    throw new AdmissionError("payload must contain only finite JSON values");
  }
  if (!Array.isArray(value) && !isPlainObject(value)) {
    throw new AdmissionError("payload must contain only finite JSON values");
  }
  if (ancestors.has(value)) throw new AdmissionError("payload must not contain cycles");
  const next = new Set(ancestors);
  next.add(value);
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) validateJson(child, next);
}

function asciiJsonString(value) {
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, (ch) =>
    `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

function canonicalValue(value) {
  if (value === null) return "null";
  if (typeof value === "string") return asciiJsonString(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new AdmissionError("payload must contain only finite JSON values");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${asciiJsonString(key)}:${canonicalValue(value[key])}`).join(",")}}`;
  }
  throw new AdmissionError("payload must contain only finite JSON values");
}

export function canonicalEventText(event) {
  if (!isPlainObject(event)) {
    throw new AdmissionError("event must contain exactly event_id, sequence, kind, payload");
  }
  const keys = Object.keys(event);
  if (keys.length !== FIELDS.length || keys.some((key) => !FIELD_SET.has(key))) {
    throw new AdmissionError("event must contain exactly event_id, sequence, kind, payload");
  }
  if (typeof event.event_id !== "string" || event.event_id.length === 0) {
    throw new AdmissionError("event_id must be a non-empty string");
  }
  if (!Number.isInteger(event.sequence) || event.sequence < 1) {
    throw new AdmissionError("sequence must be an integer >= 1");
  }
  if (typeof event.kind !== "string" || !KINDS.includes(event.kind)) {
    throw new AdmissionError("unrecognized event kind");
  }
  if (!isPlainObject(event.payload)) {
    throw new AdmissionError("payload must be a JSON object");
  }
  validateJson(event.payload);
  return canonicalValue(event);
}

export function canonicalEvent(event) {
  return new TextEncoder().encode(canonicalEventText(event));
}
