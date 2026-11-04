import { makeDecisionEvent, reduceLease } from "./leases.js";
import { makeEvidenceEntry } from "./evidence_log.js";

function explicit(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function receiptRecord({ phase, request, decision, executorId, at, result = null }) {
  return {
    record_version: "0.1",
    phase,
    timestamp: at.toISOString(),
    executor_id: executorId,
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

export async function authorizeAndExecute({
  state,
  request,
  decisionEventId,
  executorId,
  execute,
  appendDecision,
  appendEvidenceEntry,
  previousEvidenceEntry = null,
  now = () => new Date(),
}) {
  explicit(decisionEventId, "decisionEventId");
  explicit(executorId, "executorId");
  if (typeof execute !== "function") throw new TypeError("execute must be a function");
  if (typeof appendDecision !== "function") throw new TypeError("appendDecision must be a function");
  if (typeof appendEvidenceEntry !== "function") throw new TypeError("appendEvidenceEntry must be a function");

  const decision = makeDecisionEvent(state, request, decisionEventId);
  const nextState = await reduceLease(state, decision);
  await appendDecision(decision);

  let evidence = previousEvidenceEntry;
  if (!decision.payload.allowed) {
    const denied = makeEvidenceEntry(evidence, receiptRecord({
      phase: "DENIED",
      request,
      decision,
      executorId,
      at: now(),
      result: { status: "NOT_EXECUTED" },
    }));
    await appendEvidenceEntry(denied);
    return Object.freeze({ enforcement: "DENY", decision, state: nextState, evidence_entry: denied });
  }

  const pending = makeEvidenceEntry(evidence, receiptRecord({
    phase: "AUTHORIZED_PENDING",
    request,
    decision,
    executorId,
    at: now(),
    result: { status: "PENDING" },
  }));
  await appendEvidenceEntry(pending);
  evidence = pending;

  try {
    const result = await execute(Object.freeze({ ...request, evidence_ids: Object.freeze([...request.evidence_ids]) }));
    const success = makeEvidenceEntry(evidence, receiptRecord({
      phase: "COMPLETED",
      request,
      decision,
      executorId,
      at: now(),
      result: { status: "SUCCESS", output: result ?? null },
    }));
    await appendEvidenceEntry(success);
    return Object.freeze({
      enforcement: "ALLOW",
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
      executorId,
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
