export class LeaseError extends Error {
  constructor(message) { super(message); this.name = "LeaseError"; }
}

const EVENT_KINDS = new Set([
  "LEASE_GRANTED", "LEASE_RELEASED", "ROLE_LEASE_GRANTED", "ROLE_LEASE_RELEASED", "AUTHORITY_GRANTED",
  "AUTHORITY_RELEASED", "AUTHORITY_DECIDED",
]);
const EVENT_FIELDS = ["event_id", "sequence", "kind", "payload"];
const REQUEST_FIELDS = ["request_id", "subject", "action", "target", "scope", "evidence_ids"];
const FORBIDDEN = new Set(["*", "ANY", "ALL"]);
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function exactKeys(value, fields) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = [...fields].sort();
  return keys.length === expected.length && expected.every((field, i) => keys[i] === field);
}
function nonempty(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new LeaseError(`${name} must be a non-empty string`);
  if (FORBIDDEN.has(value)) throw new LeaseError(`${name} must be explicit; wildcards are forbidden`);
  return value;
}
function stringList(value, name) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new LeaseError(`${name} must be a list of non-empty strings`);
  }
  if (new Set(value).size !== value.length) throw new LeaseError(`${name} must not contain duplicates`);
  return [...value];
}
function stableValue(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
}
function stableEventText(event) { return stableValue(event); }
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToHex(bytes) { return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); }
async function hash(previousHex, event) {
  const prior = hexToBytes(previousHex);
  const encoded = new TextEncoder().encode(stableEventText(event));
  const material = new Uint8Array(prior.length + encoded.length);
  material.set(prior, 0); material.set(encoded, prior.length);
  return bytesToHex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", material)));
}

function allLeaseIds(state) {
  return new Set([...state.leases.map((x) => x.lease_id), ...state.roleLeases.map((x) => x.lease_id)]);
}

export function initialLeaseState() {
  return Object.freeze({
    lastSequence: 0, eventIds: Object.freeze([]), leases: Object.freeze([]), roleLeases: Object.freeze([]),
    authorityGrants: Object.freeze([]), releasedLeases: Object.freeze([]), releasedRoleLeases: Object.freeze([]),
    releasedAuthorityGrants: Object.freeze([]), decisions: Object.freeze([]), historyHash: EMPTY_SHA256,
  });
}

export function validateRequest(request) {
  if (!exactKeys(request, REQUEST_FIELDS)) {
    throw new LeaseError("request must contain exactly request_id, subject, action, target, scope, evidence_ids");
  }
  for (const name of ["request_id", "subject", "action", "target", "scope"]) nonempty(request[name], name);
  return Object.freeze({ ...request, evidence_ids: Object.freeze(stringList(request.evidence_ids, "evidence_ids")) });
}

export function activeLeases(state, subject, leaseClass, scope, resource = null, sequence = state.lastSequence + 1) {
  nonempty(subject, "subject"); nonempty(leaseClass, "lease_class"); nonempty(scope, "scope");
  if (resource !== null) nonempty(resource, "resource");
  if (!Number.isInteger(sequence) || sequence < 1) throw new LeaseError("sequence must be an integer >= 1");
  return state.leases.filter((lease) => lease.subject === subject && lease.lease_class === leaseClass && lease.scope === scope
    && (resource === null || lease.resource === resource)
    && !state.releasedLeases.includes(lease.lease_id)
    && lease.issued_sequence <= sequence && sequence < lease.expires_sequence);
}

export function hasActiveLease(state, subject, leaseClass, resource, scope, sequence = state.lastSequence + 1) {
  return activeLeases(state, subject, leaseClass, scope, resource, sequence).length > 0;
}

