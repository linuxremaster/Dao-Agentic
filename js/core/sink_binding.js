function same(a, b) { return typeof a === "string" && a.length > 0 && a === b; }

export function validateSinkAtEffect({ decision, actual, now = new Date() } = {}) {
  if (!decision || !actual) throw new TypeError("decision and actual are required");
  const expiry = decision.expires_at ? Date.parse(decision.expires_at) : null;
  const expired = expiry !== null && Number.isFinite(expiry) && now.getTime() >= expiry;
  const fields = [
    ["registered_tool_id", "registered_tool_id"],
    ["tool_artifact_digest_or_remote_identity", "tool_artifact_digest_or_remote_identity"],
    ["resolved_resource_binding", "resolved_resource_binding"],
    ["canonical_argument_hash", "canonical_argument_hash"],
    ["authorization_decision_id", "authorization_decision_id"],
    ["action_dependency_decision_id", "action_dependency_decision_id"],
  ];
  const mismatches = fields.filter(([a,b]) => decision[a] !== undefined && actual[b] !== undefined && !same(decision[a], actual[b])).map(([a]) => a);
  const valid = decision.sink_decision_valid_before !== false && !expired && mismatches.length === 0;
  return Object.freeze({
    sink_decision_valid: valid,
    side_effect_allowed: valid,
    revalidation_required: !valid,
    mismatch_fields: Object.freeze(mismatches),
    reason: expired ? "SINK_DECISION_EXPIRED" : mismatches.length ? "RESOURCE_OR_BINDING_CHANGED" : valid ? "SINK_BINDING_VALID" : "SINK_DECISION_INVALID",
  });
}
