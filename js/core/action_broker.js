import { makeDecisionEvent, reduceLease } from "./leases.js";
import { makeEvidenceEntry } from "./evidence_log.js";
import { getTrustedAdapter } from "../adapters/registry.js";

function explicit(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function stringList(value, name) {
  if (!Array.isArray(value) || value.some((x) => typeof x !== "string" || x.length === 0)) {
    throw new TypeError(`${name} must be a list of non-empty strings`);
  }
  return [...new Set(value)];
}

function receiptRecord({ phase, request, decision, adapterId, at, result = null }) {
  return {
    record_version: "0.2",
    phase,
    timestamp: at.toISOString(),
    adapter_id: adapterId,
    decision_event_id: decision.event_id,
    request_id: request.request_id,
    subject: request.subject,
    action: request.action,
    target: request.target,
    scope: request.scope,
    evidence_ids: [...request.evidence_ids],
    allowed: decision.payload.allowed,
    reason: decision.payload.reason,
    grant_id: decision.payload.grant_id,
    result,
  };
}

export async function authorizeRegisteredAction({
  state,
  adapterId,
  subject,
  requestId,
  input,
  evidenceIds = [],
  decisionEventId,
  appendDecision,
  appendEvidenceEntry,
  previousEvidenceEntry = null,
  now = () => new Date(),
}) {
  explicit(adapterId, "adapterId");
  explicit(subject, "subject");
  explicit(requestId, "requestId");
  explicit(decisionEventId, "decisionEventId");
  evidenceIds = stringList(evidenceIds, "evidenceIds");
  if (typeof appendDecision !== "function") throw new TypeError("appendDecision must be a function");
  if (typeof appendEvidenceEntry !== "function") throw new TypeError("appendEvidenceEntry must be a function");

  const adapter = getTrustedAdapter(adapterId);
  const derived = await adapter.derive({ input, evidenceIds });
  if (!derived || typeof derived !== "object") throw new TypeError("adapter derive() must return an object");

  const request = {
    request_id: requestId,
    subject,
    action: adapter.action,
    target: explicit(derived.target, "derived.target"),
    scope: explicit(derived.scope, "derived.scope"),
    evidence_ids: stringList(derived.evidence_ids ?? evidenceIds, "derived.evidence_ids"),
  };

  const decision = makeDecisionEvent(state, request, decisionEventId);
  const nextState = await reduceLease(state, decision);
  await appendDecision(decision);

  let evidence = previousEvidenceEntry;
  if (!decision.payload.allowed) {
    const denied = makeEvidenceEntry(evidence, receiptRecord({
      phase: "DENIED",
      request,
      decision,
      adapterId: adapter.id,
      at: now(),
      result: { status: "NOT_EXECUTED" },
    }));
    await appendEvidenceEntry(denied);
    return Object.freeze({
      enforcement: "DENY",
      adapter_id: adapter.id,
      request: Object.freeze({ ...request, evidence_ids: Object.freeze([...request.evidence_ids]) }),
      decision,
      state: nextState,
      evidence_entry: denied,
    });
  }

  const pending = makeEvidenceEntry(evidence, receiptRecord({
    phase: "AUTHORIZED_PENDING",
    request,
    decision,
    adapterId: adapter.id,
    at: now(),
    result: { status: "PENDING" },
  }));
  await appendEvidenceEntry(pending);
  evidence = pending;

  try {
    const result = await adapter.execute({
      executionInput: derived.execution_input,
      request: Object.freeze({ ...request, evidence_ids: Object.freeze([...request.evidence_ids]) }),
    });
    const success = makeEvidenceEntry(evidence, receiptRecord({
      phase: "COMPLETED",
      request,
      decision,
      adapterId: adapter.id,
      at: now(),
      result: { status: "SUCCESS", output: result ?? null },
    }));
    await appendEvidenceEntry(success);
    return Object.freeze({
      enforcement: "ALLOW",
      adapter_id: adapter.id,
      request: Object.freeze({ ...request, evidence_ids: Object.freeze([...request.evidence_ids]) }),
      decision,
      state: nextState,
      action_result: result ?? null,
      evidence_entry: success,
    });
  } catch (err) {
    const failure = makeEvidenceEntry(evidence, receiptRecord({
      phase: "COMPLETED",
      request,
      decision,
      adapterId: adapter.id,
      at: now(),
      result: { status: "ERROR", error: String(err?.message || err) },
    }));
    await appendEvidenceEntry(failure);
    const wrapped = new Error(String(err?.message || err));
    wrapped.name = "AuthorizedActionError";
    wrapped.evidence_entry = failure;
    throw wrapped;
  }
}
