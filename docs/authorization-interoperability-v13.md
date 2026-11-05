# SOCRATES v1.3 Authorization Interoperability Layer — bootstrap implementation

Status: LOCAL BOOTSTRAP COMPONENT; NOT AP2/FIDO CONFORMANCE; NOT CORE CONFORMANCE.

The authority boundary is separated into deterministic stages:

`PROFILE EVIDENCE -> PARSE/NORMALIZE -> AuthorizationCandidate -> VERIFY -> VerifiedAuthorization -> AUTHORIZE -> EffectiveAuthorization -> existing action broker`.

Normative invariants implemented by this component:

- `NORMALIZED != VERIFIED`
- `VERIFIED != EFFECTIVE`
- `EFFECTIVE != EXECUTED`
- `PROFILE PARSING SUCCESS != AUTHORITY`
- `CRYPTOGRAPHIC VALIDITY != POLICY PERMISSION`
- `AUTHORIZATION RECEIPT != EXECUTION RECEIPT`
- `PRESERVED CLAIM != INTERPRETED CLAIM != AUTHORIZATION SEMANTIC`
- `AUTHORITY(child) <= AUTHORITY(parent)`
- unknown authority-relevant extension semantics -> `HOLD`
- stale authorization -> `HOLD`
- unbound audience/action/resource/scope/acting-agent -> `HOLD`

## Bootstrap profile

`DAO-NATIVE-MANDATE-1` / profile version `0.1` adapts the existing signed native mandate. Parsing produces only unverified claims. Verification reuses the existing deterministic native mandate verifier and records the profile, source artifact digest, trust-store digest/version, signing key, algorithm, verification time, freshness and revocation basis, canonicalization profile, semantic handlers, and detailed verification checks.

Native v0.1 has no separate delegated proof-of-possession binding, so that fact is explicit as `NOT_BOUND_BY_PROFILE`; it is not synthesized.

## source_extensions

Profile-native claims required for audit/replay may be preserved as `source_extensions`. An extension marked authorization-relevant cannot affect authorization unless a deterministic versioned handler is supplied. Unknown authorization-relevant semantics fail closed. Unknown audit-only extensions are retained as `PRESERVED_UNINTERPRETED` and are authority-inert.

## Effective authorization

`authorizeVerifiedAuthorization` re-checks current temporal validity and logical-sequence expiry; exact audience, acting-agent, action, target, and scope binding; required evidence; delegation depth; and current active policy decisions. Only a successful decision returns an `EffectiveAuthorization`.

`effectiveAuthorityGrantEvent` accepts only `EffectiveAuthorization` and emits the existing `AUTHORITY_GRANTED` lease event consumed by the unchanged action broker. This demonstrates the interoperability boundary without redesigning execution, reconciliation, or telemetry.

## Compatibility boundary

The repository's pre-existing `authorityGrantEvent(legacyVerification, sequence)` path remains available for compatibility in this tranche. Therefore this component establishes the strict new path and its conformance tests, but does not yet prove that every runtime/CLI entrypoint is incapable of using the legacy bridge. Migrating those entrypoints is a separate closure step and must not be described as complete until done.

External AP2/FIDO/IETF/OpenID formats are intentionally not normative dependencies of this bootstrap implementation. They are future input profiles for this boundary.
