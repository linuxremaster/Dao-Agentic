# Deterministic control spine

Dao-Agentic currently implements one task lifecycle as a small deterministic core:

```
append-only event history -> hard admission predicates -> pure reducer
                         -> materialized state -> replay / recovery
```

The control semantics are intended to be language-independent. The verified WO-001
reference is implemented in Python 3.10+ using only the standard library. WO-002R
adds a browser-compatible JavaScript conformance candidate using standards-based ES
modules and browser-safe APIs. JavaScript is preferred when it is the simplest
adequate implementation, but language preference does not define semantic authority.

An event contains exactly `event_id`, `sequence`, `kind`, and `payload`.
`contracts/event.schema.json` describes its wire shape. Runtime validation rejects
invalid event structure, non-finite payload numbers, duplicate IDs, noncontiguous
sequences, and unspecified lifecycle transitions. The schema alone cannot enforce
history-dependent admission.

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

Every other transition is rejected. Rejection does not promote state. Payload claims
do not select transitions; only admitted event kinds do.

## Conformance boundary

`contracts/conformance/` contains checked-in observable fixtures used by both the
Python reference and JavaScript candidate. Ordinary lifecycle, validation, nested
ordering, strings, Unicode values, and representable numeric cases currently agree,
including matching history hashes.

The existing WO-001 canonical encoding is not language-neutral for the full event
contract. It uses Python JSON number semantics. Native browser JavaScript loses or
normalizes distinctions including:

- sequence `1.0` versus integer `1` after `JSON.parse`;
- payload `1.0` versus `1`;
- `-0.0` versus `0`;
- some exponent spellings;
- integers outside JavaScript's exact safe-integer range.

WO-002R therefore leaves canonicalization/hash parity in `HOLD`. It does not change
the Python reference, narrow the contract, or invent a replacement canonicalization
standard merely to obtain a passing result. See `docs/conformance.md`.

## Hashing

WO-001 canonical JSON uses recursively sorted keys, compact separators, ASCII
escapes, and finite numbers under Python's JSON encoding. The initial history hash
is SHA-256 of empty bytes. Each next hash is SHA-256 of
`previous_digest_bytes + canonical_event_utf8`.

This commits to the ordered history; it is neither a signature nor evidence that a
payload claim is true. Where the JavaScript candidate produces exactly the same
canonical bytes, it reproduces the same history hash.

## Boundaries

The deterministic core performs no filesystem or network I/O and consults no clock,
randomness, model, environment, or external facts. The JavaScript core likewise uses
no DOM, filesystem, `process`, Node `Buffer`, Node-only crypto import, or framework
runtime; it uses browser-standard `TextEncoder` and Web Crypto hashing.

The caller still retains event history. Persistence is intentionally deferred until
cross-runtime canonical semantics are resolved. Producers remain responsible for the
truth of verification and recovery observations. Structural conformance does not
establish semantic correctness.
