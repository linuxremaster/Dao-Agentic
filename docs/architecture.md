# Deterministic control spine

Dao-Agentic currently implements two executable deterministic mechanisms:

```
task event history -> hard admission predicates -> pure reducer
                  -> materialized lifecycle state -> replay / recovery

lease event history -> temporary role leases
                   -> exact action-scoped authority grants
                   -> deterministic allow/deny decision
                   -> persisted decision record
```

Nothing in this document is promoted by status language. The implementation and its
observed test results are the evidence for the mechanisms described here.

## Task lifecycle

An event contains exactly `event_id`, `sequence`, `kind`, and `payload`.
`contracts/event.schema.json` describes its wire shape. Runtime validation rejects
invalid event structure, non-finite payload numbers, duplicate IDs, noncontiguous
sequences, and unspecified lifecycle transitions.

| Current status | Event | Next status |
| --- | --- | --- |
| NEW | TASK_ADMITTED | ADMITTED |
| ADMITTED | TASK_READY | READY |
| READY | WORK_STARTED | RUNNING |
| RUNNING | OUTPUT_READY | VERIFYING |
| RUNNING | HOLD_ENTERED | HOLD |
| VERIFYING | VERIFICATION_PASSED | VERIFIED |
| VERIFYING | VERIFICATION_FAILED | HOLD |
| VERIFYING | HOLD_ENTERED | HOLD |
| HOLD | RECOVERY_COMPLETED | READY |
| VERIFIED | CHECKPOINTED | DONE |

Every other transition is rejected. Payload claims do not select transitions.

## Leased roles and authority

The executable authority path contains no standing authority role.

A role lease is descriptive only. It has a subject, role, scope, issue sequence and
mandatory expiry sequence. It may be released early. The authority evaluator never
reads role leases.

An authority grant binds exactly:

```
subject + action + target + scope + required evidence + expiry
```

Wildcards are rejected. Grants may be released before expiry. If no currently valid
exact grant exists, the result is `NO_VALID_GRANT`.

Authority requests have a strict field set. Extra fields such as `role`, `title`,
`claimed_authority`, or `authorized_by` are rejected rather than interpreted.
This makes authoritative wording and status cues mechanically irrelevant to positive
authorization.

`AUTHORITY_DECIDED` records are self-checking: replay recomputes the decision from
the prior grant state and rejects a recorded allow/deny result that does not match.
`scripts/lease_ledger.py` replays the complete JSONL ledger before append and fsyncs
accepted events.

See `docs/leases.md` and `contracts/lease-event.schema.json`.

## Cross-runtime conformance boundary

`contracts/conformance/` contains checked-in observable fixtures used by both the
Python reference and JavaScript lifecycle implementation. Ordinary lifecycle,
validation, nested ordering, strings, Unicode values, and representable numeric cases
currently agree, including matching history hashes.

The existing WO-001 byte-stable JSON encoding is not language-neutral for the full
event contract because Python and native JavaScript differ on some number
representations. Numeric/hash parity therefore remains `HOLD`.

The term "canonical" remains in some legacy function names for deterministic byte
normalization only. It conveys no project authority, truth status, implementation
status, or privileged artifact standing.

## Hashing and boundaries

History hashes commit to admitted event order. They are not signatures and do not
make payload claims true.

The deterministic reducers consult no model or natural-language authority cue.
The task lifecycle core performs no filesystem or network I/O. Lease persistence is
provided separately by the stdlib-only JSONL ledger wrapper. Producers remain
responsible for the truth of external observations; structural admission does not
manufacture facts.
