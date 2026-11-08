export class PolicyArtifactError extends Error {
  constructor(message, code = "POLICY_INVALID") { super(message); this.name = "PolicyArtifactError"; this.code = code; }
}

export const NON_WAIVABLE_CONTROLS = Object.freeze([
  "CRYPTOGRAPHIC_AUTHORITY_VERIFICATION",
  "FAIL_CLOSED_ACTION_DEPENDENCY",
  "ACTION_INTENT_BEFORE_EFFECT",
  "NO_BLIND_RETRY_OUTCOME_UNKNOWN",
  "EXTERNAL_COMPLETENESS_NON_EQUIVOCATION_WITNESSING",
  "CANONICALIZATION_VALIDITY",
  "POLICY_AUTHORIZATION_ANTI_ROLLBACK",
  "ERASURE_RECOVERY_PATH_ACCOUNTING",
  "CORE_CONFORMANCE_REPORT_REQUIRED",
]);
const NON_WAIVABLE = new Set(NON_WAIVABLE_CONTROLS);

function nonempty(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new PolicyArtifactError(`${name} must be a non-empty string`);
  return value;
}
function parseTime(value, name) {
  nonempty(value, name);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new PolicyArtifactError(`${name} must be a valid timestamp`);
  return ms;
}
function plain(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PolicyArtifactError(`${name} must be an object`);
  return value;
}

export function classifyPolicyLineage({ trustedHeadDigest, candidateDigest, candidateParentDigest, historicalDigests = [] }) {
  nonempty(trustedHeadDigest, "trustedHeadDigest"); nonempty(candidateDigest, "candidateDigest"); nonempty(candidateParentDigest, "candidateParentDigest");
  if (candidateParentDigest === trustedHeadDigest) return "DIRECT_SUCCESSOR";
  if (historicalDigests.includes(candidateDigest) || historicalDigests.includes(candidateParentDigest)) return "ROLLBACK";
  return "DIVERGENT";
}

export function evaluatePolicyCandidate({
  candidate,
  trustedHeadDigest,
  trustedEpochId,
  signatureValid,
  approvalAuthorized,
  witnessBound,
  historicalDigests = [],
  now = new Date(),
}) {
  candidate = plain(candidate, "candidate");
  nonempty(candidate.content_digest, "candidate.content_digest");
  nonempty(candidate.parent_policy_digest, "candidate.parent_policy_digest");
  nonempty(candidate.policy_trust_epoch_id, "candidate.policy_trust_epoch_id");
  if (!signatureValid) return Object.freeze({ policy_state: "POLICY_INVALID", decision: "HOLD", reason: "INVALID_SIGNATURE" });
  if (!approvalAuthorized) return Object.freeze({ policy_state: "POLICY_INVALID", decision: "HOLD", reason: "UNAUTHORIZED_APPROVAL" });
  if (candidate.policy_trust_epoch_id !== trustedEpochId) return Object.freeze({ policy_state: "POLICY_INVALID", decision: "HOLD", reason: "TRUST_EPOCH_MISMATCH" });
  if (!witnessBound) return Object.freeze({ policy_state: "POLICY_INVALID", decision: "HOLD", reason: "WITNESS_MISSING" });
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new PolicyArtifactError("now is invalid");
  const start = parseTime(candidate.effective_from, "candidate.effective_from");
  const end = candidate.effective_until_or_null == null ? null : parseTime(candidate.effective_until_or_null, "candidate.effective_until_or_null");
  if (nowMs < start || (end != null && nowMs >= end)) return Object.freeze({ policy_state: "POLICY_INVALID", decision: "HOLD", reason: "OUTSIDE_EFFECTIVE_INTERVAL" });
  const lineage = classifyPolicyLineage({ trustedHeadDigest, candidateDigest: candidate.content_digest,
    candidateParentDigest: candidate.parent_policy_digest, historicalDigests });
  if (lineage !== "DIRECT_SUCCESSOR") return Object.freeze({ policy_state: "POLICY_INVALID", decision: "HOLD", reason: lineage });
  return Object.freeze({ policy_state: "ACTIVE", decision: "ACCEPT", reason: "AUTHORIZED_CURRENT_SUCCESSOR", policy_digest: candidate.content_digest });
}

export function evaluatePolicyException({ targetControl, approvalAuthorized, now = new Date(), effectiveUntil = null }) {
  nonempty(targetControl, "targetControl");
  if (NON_WAIVABLE.has(targetControl)) {
    return Object.freeze({ decision: "REJECT_EXCEPTION", reason: "NON_WAIVABLE_CONTROL", control_remains_required: true });
  }
  if (!approvalAuthorized) return Object.freeze({ decision: "REJECT_EXCEPTION", reason: "UNAUTHORIZED_EXCEPTION_APPROVAL" });
  if (effectiveUntil != null && (now instanceof Date ? now.getTime() : Date.parse(now)) >= parseTime(effectiveUntil, "effectiveUntil")) {
    return Object.freeze({ decision: "REJECT_EXCEPTION", reason: "EXCEPTION_EXPIRED" });
  }
  return Object.freeze({ decision: "ACCEPT_EXCEPTION", reason: "AUTHORIZED_EXCEPTION", control_remains_required: false });
}
