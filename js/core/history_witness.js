export class HistoryWitnessError extends Error {
  constructor(message) { super(message); this.name = "HistoryWitnessError"; }
}

function finiteNonnegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new HistoryWitnessError(`${name} must be a non-negative finite number`);
  return value;
}
function nonempty(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new HistoryWitnessError(`${name} must be a non-empty string`);
  return value;
}

export function detectHistoryFork({ predecessor, successors, compatible }) {
  nonempty(predecessor, "predecessor");
  if (!Array.isArray(successors) || successors.length < 2) throw new HistoryWitnessError("successors must contain at least two entries");
  const valid = successors.filter((s) => s && s.valid === true && typeof s.id === "string" && s.id.length > 0);
  if (valid.length >= 2 && compatible === false) {
    return Object.freeze({ history_state: "FORK_DETECTED", preserve_both_branches: true, branch_dependent_action: "HOLD",
      predecessor, branches: Object.freeze(valid.map((x) => x.id)) });
  }
  return Object.freeze({ history_state: "NORMAL", preserve_both_branches: false, branch_dependent_action: "ALLOW_IF_OTHER_GATES_PASS" });
}

export function evaluateHistoryWitness({
  localForwardSecure = false,
  externalMonotonicHead = false,
  maxUnwitnessedEvents = null,
  eventsSinceWitness = null,
  maxCrossViewIntervalS = null,
  secondsSinceCrossView = null,
  witnessAvailable = true,
  requireCurrentWitnessForR3 = true,
} = {}) {
  let state = "NORMAL";
  const reasons = [];
  if (!externalMonotonicHead) { state = "DEGRADED_HISTORY"; reasons.push("NO_EXTERNAL_MONOTONIC_HEAD"); }
  if (maxUnwitnessedEvents != null || eventsSinceWitness != null) {
    finiteNonnegative(maxUnwitnessedEvents, "maxUnwitnessedEvents"); finiteNonnegative(eventsSinceWitness, "eventsSinceWitness");
    if (eventsSinceWitness > maxUnwitnessedEvents) { state = "DEGRADED_HISTORY"; reasons.push("MAX_UNWITNESSED_EVENTS_EXCEEDED"); }
  }
  if (maxCrossViewIntervalS != null || secondsSinceCrossView != null) {
    finiteNonnegative(maxCrossViewIntervalS, "maxCrossViewIntervalS"); finiteNonnegative(secondsSinceCrossView, "secondsSinceCrossView");
    if (secondsSinceCrossView > maxCrossViewIntervalS) { state = "DEGRADED_HISTORY"; reasons.push("MAX_CROSS_VIEW_INTERVAL_EXCEEDED"); }
  }
  if (!witnessAvailable) { state = "DEGRADED_HISTORY"; reasons.push("WITNESS_UNAVAILABLE"); }
  return Object.freeze({
    local_forward_secure: Boolean(localForwardSecure),
    external_monotonic_head: Boolean(externalMonotonicHead),
    core_history_assurance: state === "NORMAL" && externalMonotonicHead,
    history_state: state,
    reasons: Object.freeze(reasons),
    r3_side_effect: state === "DEGRADED_HISTORY" && requireCurrentWitnessForR3 ? "HOLD" : "ALLOW_IF_OTHER_GATES_PASS",
  });
}

export function makeCrossViewObservation({ observerId, lineageHead, witnessProof, observedAt, comparedViews, consistencyResult, witnessPolicyVersion }) {
  nonempty(observerId, "observerId"); nonempty(lineageHead, "lineageHead"); nonempty(witnessProof, "witnessProof");
  nonempty(observedAt, "observedAt"); nonempty(consistencyResult, "consistencyResult"); nonempty(witnessPolicyVersion, "witnessPolicyVersion");
  if (!Array.isArray(comparedViews)) throw new HistoryWitnessError("comparedViews must be an array");
  return Object.freeze({ event_type: "CROSS_VIEW_OBSERVED", observer_id: observerId, lineage_head: lineageHead,
    witness_proof: witnessProof, observed_at: observedAt, compared_views: Object.freeze([...comparedViews]),
    consistency_result: consistencyResult, witness_policy_version: witnessPolicyVersion });
}
