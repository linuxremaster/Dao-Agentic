# Deterministic control spine

The core implements one task lifecycle, using Python 3.10+ and the standard library:

```
append-only event history -> hard admission predicates -> pure reducer
                         -> materialized state -> replay / recovery
```

An event is a plain dictionary containing exactly `event_id`, `sequence`, `kind`,
and `payload`. `contracts/event.schema.json` describes its wire shape. Runtime
validation additionally rejects non-JSON Python objects, non-string object keys,
non-finite numbers, cycles, booleans as sequences, duplicate IDs, and noncontiguous
sequences. Sequence numbering starts at 1. IDs are unique across the full history.
The schema alone cannot enforce history-dependent admission.

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

Every other transition raises `AdmissionError`. Rejection does not change state.
`reduce(state, event)` returns a frozen `State` with status, last sequence, a
frozenset of admitted IDs, and a history hash. Caller-owned payloads are not retained.
Payload claims do not select transitions; only admitted event kinds do.

Canonical JSON uses recursively sorted keys, compact separators, ASCII escapes,
and finite numbers. Arrays retain order. Integers and floats retain their encoding
distinctions; this is a Python JSON convention, not an RFC 8785 implementation.
The initial hash is SHA-256 of empty bytes. Each subsequent hash is SHA-256 of
`previous_digest_bytes + canonical_event_utf8`. This commits to the complete
ordered history; it is neither a signature nor evidence that a claim is true.

The caller retains the append-only event sequence. The core has no storage or
append API that can rewrite history, and cannot enforce a caller's storage policy.
`replay(events)` reconstructs state from NEW, admitting every event again. There
is no snapshot trust shortcut. Process recovery uses replay; lifecycle recovery
uses RECOVERY_COMPLETED from HOLD and returns to READY. CHECKPOINTED changes
VERIFIED to DONE; it does not write a file or database snapshot.

The reducer and its helpers perform no external I/O and consult no clock,
randomness, model, environment, or external facts. External observations can enter
only as event data. Producers are responsible for the truth of verification and
recovery observations; this spine validates structure and ordering, not semantic
correctness. Tests passing demonstrate these structural properties only.