export function activeRoles(state, subject, scope, sequence = state.lastSequence + 1) {
  nonempty(subject, "subject"); nonempty(scope, "scope");
  if (!Number.isInteger(sequence) || sequence < 1) throw new LeaseError("sequence must be an integer >= 1");
  const legacy = state.roleLeases.filter((lease) => lease.subject === subject && lease.scope === scope
    && !state.releasedRoleLeases.includes(lease.lease_id)
    && lease.issued_sequence <= sequence && sequence < lease.expires_sequence);
  const universal = activeLeases(state, subject, "ROLE", scope, null, sequence).map((lease) => ({
    lease_id: lease.lease_id,
    subject: lease.subject,
    role: lease.resource,
    scope: lease.scope,
    issued_sequence: lease.issued_sequence,
    expires_sequence: lease.expires_sequence,
  }));
  return [...legacy, ...universal].sort((a, b) => a.lease_id < b.lease_id ? -1 : a.lease_id > b.lease_id ? 1 : 0);
}

function activeGenericLeaseById(state, leaseId, sequence) {
  nonempty(leaseId, "lease_id");
  const lease = state.leases.find((x) => x.lease_id === leaseId);
  if (!lease || state.releasedLeases.includes(leaseId)) return null;
  return lease.issued_sequence <= sequence && sequence < lease.expires_sequence ? lease : null;
}

function activeLegacyRoleById(state, leaseId, sequence) {
  nonempty(leaseId, "lease_id");
  const lease = state.roleLeases.find((x) => x.lease_id === leaseId);
  if (!lease || state.releasedRoleLeases.includes(leaseId)) return null;
  return lease.issued_sequence <= sequence && sequence < lease.expires_sequence ? lease : null;
}

export function makeLeaseRotationEvents(state, oldLeaseId, {
  releaseEventId,
  grantEventId,
  newLeaseId,
  newSubject,
  expiresSequence,
  purpose = null,
}) {
  nonempty(oldLeaseId, "old_lease_id");
  nonempty(releaseEventId, "release_event_id");
  nonempty(grantEventId, "grant_event_id");
  nonempty(newLeaseId, "new_lease_id");
  nonempty(newSubject, "new_subject");
  if (releaseEventId === grantEventId) throw new LeaseError("rotation event ids must be distinct");
  if (newLeaseId === oldLeaseId || allLeaseIds(state).has(newLeaseId)) {
    throw new LeaseError("new_lease_id must be unused and different from old_lease_id");
  }

  const releaseSequence = state.lastSequence + 1;
  const grantSequence = state.lastSequence + 2;
  validateExpiry(expiresSequence, grantSequence);

  const current = activeGenericLeaseById(state, oldLeaseId, releaseSequence);
  if (current) {
    const nextPurpose = purpose === null ? current.purpose : nonempty(purpose, "purpose");
    return Object.freeze([
      Object.freeze({ event_id: releaseEventId, sequence: releaseSequence, kind: "LEASE_RELEASED", payload: { lease_id: oldLeaseId } }),
      Object.freeze({
        event_id: grantEventId,
        sequence: grantSequence,
        kind: "LEASE_GRANTED",
        payload: {
          lease_id: newLeaseId,
          subject: newSubject,
          lease_class: current.lease_class,
          resource: current.resource,
          scope: current.scope,
          purpose: nextPurpose,
          expires_sequence: expiresSequence,
        },
      }),
    ]);
  }

  const legacy = activeLegacyRoleById(state, oldLeaseId, releaseSequence);
  if (legacy) {
    const nextPurpose = purpose === null ? "role-rotation" : nonempty(purpose, "purpose");
    return Object.freeze([
      Object.freeze({ event_id: releaseEventId, sequence: releaseSequence, kind: "ROLE_LEASE_RELEASED", payload: { lease_id: oldLeaseId } }),
      Object.freeze({
        event_id: grantEventId,
        sequence: grantSequence,
        kind: "LEASE_GRANTED",
        payload: {
          lease_id: newLeaseId,
          subject: newSubject,
          lease_class: "ROLE",
          resource: legacy.role,
          scope: legacy.scope,
          purpose: nextPurpose,
          expires_sequence: expiresSequence,
        },
      }),
    ]);
  }

  throw new LeaseError("old lease is unknown, released, or expired");
}

