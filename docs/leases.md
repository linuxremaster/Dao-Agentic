# Leased roles and authority

This runtime deliberately has **no standing authority roles**.

- A role lease is temporary descriptive state used for routing/coordination only.
- An authority grant is temporary permission for one exact `subject + action + target + scope`.
- Every role lease and authority grant has mandatory logical-sequence expiry and can be released earlier.
- Authority checks never read role, title, seniority, confidence, sender rhetoric, or consensus.
- Wildcard subjects/actions/targets/scopes are rejected.
- Optional evidence IDs are matched mechanically before a grant is valid.
- `AUTHORITY_DECIDED` events are recomputed during replay; a forged `allowed=true` record is rejected.

The persistent reference path is `scripts/lease_ledger.py`, an append-only JSONL ledger. The ledger records grants, releases and decisions. A record does not make its payload true; it proves only what the deterministic lease reducer admitted. The supported CLI ingress rejects raw `AUTHORITY_GRANTED` appends; new authority grants must enter through `js/scripts/mandate_gate.js` after operator-signature verification. Historical ledgers remain replayable.

## Event kinds

`ROLE_LEASE_GRANTED`, `ROLE_LEASE_RELEASED`, `AUTHORITY_GRANTED`, `AUTHORITY_RELEASED`, `AUTHORITY_DECIDED`.

## Minimal example

Grant `agent-a` permission to merge one exact commit in one repository until logical sequence 10:

```json
{"event_id":"g1","sequence":1,"kind":"AUTHORITY_GRANTED","payload":{"grant_id":"merge-1","subject":"agent-a","action":"MERGE","target":"abc123","scope":"owner/repo","expires_sequence":10,"required_evidence":["audit-pass"]}}
```

Then the decision command emits and persists an `AUTHORITY_DECIDED` event from current state. Roles are not inputs to that decision.


## Enforcement boundary

Authority admission and action enforcement are separate fail-closed steps.

1. `js/scripts/mandate_gate.js` authenticates an operator-signed mandate and is the supported path for admitting a new `AUTHORITY_GRANTED` event.
2. `js/scripts/policy_gate.js decide` evaluates an exact subject/action/target/scope/evidence request against current state, persists the self-checking `AUTHORITY_DECIDED` event, prints `ALLOW` or `DENY`, and exits non-zero on denial.
3. Side-effect adapters must treat a non-zero policy-gate exit as a hard stop. The generic reducer cannot itself prevent a process with direct filesystem or external-system access from bypassing the reference ingress; deployment permissions must prevent out-of-band writes/actions.

Example:

```sh
node js/scripts/policy_gate.js decide \
  --lease-ledger state/leases.jsonl \
  --event-id decision-001 \
  --request-id request-001 \
  --subject SOC-THREAD-070 \
  --action RELAY_PUBLISH \
  --target OPERATOR-TRUST-BOOTSTRAP-070-001 \
  --scope dao-agentic-relay/outbox
```

Exit status `0` means an exact live grant allowed the request. Exit status `3` means policy denied it.
