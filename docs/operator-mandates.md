# Operator-signed action mandates

Status: implemented on `main`. This adds authenticated operator provenance to the existing exact action-scoped authority path. It does not make signed claims true and does not create standing authority.

## Boundary

```
operator private key -> signed action mandate -> relay/carrier
                    -> deterministic mandate gate
                    -> AUTHORITY_GRANTED event
                    -> existing lease reducer / ledger
                    -> exact authority decision
```

The relay is transport. Carrier identity is not an authority input. A signature authenticates the signed issuer/key and payload; the existing lease reducer decides whether a later exact action request is authorized by a live grant.

## Cryptographic profile

The v0.1 implementation uses compact JWS-style signing with Ed25519 (`alg=EdDSA`) through Node's built-in crypto implementation. The protected header is exactly:

```json
{"alg":"EdDSA","kid":"<operator-key-id>","typ":"dao-action-mandate+jws"}
```

The signed payload is exactly (the environment-requirements term `message_id` maps to `mandate_id`; `body` maps to the signed exact `grant`; `operator_key_id` maps to protected-header `kid`):

```json
{
  "version": "0.1",
  "mandate_id": "...",
  "issuer": "operator",
  "audience": ["SOC-THREAD-070"],
  "issued_at": "2026-11-04T20:00:00Z",
  "not_before": "2026-11-04T20:00:00Z",
  "expires_at": "2026-11-04T21:00:00Z",
  "nonce": "...",
  "grant": {
    "grant_id": "...",
    "subject": "SOC-THREAD-070",
    "action": "IMPLEMENT",
    "target": "signed-mandate-gate",
    "scope": "linuxremaster/Dao-Agentic",
    "expires_sequence": 10,
    "required_evidence": []
  }
}
```

No wildcard subject/action/target/scope is accepted. Extra fields are rejected. The gate checks signature, active pinned key, allowed algorithm, expected issuer, audience, UTC validity window, deterministic canonical serialization, mandate ID/nonce replay, payload integrity, and logical grant expiry before emitting an `AUTHORITY_GRANTED` event. Exact requested-action scope is then enforced by the deterministic policy gate before a side-effect adapter may act.

## Files

- `js/core/mandates.js` — strict mandate contract, signing helper, verification, grant-event emission.
- `js/scripts/operator_mandate.js` — operator-side key generation/signing helper. Run only on an operator-controlled host; never expose the private key to an agent runtime.
- `js/scripts/mandate_gate.js` — deterministic receiver gate. It persists verification results and replay state, validates the emitted grant through the existing JS lease reducer, and appends the grant event to the lease ledger.
- `js/tests/mandates.test.js` — cryptographic/admission tests.

## Bootstrap

The public operator trust root is pinned in `config/operator-trust.json`.

The current active key is:

```text
kid: operator-2026-01
alg: EdDSA
status: ACTIVE
```

The private key is intentionally absent from the repository and must remain under operator control. A verifier should load the pinned public trust store from `config/operator-trust.json`; changing that trust root is itself a security-sensitive operation and must not be inferred from relay content.

## Operator-side example

Run on the operator-controlled machine, not in an agent runtime:

```sh
mkdir -p ~/.config/dao-agentic
chmod 700 ~/.config/dao-agentic

node js/scripts/operator_mandate.js keygen \
  --kid operator-2026-01 \
  --private ~/.config/dao-agentic/operator-private.pem \
  --public operator-public.pem \
  --trust-store operator-trust.json

chmod 600 ~/.config/dao-agentic/operator-private.pem

node js/scripts/operator_mandate.js sign \
  --kid operator-2026-01 \
  --private ~/.config/dao-agentic/operator-private.pem \
  --mandate mandate.json \
  --out mandate.jws
```

Transfer only the public trust store and the signed mandate to the verifier environment.

## Receiver-side example

```sh
node js/scripts/mandate_gate.js apply \
  --mandate mandate.jws \
  --trust-store config/operator-trust.json \
  --issuer operator \
  --audience SOC-THREAD-070 \
  --lease-ledger state/leases.jsonl \
  --replay-ledger state/mandate-replay.jsonl \
  --verification-log state/mandate-verification.jsonl
```

Success durably records verification/replay state and emits/appends the exact existing `AUTHORITY_GRANTED` event. Failure is fail-closed and emits no grant. Verification records expose signature, key, algorithm, issuer, freshness, audience, signed scope, replay, payload-integrity, canonicalization, disposition, attempted admission action, and admission result fields.

## Security limits

- `VALID SIGNATURE != TRUE CLAIM`.
- `VALID SIGNATURE != UNBOUNDED AUTHORITY`.
- A compromised operator private key defeats origin authentication until revoked/rotated.
- File locking is local-process cooperative locking, not a distributed consensus mechanism.
- The raw reducer remains a deterministic replay state machine. The supported ledger CLI now rejects raw `AUTHORITY_GRANTED` admission; new grants enter through the signed mandate gate. Direct file writes outside the supported ingress still require deployment-level filesystem controls.
- Cross-runtime byte canonicalization remains outside this v0.1 mandate gate; signing and verification are both performed by the JS implementation.

## Evidence basis

https://www.nist.gov/blogs/cybersecurity-insights/design-tenets-agent-identity-management-systems

https://csrc.nist.gov/pubs/ir/8587/final

https://csrc.nist.gov/pubs/sp/800/63/c/4/final

https://www.cyber.gov.au/publication/careful-adoption-of-agentic-ai-services

https://www.rfc-editor.org/rfc/rfc9421.html

https://ap2-protocol.org/ap2/agent_authorization/

https://ap2-protocol.org/ap2/specification/


## Environment-requirements conformance boundary

The repository carries the operator-signed relay environment requirements as a normative implementation checklist.

Current code-enforced boundary:

- Relay/carrier identity is not an authority input.
- Operator provenance requires a valid Ed25519 signature under the pinned trust root.
- Issuer and audience are explicit verifier inputs.
- Signed mandates must use deterministic canonical serialization.
- New authority grants cannot enter through the generic lease-ledger append CLI.
- Exact requested actions are evaluated by `policy_gate.js`; denial is non-zero/fail-closed.
- Replay identifiers and detailed verification evidence are persisted outside model memory.

Deployment boundary that code in this repository cannot guarantee by itself:

- `deployment_guard.js` detects operator-private-key files inside the runtime tree and group/world-writable protected state, but this is a preflight rather than proof of privilege separation.
- Action receipts can be hash-chained and verified, but same-privilege rewrite/recomputation still requires OS/storage separation or an external immutable anchor to prevent.
- `authorized_relay_publish.js` is a concrete reference adapter that derives an exact `message_id@sha256:<digest>` target, executes only after `ALLOW`, and persists pending/final receipts. Every other external action surface needs an equivalent trusted adapter or provider-side enforcement.