export function decideAuthority(state, request, sequence = state.lastSequence + 1) {
  request = validateRequest(request);
  if (!Number.isInteger(sequence) || sequence < 1) throw new LeaseError("sequence must be an integer >= 1");
  const evidence = new Set(request.evidence_ids);
  const candidates = state.authorityGrants.filter((grant) => !state.releasedAuthorityGrants.includes(grant.grant_id)
    && grant.issued_sequence <= sequence && sequence < grant.expires_sequence
    && grant.subject === request.subject && grant.action === request.action
    && grant.target === request.target && grant.scope === request.scope
    && grant.required_evidence.every((id) => evidence.has(id)))
    .sort((a, b) => a.grant_id.localeCompare(b.grant_id));
  if (candidates.length === 0) return Object.freeze({ allowed: false, reason: "NO_VALID_GRANT", grant_id: null });
  return Object.freeze({ allowed: true, reason: "VALID_SCOPED_GRANT", grant_id: candidates[0].grant_id });
}

export function makeDecisionEvent(state, request, eventId) {
  request = validateRequest(request); nonempty(eventId, "event_id");
  const sequence = state.lastSequence + 1;
  const decision = decideAuthority(state, request, sequence);
  return {
    event_id: eventId, sequence, kind: "AUTHORITY_DECIDED",
    payload: { ...request, evidence_ids: [...request.evidence_ids], ...decision },
  };
}

function validateEnvelope(state, event) {
  if (!exactKeys(event, EVENT_FIELDS)) throw new LeaseError("event must contain exactly event_id, sequence, kind, payload");
  nonempty(event.event_id, "event_id");
  if (state.eventIds.includes(event.event_id)) throw new LeaseError("duplicate event_id");
  if (!Number.isInteger(event.sequence) || event.sequence !== state.lastSequence + 1) throw new LeaseError("sequence must be contiguous and increasing");
  if (!EVENT_KINDS.has(event.kind)) throw new LeaseError("unrecognized lease event kind");
  if (event.payload === null || typeof event.payload !== "object" || Array.isArray(event.payload)) throw new LeaseError("payload must be an object");
}
function validateExpiry(expires, issued) {
  if (!Number.isInteger(expires) || expires <= issued) throw new LeaseError("expires_sequence must be an integer greater than the grant sequence");
}

