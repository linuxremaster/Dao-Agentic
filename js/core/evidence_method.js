export function evaluateEvidenceMethod(record = {}) {
  const required = [
    "domain_applicability", "validation_evidence", "known_reliability",
    "required_critical_domains", "version", "limitations", "decision_semantics", "approval_authority",
  ];
  const missing = required.filter((k) => {
    const v = record[k];
    return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  });
  const methodAdmissible = record.approved === true && missing.length === 0;
  return Object.freeze({ method_admissible: methodAdmissible, missing_fields: Object.freeze(missing) });
}
