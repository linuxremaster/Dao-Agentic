const ADVERSE = new Set(["RETRACTED", "EXPRESSION_OF_CONCERN", "MATERIAL_REVISION", "CORRECTED_MATERIALLY"]);
export function applySourceStatusChange({ risk, claimState, sourceStatusChange } = {}) {
  const adverse = ADVERSE.has(sourceStatusChange);
  const high = risk === "R3_HIGH";
  const reevaluation = adverse && (high || claimState === "SUPPORTED" || claimState === "SUPPORTED_UNQUALIFIED");
  return Object.freeze({
    reevaluation_enqueued: reevaluation,
    claim_state: reevaluation ? "REVALIDATION_REQUIRED" : claimState,
    unqualified_support_allowed: !reevaluation,
  });
}
