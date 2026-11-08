import { makeDecisionEvent, reduceLease } from "./leases.js";
import { makeEvidenceEntry } from "./evidence_log.js";
import { getTrustedAdapter } from "../adapters/registry.js";
import {
  ActionOutcomeUnknownError,
  normalizeExecutionContract,
  planUnknownOutcome,
  reconcileEffect,
} from "./action_transactions.js";

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

function receiptRecord({ phase, request, decision, adapterId, at, result = null,
  actionId, idempotencyKey, executionContract, controlContext = null, transactionState }) {
  return {
    record_version: "0.3",
    phase,
    timestamp: at.toISOString(),
    adapter_id: adapterId,
    decision_event_id: decision.event_id,
    request_id: request.request_id,
    action_id: actionId,
    idempotency_key: idempotencyKey,
    execution_contract: [...executionContract],
    transaction_state: transactionState,
    subject: request.subject,
    action: request.action,
    target: request.target,
    scope: request.scope,
    evidence_ids: [...request.evidence_ids],
    allowed: decision.payload.allowed,
    reason: decision.payload.reason,
    grant_id: decision.payload.grant_id,
    control_context: controlContext ?? null,
    result,
  };
}

function actionError(message, evidenceEntry, extras = {}) {
  const wrapped = new Error(message);
  wrapped.name = "AuthorizedActionError";
  wrapped.evidence_entry = evidenceEntry;
  Object.assign(wrapped, extras);
  return wrapped;
}

