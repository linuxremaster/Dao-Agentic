function stringSet(xs, name) {
  if (!Array.isArray(xs) || xs.some((x) => typeof x !== "string" || !x)) throw new TypeError(`${name} must be string array`);
  return new Set(xs);
}
export function evaluateSupplyChain({
  attestationSignatureValid,
  builder,
  builderTrust,
  expectedSteps = [],
  observedSteps = [],
  sourceTrusted = true,
  artifactDigestMatches = true,
  deploymentBindingMatches = true,
} = {}) {
  const expected = stringSet(expectedSteps, "expectedSteps");
  const observed = stringSet(observedSteps, "observedSteps");
  const missingSteps = [...expected].filter((x) => !observed.has(x)).sort();
  const builderTrusted = builderTrust === "TRUSTED" || builderTrust === "ACTIVE";
  const trusted = attestationSignatureValid === true && builderTrusted && sourceTrusted === true
    && artifactDigestMatches === true && deploymentBindingMatches === true && missingSteps.length === 0;
  return Object.freeze({
    builder: builder ?? null,
    component_trusted: trusted,
    decision: trusted ? "ACCEPT" : "REJECT",
    missing_steps: Object.freeze(missingSteps),
    reason: !attestationSignatureValid ? "INVALID_ATTESTATION_SIGNATURE"
      : !builderTrusted ? "UNTRUSTED_OR_REVOKED_BUILDER"
      : missingSteps.length ? "MISSING_REQUIRED_BUILD_STEP"
      : !sourceTrusted ? "UNTRUSTED_SOURCE_ROOT"
      : !artifactDigestMatches ? "ARTIFACT_DIGEST_MISMATCH"
      : !deploymentBindingMatches ? "DEPLOYMENT_BINDING_MISMATCH" : "SUPPLY_CHAIN_POLICY_PASS",
  });
}
