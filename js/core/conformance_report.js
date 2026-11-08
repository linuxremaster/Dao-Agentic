const REQUIRED = Object.freeze([
  "conformance_report_id","spec_version","spec_artifact_digest","profile",
  "policy_artifact_ids_and_digests","component_source_and_build_digests",
  "supply_chain_policy_digest","execution_environment_identity","fixture_set_ids_and_hashes",
  "test_ids","per_test_results","coverage_benchmark_report","exceptions_and_approval_ids",
  "witness_policy_and_latest_observation","privacy_erasure_test_evidence","evaluator_identity",
  "report_created_at","report_digest","report_signer_key_id","report_signature","witness_checkpoint_id",
]);
export function evaluateConformanceClaim({ productClaim, conformanceReport, signatureValid = false, witnessValid = false } = {}) {
  if (!conformanceReport || typeof conformanceReport !== "object") {
    return Object.freeze({ conformance_state: "UNESTABLISHED", reason: "MISSING_CONFORMANCE_REPORT", product_claim: productClaim ?? null });
  }
  const missing = REQUIRED.filter((k) => conformanceReport[k] === undefined || conformanceReport[k] === null);
  if (missing.length || conformanceReport.spec_version !== "1.3" || conformanceReport.profile !== "CORE_CONFORMANT") {
    return Object.freeze({ conformance_state: "CONFORMANCE_INCOMPLETE", missing_fields: Object.freeze(missing) });
  }
  if (!signatureValid || !witnessValid) return Object.freeze({ conformance_state: "CONFORMANCE_INVALID", reason: !signatureValid ? "REPORT_SIGNATURE_INVALID" : "REPORT_WITNESS_INVALID" });
  return Object.freeze({ conformance_state: "CONFORMANCE_VALID" });
}
