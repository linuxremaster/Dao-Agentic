const MAP = Object.freeze({
  SUPPORTED: { must_disclose_conflict: false, must_not_emit_unqualified_certainty: false, label: "supported" },
  QUALIFIED: { must_disclose_conflict: false, must_not_emit_unqualified_certainty: true, label: "qualified" },
  MIXED: { must_disclose_conflict: true, must_not_emit_unqualified_certainty: true, label: "mixed evidence" },
  NOT_RUN_MISSING_EVIDENCE: { must_disclose_conflict: false, must_not_emit_unqualified_certainty: true, label: "evidence not established" },
  HOLD: { must_disclose_conflict: false, must_not_emit_unqualified_certainty: true, label: "held" },
});
export function projectPresentation({ epistemicState, presentationPolicy } = {}) {
  if (presentationPolicy !== "PP-1.3.0") throw new TypeError("unsupported presentation policy");
  const rule = MAP[epistemicState];
  if (!rule) throw new TypeError(`unsupported epistemic state: ${epistemicState}`);
  return Object.freeze({ ...rule, policy_version: presentationPolicy });
}
