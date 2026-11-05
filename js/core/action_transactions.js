const VALID_CONTRACTS = new Set(["IDEMPOTENT", "QUERYABLE", "COMPENSATABLE", "NON_RETRYABLE"]);

export class ActionTransactionError extends Error {
  constructor(message, { code = "ACTION_TRANSACTION_ERROR", state = null, actionId = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "ActionTransactionError";
    this.code = code;
    this.action_state = state;
    this.action_id = actionId;
  }
}

export class ActionOutcomeUnknownError extends ActionTransactionError {
  constructor(message, { actionId, providerResult = null, cause = null } = {}) {
    super(message, { code: "ACTION_OUTCOME_UNKNOWN", state: "ACTION_OUTCOME_UNKNOWN", actionId, cause });
    this.name = "ActionOutcomeUnknownError";
    this.provider_result = providerResult;
    this.automatic_retry = false;
  }
}

export function normalizeExecutionContract(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ActionTransactionError("adapter execution_contract must be a non-empty array", { code: "INVALID_ADAPTER_CONTRACT" });
  }
  const out = [...new Set(value)];
  for (const item of out) {
    if (!VALID_CONTRACTS.has(item)) {
      throw new ActionTransactionError(`unsupported adapter execution contract: ${item}`, { code: "INVALID_ADAPTER_CONTRACT" });
    }
  }
  if (out.includes("NON_RETRYABLE") && out.includes("IDEMPOTENT")) {
    throw new ActionTransactionError("adapter cannot be both NON_RETRYABLE and IDEMPOTENT", { code: "INVALID_ADAPTER_CONTRACT" });
  }
  return Object.freeze(out.sort());
}

export function planUnknownOutcome({ executionContract, idempotencyKey, reconciliation = "INCONCLUSIVE" }) {
  const contract = normalizeExecutionContract(executionContract);
  if (reconciliation === "EFFECT_PRESENT") {
    return Object.freeze({ decision: "CONFIRM_SUCCESS", execution_attempts_added: 0, retry_idempotency_key: null });
  }
  if (reconciliation === "EFFECT_ABSENT") {
    if (contract.includes("IDEMPOTENT")) {
      return Object.freeze({ decision: "RETRY", execution_attempts_added: 1, retry_idempotency_key: idempotencyKey });
    }
    return Object.freeze({ decision: "HOLD", execution_attempts_added: 0, retry_idempotency_key: null });
  }
  if (reconciliation !== "INCONCLUSIVE") {
    throw new ActionTransactionError("unknown reconciliation result", { code: "INVALID_RECONCILIATION_RESULT" });
  }
  if (contract.includes("IDEMPOTENT")) {
    return Object.freeze({ decision: "RETRY", execution_attempts_added: 1, retry_idempotency_key: idempotencyKey });
  }
  return Object.freeze({ decision: "HOLD", execution_attempts_added: 0, retry_idempotency_key: null });
}

export async function reconcileEffect(adapter, { executionInput, request, actionId, idempotencyKey }) {
  const contract = normalizeExecutionContract(adapter.execution_contract);
  if (!contract.includes("QUERYABLE") || typeof adapter.reconcile !== "function") {
    return Object.freeze({ status: "INCONCLUSIVE", reason: "ADAPTER_NOT_QUERYABLE" });
  }
  const result = await adapter.reconcile({ executionInput, request, actionId, idempotencyKey });
  if (!result || !new Set(["EFFECT_PRESENT", "EFFECT_ABSENT", "INCONCLUSIVE", "CONFLICT"]).has(result.status)) {
    throw new ActionTransactionError("adapter reconcile() returned invalid status", { code: "INVALID_RECONCILIATION_RESULT", actionId });
  }
  return Object.freeze({ ...result });
}