export async function reduceLease(state, event) {
  validateEnvelope(state, event);
  const leases = state.leases.map((x) => ({ ...x }));
  const roles = state.roleLeases.map((x) => ({ ...x }));
  const grants = state.authorityGrants.map((x) => ({ ...x, required_evidence: [...x.required_evidence] }));
  const releasedLeases = [...state.releasedLeases];
  const releasedRoles = [...state.releasedRoleLeases];
  const releasedGrants = [...state.releasedAuthorityGrants];
  const decisions = state.decisions.map((x) => ({ ...x, evidence_ids: [...x.evidence_ids] }));
  const p = event.payload;

  if (event.kind === "LEASE_GRANTED") {
    if (!exactKeys(p, ["lease_id", "subject", "lease_class", "resource", "scope", "purpose", "expires_sequence"])) {
      throw new LeaseError("payload fields do not match event kind");
    }
    const leaseId = nonempty(p.lease_id, "lease_id");
    if (allLeaseIds(state).has(leaseId)) throw new LeaseError("duplicate lease_id");
    validateExpiry(p.expires_sequence, event.sequence);
    leases.push({
      lease_id: leaseId,
      subject: nonempty(p.subject, "subject"),
      lease_class: nonempty(p.lease_class, "lease_class"),
      resource: nonempty(p.resource, "resource"),
      scope: nonempty(p.scope, "scope"),
      purpose: nonempty(p.purpose, "purpose"),
      issued_sequence: event.sequence,
      expires_sequence: p.expires_sequence,
    });
  } else if (event.kind === "LEASE_RELEASED") {
    if (!exactKeys(p, ["lease_id"])) throw new LeaseError("payload fields do not match event kind");
    const id = nonempty(p.lease_id, "lease_id");
    if (!leases.some((x) => x.lease_id === id)) throw new LeaseError("unknown lease_id");
    if (releasedLeases.includes(id)) throw new LeaseError("lease already released");
    releasedLeases.push(id);
  } else if (event.kind === "ROLE_LEASE_GRANTED") {
    if (!exactKeys(p, ["lease_id", "subject", "role", "scope", "expires_sequence"])) throw new LeaseError("payload fields do not match event kind");
    const leaseId = nonempty(p.lease_id, "lease_id");
    if (allLeaseIds(state).has(leaseId)) throw new LeaseError("duplicate lease_id");
    validateExpiry(p.expires_sequence, event.sequence);
    roles.push({ lease_id: leaseId, subject: nonempty(p.subject, "subject"), role: nonempty(p.role, "role"),
      scope: nonempty(p.scope, "scope"), issued_sequence: event.sequence, expires_sequence: p.expires_sequence });
  } else if (event.kind === "ROLE_LEASE_RELEASED") {
    if (!exactKeys(p, ["lease_id"])) throw new LeaseError("payload fields do not match event kind");
    const id = nonempty(p.lease_id, "lease_id");
    if (!roles.some((x) => x.lease_id === id)) throw new LeaseError("unknown lease_id");
    if (releasedRoles.includes(id)) throw new LeaseError("role lease already released");
    releasedRoles.push(id);
  } else if (event.kind === "AUTHORITY_GRANTED") {
    if (!exactKeys(p, ["grant_id", "subject", "action", "target", "scope", "expires_sequence", "required_evidence"])) throw new LeaseError("payload fields do not match event kind");
    const id = nonempty(p.grant_id, "grant_id");
    if (grants.some((x) => x.grant_id === id)) throw new LeaseError("duplicate grant_id");
    validateExpiry(p.expires_sequence, event.sequence);
    grants.push({ grant_id: id, subject: nonempty(p.subject, "subject"), action: nonempty(p.action, "action"),
      target: nonempty(p.target, "target"), scope: nonempty(p.scope, "scope"), issued_sequence: event.sequence,
      expires_sequence: p.expires_sequence, required_evidence: stringList(p.required_evidence, "required_evidence") });
  } else if (event.kind === "AUTHORITY_RELEASED") {
    if (!exactKeys(p, ["grant_id"])) throw new LeaseError("payload fields do not match event kind");
    const id = nonempty(p.grant_id, "grant_id");
    if (!grants.some((x) => x.grant_id === id)) throw new LeaseError("unknown grant_id");
    if (releasedGrants.includes(id)) throw new LeaseError("authority grant already released");
    releasedGrants.push(id);
  } else {
    const decisionFields = [...REQUEST_FIELDS, "allowed", "reason", "grant_id"];
    if (!exactKeys(p, decisionFields)) throw new LeaseError("payload fields do not match event kind");
    const request = Object.fromEntries(REQUEST_FIELDS.map((key) => [key, p[key]]));
    validateRequest(request);
    const expected = decideAuthority(state, request, event.sequence);
    if (typeof p.allowed !== "boolean") throw new LeaseError("allowed must be boolean");
    if (p.grant_id !== null && (typeof p.grant_id !== "string" || p.grant_id.length === 0)) throw new LeaseError("grant_id must be null or non-empty string");
    if (p.allowed !== expected.allowed || p.reason !== expected.reason || p.grant_id !== expected.grant_id) {
      throw new LeaseError("authority decision does not match current grants");
    }
    decisions.push({ ...p, evidence_ids: [...p.evidence_ids] });
  }

  return Object.freeze({
    lastSequence: event.sequence, eventIds: Object.freeze([...state.eventIds, event.event_id]),
    leases: Object.freeze(leases.map(Object.freeze)), roleLeases: Object.freeze(roles.map(Object.freeze)),
    authorityGrants: Object.freeze(grants.map(Object.freeze)), releasedLeases: Object.freeze(releasedLeases),
    releasedRoleLeases: Object.freeze(releasedRoles), releasedAuthorityGrants: Object.freeze(releasedGrants),
    decisions: Object.freeze(decisions.map(Object.freeze)), historyHash: await hash(state.historyHash, event),
  });
}

export async function replayLeases(events) {
  let state = initialLeaseState();
  for (const event of events) state = await reduceLease(state, event);
  return state;
}
