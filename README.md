# Dao-Agentic

Dao-Agentic is currently a **small executable deterministic control core**, not a claimed complete orchestration runtime.

```yaml
INTENT != ACTION
ACTION != OUTCOME
OUTCOME != VERIFIED SUCCESS
ROLE != AUTHORITY
TITLE != AUTHORIZATION
PERMANENCE != DEFAULT
```

Control semantics are intended to be language-independent. JavaScript is preferred
when it is the simplest adequate choice for browser-facing use, but it is not a
semantic authority or a hard language requirement. The Python 3.10+ standard-library
implementation remains the WO-001 executable reference while cross-runtime conformance
is evaluated.

## Universal leases and authority

There are no standing authority roles in the executable control path.

Generic assignments are temporary leases bound to an explicit subject, lease class,
resource, scope, purpose and logical expiry. The same primitive can represent roles,
tasks, capabilities, tool/bus/wake access, resource locks, credential-use designations,
audience membership and future explicit lease classes. Generic leases never grant
action authority by themselves.

Authority is a separate temporary grant bound to one exact subject, action, target,
scope and mandatory logical expiry. Role names, titles, task ownership, generic lease
labels, seniority, confidence, sender rhetoric, consensus and identity labels are not
inputs to the authority decision.

Lease rotation is release-old then grant-new with a new lease ID. Rotation preserves
lease class, resource and scope so it cannot be used as a privilege-expansion shortcut.
Authority rotation remains on the authenticated mandate path.

The Python and JavaScript lifecycle reducers reject caller-forged materialized state,
and the lease reducers reject wildcards, expired/released grants, missing required
evidence, authority-shaped extra fields, and forged `AUTHORITY_DECIDED` events.
`scripts/lease_ledger.py` provides append-only JSONL persistence, generic lease
grant/release/rotation and replay, but is an administrative persistence surface rather
than an authentication boundary. Production deployments must keep the lease ledger
unwritable by untrusted agent runtimes before consuming generic leases as access
control. Raw `AUTHORITY_GRANTED` admission remains forbidden; new authority must
enter through the operator-signed mandate gate.

`js/scripts/policy_gate.js` emits and persists an exact policy decision and exits
non-zero on denial. The trusted adapter registry prevents callers from supplying
arbitrary execution callbacks. The relay adapter binds publishing to exact content
bytes; the GitHub adapter binds merging to an exact PR head SHA and deployment-owned
repository. Registered actions execute only after authorization and write
tamper-evident pending/final action receipts.

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

See [architecture](docs/architecture.md), [universal leases and authority](docs/leases.md),
[conformance evidence](docs/conformance.md), and
[operating predicates](docs/operating-predicates.md).
