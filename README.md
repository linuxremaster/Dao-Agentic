# Dao-Agentic

Dao-Agentic is currently a **small executable deterministic control core**, not a claimed complete orchestration runtime.

```yaml
INTENT != ACTION
ACTION != OUTCOME
OUTCOME != VERIFIED SUCCESS
ROLE != AUTHORITY
TITLE != AUTHORIZATION
```

Control semantics are intended to be language-independent. JavaScript is preferred
when it is the simplest adequate choice for browser-facing use, but it is not a
semantic authority or a hard language requirement. The Python 3.10+ standard-library
implementation remains the WO-001 executable reference while cross-runtime conformance
is evaluated.

## Leased roles and authority

There are no standing authority roles in the executable control path.

Roles are temporary descriptive leases. Authority is a separate temporary grant bound
to one exact subject, action, target, scope and mandatory logical expiry. Role names,
titles, seniority, confidence, sender rhetoric, consensus and identity labels are not
inputs to the authority decision.

The Python and JavaScript lease reducers reject wildcards, expired/released grants,
missing required evidence, authority-shaped extra fields, and forged
`AUTHORITY_DECIDED` events. `scripts/lease_ledger.py` provides append-only JSONL
persistence and replay, but rejects raw `AUTHORITY_GRANTED` admission. New authority
must enter through the operator-signed mandate gate. `js/scripts/policy_gate.js` emits
and persists an exact policy decision and exits non-zero on denial. The reference
`authorized_relay_publish.js` adapter binds a publish to exact content bytes, executes
only after authorization, and writes a tamper-evident pending/final action receipt.

The existing lifecycle conformance work still has unresolved Python/JavaScript numeric
serialization differences. Those remain `HOLD` evidence rather than being hidden
behind a compatibility rule.

Run the Python suite:

```sh
python -m unittest discover -s tests -v
```

Run the JavaScript suite with a modern Node runtime:

```sh
node --test js/tests/*.test.js
```

See [architecture](docs/architecture.md), [leased roles and authority](docs/leases.md),
[conformance evidence](docs/conformance.md), and
[operating predicates](docs/operating-predicates.md).
