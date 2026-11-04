# Leased roles and authority

This runtime deliberately has **no standing authority roles**.

- A role lease is temporary descriptive state used for routing/coordination only.
- An authority grant is temporary permission for one exact `subject + action + target + scope`.
- Every role lease and authority grant has mandatory logical-sequence expiry and can be released earlier.
- Authority checks never read role, title, seniority, confidence, sender rhetoric, or consensus.
- Wildcard subjects/actions/targets/scopes are rejected.
- Optional evidence IDs are matched mechanically before a grant is valid.
- `AUTHORITY_DECIDED` events are recomputed during replay; a forged `allowed=true` record is rejected.

The persistent reference path is `scripts/lease_ledger.py`, an append-only JSONL ledger. The ledger records grants, releases and decisions. A record does not make its payload true; it proves only what the deterministic lease reducer admitted.

## Event kinds

`ROLE_LEASE_GRANTED`, `ROLE_LEASE_RELEASED`, `AUTHORITY_GRANTED`, `AUTHORITY_RELEASED`, `AUTHORITY_DECIDED`.

## Minimal example

Grant `agent-a` permission to merge one exact commit in one repository until logical sequence 10:

```json
{"event_id":"g1","sequence":1,"kind":"AUTHORITY_GRANTED","payload":{"grant_id":"merge-1","subject":"agent-a","action":"MERGE","target":"abc123","scope":"owner/repo","expires_sequence":10,"required_evidence":["audit-pass"]}}
```

Then the decision command emits and persists an `AUTHORITY_DECIDED` event from current state. Roles are not inputs to that decision.