export async function authorizeRegisteredAction({
  state,
  adapterId,
  subject,
  requestId,
  actionId = null,
  idempotencyKey = null,
  input,
  evidenceIds = [],
  decisionEventId,
  appendDecision,
  appendEvidenceEntry,
  previousEvidenceEntry = null,
  beforeExecute = null,
  controlContext = null,
  now = () => new Date(),
}) {
  explicit(adapterId, "adapterId");
  explicit(subject, "subject");
  explicit(requestId, "requestId");
  explicit(decisionEventId, "decisionEventId");
  const action_id = explicit(actionId ?? requestId, "actionId");
  const idempotency_key = explicit(idempotencyKey ?? action_id, "idempotencyKey");
  evidenceIds = stringList(evidenceIds, "evidenceIds");
  if (typeof appendDecision !== "function") throw new TypeError("appendDecision must be a function");
  if (typeof appendEvidenceEntry !== "function") throw new TypeError("appendEvidenceEntry must be a function");

  const adapter = getTrustedAdapter(adapterId);
  const executionContract = normalizeExecutionContract(adapter.execution_contract);
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
      actionId: action_id,
      idempotencyKey: idempotency_key,
      executionContract,
      controlContext,
      transactionState: "DENIED",
      result: { status: "NOT_EXECUTED" },
    }));
    await appendEvidenceEntry(denied);
    return Object.freeze({
      enforcement: "DENY",
      adapter_id: adapter.id,
      action_id,
      idempotency_key,
      execution_contract: executionContract,
      request: Object.freeze({ ...request, evidence_ids: Object.freeze([...request.evidence_ids]) }),
      decision,
      state: nextState,
      evidence_entry: denied,
    });
  }

  // ACTION_INTENT: this durable append MUST succeed before any provider side effect is attempted.
  const pending = makeEvidenceEntry(evidence, receiptRecord({
    phase: "AUTHORIZED_PENDING",
    request,
    decision,
    adapterId: adapter.id,
    at: now(),
    actionId: action_id,
    idempotencyKey: idempotency_key,
    executionContract,
    controlContext,
    transactionState: "ACTION_INTENT_PERSISTED",
    result: { status: "PENDING" },
  }));
  await appendEvidenceEntry(pending);
  evidence = pending;

  if (beforeExecute !== null) {
    if (typeof beforeExecute !== "function") throw new TypeError("beforeExecute must be a function or null");
    try {
      await beforeExecute({ adapter, derived, request, decision, actionId: action_id, idempotencyKey: idempotency_key });
    } catch (err) {
      const cancelled = makeEvidenceEntry(evidence, receiptRecord({
        phase: "CANCELLED", request, decision, adapterId: adapter.id, at: now(),
        actionId: action_id, idempotencyKey: idempotency_key, executionContract,
        controlContext,
        transactionState: "CANCELLED_BEFORE_EFFECT",
        result: { status: "NOT_EXECUTED", error: String(err?.message || err) },
      }));
      await appendEvidenceEntry(cancelled);
      throw actionError(String(err?.message || err), cancelled, { action_state: "CANCELLED_BEFORE_EFFECT", automatic_retry: false });
    }
  }

  let result;
  try {
    result = await adapter.execute({
      executionInput: derived.execution_input,
      request: Object.freeze({ ...request, evidence_ids: Object.freeze([...request.evidence_ids]) }),
      actionId: action_id,
      idempotencyKey: idempotency_key,
    });
  } catch (err) {
    // A provider-specific pre-effect failure is the only case we may classify directly as no effect.
    if (err?.effect_status === "NO_EFFECT") {
      const failure = makeEvidenceEntry(evidence, receiptRecord({
        phase: "COMPLETED",
        request,
        decision,
        adapterId: adapter.id,
        at: now(),
        actionId: action_id,
        idempotencyKey: idempotency_key,
        executionContract,
        controlContext,
        transactionState: "FAILED_CONFIRMED_NO_EFFECT",
        result: { status: "ERROR", error: String(err?.message || err) },
      }));
      await appendEvidenceEntry(failure);
      throw actionError(String(err?.message || err), failure, { action_state: "FAILED_CONFIRMED_NO_EFFECT", automatic_retry: false });
    }

    let reconciliation = { status: "INCONCLUSIVE", reason: "EXECUTION_ERROR" };
    try {
      reconciliation = await reconcileEffect(adapter, {
        executionInput: derived.execution_input,
        request,
        actionId: action_id,
        idempotencyKey: idempotency_key,
      });
    } catch {
      reconciliation = { status: "INCONCLUSIVE", reason: "RECONCILIATION_FAILED" };
    }

    if (reconciliation.status === "EFFECT_PRESENT") {
      const reconciled = makeEvidenceEntry(evidence, receiptRecord({
        phase: "COMPLETED",
        request,
        decision,
        adapterId: adapter.id,
        at: now(),
        actionId: action_id,
        idempotencyKey: idempotency_key,
        executionContract,
        controlContext,
        transactionState: "SUCCEEDED",
        result: { status: "SUCCESS_RECONCILED", reconciliation },
      }));
      await appendEvidenceEntry(reconciled);
      return Object.freeze({
        enforcement: "ALLOW",
        adapter_id: adapter.id,
        action_id,
        idempotency_key,
        execution_contract: executionContract,
        request: Object.freeze({ ...request, evidence_ids: Object.freeze([...request.evidence_ids]) }),
        decision,
        state: nextState,
        action_result: Object.freeze({ status: "RECONCILED_SUCCESS", reconciliation }),
        evidence_entry: reconciled,
      });
    }

    if (reconciliation.status === "EFFECT_ABSENT") {
      const failure = makeEvidenceEntry(evidence, receiptRecord({
        phase: "COMPLETED",
        request,
        decision,
        adapterId: adapter.id,
        at: now(),
        actionId: action_id,
        idempotencyKey: idempotency_key,
        executionContract,
        controlContext,
        transactionState: "FAILED_CONFIRMED_NO_EFFECT",
        result: { status: "ERROR_CONFIRMED_NO_EFFECT", error: String(err?.message || err), reconciliation },
      }));
      await appendEvidenceEntry(failure);
      throw actionError(String(err?.message || err), failure, { action_state: "FAILED_CONFIRMED_NO_EFFECT", automatic_retry: false });
    }

    const unknown = makeEvidenceEntry(evidence, receiptRecord({
      phase: "OUTCOME_UNKNOWN",
      request,
      decision,
      adapterId: adapter.id,
      at: now(),
      actionId: action_id,
      idempotencyKey: idempotency_key,
      executionContract,
      controlContext,
      transactionState: "ACTION_OUTCOME_UNKNOWN",
      result: { status: "UNKNOWN", error: String(err?.message || err), reconciliation },
    }));
    try { await appendEvidenceEntry(unknown); } catch {}
    const e = new ActionOutcomeUnknownError(String(err?.message || err), { actionId: action_id, cause: err });
    e.evidence_entry = unknown;
    e.reconciliation = reconciliation;
    throw e;
  }

  const success = makeEvidenceEntry(evidence, receiptRecord({
    phase: "COMPLETED",
    request,
    decision,
    adapterId: adapter.id,
    at: now(),
    actionId: action_id,
    idempotencyKey: idempotency_key,
    executionContract,
    controlContext,
    transactionState: "SUCCEEDED",
    result: { status: "SUCCESS", output: result ?? null },
  }));

  try {
    await appendEvidenceEntry(success);
  } catch (persistError) {
    // The provider already returned success. We must not rewrite this as a failed action.
    throw new ActionOutcomeUnknownError("provider succeeded but durable completion persistence failed", {
      actionId: action_id,
      providerResult: result ?? null,
      cause: persistError,
    });
  }

  return Object.freeze({
    enforcement: "ALLOW",
    adapter_id: adapter.id,
    action_id,
    idempotency_key,
    execution_contract: executionContract,
    request: Object.freeze({ ...request, evidence_ids: Object.freeze([...request.evidence_ids]) }),
    decision,
    state: nextState,
    action_result: result ?? null,
    evidence_entry: success,
  });
}

export async function reconcileRegisteredAction({ adapterId, input, evidenceIds = [], actionId, idempotencyKey = actionId }) {
  explicit(adapterId, "adapterId");
  const action_id = explicit(actionId, "actionId");
  const idempotency_key = explicit(idempotencyKey, "idempotencyKey");
  const adapter = getTrustedAdapter(adapterId);
  const contract = normalizeExecutionContract(adapter.execution_contract);
  const derived = await adapter.derive({ input, evidenceIds: stringList(evidenceIds, "evidenceIds") });
  const request = Object.freeze({ action: adapter.action, target: derived.target, scope: derived.scope });
  const reconciliation = await reconcileEffect(adapter, {
    executionInput: derived.execution_input,
    request,
    actionId: action_id,
    idempotencyKey: idempotency_key,
  });
  const plan = planUnknownOutcome({ executionContract: contract, idempotencyKey: idempotency_key,
    reconciliation: reconciliation.status === "EFFECT_PRESENT" ? "EFFECT_PRESENT"
      : reconciliation.status === "EFFECT_ABSENT" ? "EFFECT_ABSENT" : "INCONCLUSIVE" });
  return Object.freeze({ adapter_id: adapter.id, action_id, idempotency_key, execution_contract: contract, reconciliation, plan });
}
