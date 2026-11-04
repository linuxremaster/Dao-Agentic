# Operator-signed relay requirements v0.1 — conformance map

This document maps the normative requirements to executable repository controls. It does not claim that repository code alone can enforce operating-system or external-system permissions.

| Requirement area | Enforcement | Evidence |
| --- | --- | --- |
| Relay is transport, not authority | CODE | Carrier identity is absent from mandate verification and authority decisions. |
| Operator private key unavailable to model instances | OPERATOR/DEPLOYMENT + REPO HYGIENE | Private key is not committed; .gitignore excludes operator private-key patterns. |
| Public key pinned / key ID explicit / revocation supported | CODE | `config/operator-trust.json`; verifier selects one explicit `kid` and requires `ACTIVE`. |
| Complete authorization payload signed | CODE | Compact EdDSA JWS signs protected header + canonical mandate payload. |
| Deterministic canonical serialization | CODE | Signing canonicalizes JSON; verification rejects validly signed non-canonical encodings. |
| Signature / key / algorithm checks | CODE | `verifyMandate` fail-closes and exposes deterministic check results. |
| Expected issuer | CODE | Caller must provide `--issuer`; mismatch yields `WRONG_ISSUER` / HOLD. |
| Freshness | CODE | issued/not-before/expiry checks are deterministic. |
| Audience | CODE | Expected audience is explicit; mismatch holds. |
| Exact action scope | CODE | Signed grant is explicit and wildcard-free; `policy_gate.js` requires exact subject/action/target/scope/evidence match. |
| Replay protection | CODE | Mandate ID and nonce are persisted and checked before admission. |
| Durable verification record | CODE | Verification JSONL records per-check results, disposition, admission action and result. |
| Raw unsigned grant admission rejected | CODE | Generic lease-ledger append refuses `AUTHORITY_GRANTED`. |
| Failed state cannot be promoted by model interpretation | CODE | Gate/policy outputs are deterministic and denial exits non-zero. |
| Truth remains separate from authority | DESIGN INVARIANT | Signature authenticates origin/scope only; evidence remains separately required. |
| Verification log cannot be silently rewritten | DEPLOYMENT BOUNDARY | Repository appends only; OS/storage permissions or immutable logging are still required against direct file rewrite. |
| Execute only if authorized | ADAPTER BOUNDARY | Side-effect adapters must invoke policy gate and stop on non-zero. |
| Persist external action result | ADAPTER BOUNDARY | Concrete side-effect adapters must persist their external-system result; the generic policy primitive persists the authorization decision. |

## Signed-envelope terminology

The executable v0.1 contract predates the requirements document's field names. The semantic mapping is:

- `message_id` → signed `mandate_id`
- `scope` → signed `grant.scope`
- `body` → signed exact `grant` object
- `operator_key_id` → protected JWS header `kid`
- `signature` → compact JWS signature segment

Changing these names would invalidate existing signed artifacts without improving the security property, so v0.1 retains the current wire names while enforcing the required semantics.

## No overclaim

Whole-environment conformance remains **PARTIAL** until deployment prevents direct ledger/log rewrites and each concrete side-effect adapter both gates execution and persists its actual outcome.
