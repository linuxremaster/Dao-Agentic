export function evaluateAssessmentDiversity(input = {}) {
  if (input.risk !== "R3_HIGH") return Object.freeze({ diversity_satisfied: true, decision: "CONTINUE" });
  const empirical = input.empirical_error_diversity_validated === true;
  const nonModel = input.human_or_deterministic_channel === true
    || (Array.isArray(input.channels) && input.channels.some((x) => x === "human" || x === "validated_deterministic"));
  const sharedFailure = input.shared_failure_mode_material === true;
  const enoughAutomated = Array.isArray(input.assessors) && input.assessors.length >= 2;
  const satisfied = !sharedFailure && (nonModel || (empirical && enoughAutomated));
  return Object.freeze({
    diversity_satisfied: satisfied,
    decision: satisfied ? "CONTINUE" : "ADJUDICATE_OR_HOLD",
    statistical_independence_claimed: false,
  });
}
