const CLASSES = new Set(["PREFERENCE_DEFINED", "EVIDENCE_DEPENDENT", "MIXED", "DEPENDENCY_UNCERTAIN"]);

export function evaluateActionDependency({ dependencyClass, evidenceSatisfied = false, riskClass = "R1_LOW", decisionId = null } = {}) {
  if (!CLASSES.has(dependencyClass)) return Object.freeze({ decision: "HOLD", reason: "INVALID_DEPENDENCY_CLASS", dependency_class: dependencyClass ?? null });
  if (dependencyClass === "DEPENDENCY_UNCERTAIN") return Object.freeze({ decision: "HOLD", reason: "DEPENDENCY_UNCERTAIN", dependency_class: dependencyClass });
  if ((dependencyClass === "EVIDENCE_DEPENDENT" || dependencyClass === "MIXED") && evidenceSatisfied !== true) {
    return Object.freeze({ decision: "HOLD", reason: "EVIDENCE_PREDICATE_UNSATISFIED", dependency_class: dependencyClass });
  }
  return Object.freeze({ decision: "PASS", reason: "DEPENDENCY_GATE_SATISFIED", dependency_class: dependencyClass, risk_class: riskClass, decision_id: decisionId });
}
