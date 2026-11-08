# Universal leases and action authority

This runtime deliberately has **no standing authority roles** and treats permanence as the exception.

```text
PERMANENCE = EXCEPTION
LEASE = DEFAULT
```

## Two different things called "permission"

The runtime keeps generic leases separate from action authority.

- A generic lease is temporary scoped state for an explicit subject, lease class, resource, scope and purpose.
- An authority grant is temporary permission for one exact `subject + action + target + scope`.
- A generic lease never makes `decide_authority()` / `decideAuthority()` return `ALLOW`.
- Role names, titles, task ownership, tool-access labels, seniority, confidence, rhetoric, consensus and identity labels are not authority inputs.

Generic leases can represent things such as `ROLE`, `TASK`, `CAPABILITY`, `TOOL_ACCESS`, `BUS_ACCESS`, `WAKE_RIGHT`, `RESOURCE_LOCK`, `CREDENTIAL_USE`, `AUDIENCE_MEMBERSHIP`, or a new explicit lease class introduced by a subsystem. The class is intentionally extensible; the reducer does not silently assign semantics to unknown classes.

A universal lease is exactly:

```json
{
  "lease_id": "task-17-holder-002",
  "subject": "SOC-THREAD-DEV-003",
  "lease_class": "TASK",
  "resource": "TASK-17",
  "scope": "linuxremaster/Dao-Agentic",
  "purpose": "implement-and-test",
  "expires_sequence": 40
}
```

No wildcard subject/class/resource/scope/purpose is accepted. Every lease has mandatory logical-sequence expiry and can be released earlier.

## Rotation

Rotation is **release old, then grant new**. The rotation helper preserves lease class, resource and scope. It may change the holder, purpose and expiry. Changing the meaning or scope of a lease is a fresh lease, not a rotation. The administrative CLI pre-validates both rotation events before appending them together, so an invalid replacement cannot release the old holder first.

```text
old lease
  -> LEASE_RELEASED
  -> LEASE_GRANTED with a new lease_id
```

This prevents a rotation operation from becoming a privilege-expansion shortcut.

Legacy `ROLE_LEASE_GRANTED` records remain replayable. A legacy role can rotate into the universal form as `lease_class=ROLE` with the role name in `resource`.

Authority rotation remains separate: release/expire the old authority grant, then admit a new exact grant through the authenticated operator-mandate path. Generic lease rotation cannot create `AUTHORITY_GRANTED`.

## Event kinds

`LEASE_GRANTED`, `LEASE_RELEASED`, `ROLE_LEASE_GRANTED`, `ROLE_LEASE_RELEASED`, `AUTHORITY_GRANTED`, `AUTHORITY_RELEASED`, `AUTHORITY_DECIDED`.

The role-specific events are retained for historical replay compatibility. New non-authority assignments should normally use the universal lease events.

## Derived roster

The roster is a **view of active lease state**, not a second registry and not an authority source.

`scripts/lease_ledger.py roster` materializes, at one explicit logical sequence:

- active `ROLE` leases (including replay-compatible legacy role leases),
- active non-role assignments such as `TASK`, `TOOL_ACCESS`, or `WAKE_RIGHT`,
- active exact action-authority grants admitted through the authority path.

Expired and released items are omitted. Rows are keyed by subject and sorted deterministically.
The roster never turns a role into authority; it only places the two kinds of active state next
to each other so humans and agents can see who currently holds what.

```sh
python scripts/lease_ledger.py roster state/leases.jsonl \
  --scope linuxremaster/Dao-Agentic

python scripts/lease_ledger.py roster state/leases.jsonl \
  --subject SOC-THREAD-DEV-002 \
  --sequence 42
```

Identity binding remains outside this ledger. Subjects such as routing labels must still be
resolved through the project's identity/registry evidence. `ROSTER ROW != VERIFIED IDENTITY`.

## Administrative CLI

`scripts/lease_ledger.py` can grant, release, rotate, replay and inspect generic leases:

```sh
python scripts/lease_ledger.py lease state/leases.jsonl \
  --event-id lease-event-001 \
  --lease-id task-17-holder-001 \
  --subject SOC-THREAD-DEV-003 \
  --lease-class TASK \
  --resource TASK-17 \
  --scope linuxremaster/Dao-Agentic \
  --purpose implement-and-test \
  --expires-sequence 40

python scripts/lease_ledger.py rotate state/leases.jsonl \
  --lease-id task-17-holder-001 \
  --release-event-id release-001 \
  --grant-event-id lease-event-002 \
  --new-lease-id task-17-holder-002 \
  --new-subject SOC-THREAD-DEV-001 \
  --expires-sequence 60
```

This CLI is an administrative persistence surface, **not an authentication boundary**. If an agent runtime can write the lease ledger, it can forge non-authority lease state. Production deployment must therefore make the ledger writable only by the trusted gateway/operator side before any subsystem treats generic lease classes as enforceable access control.

Raw `AUTHORITY_GRANTED` append remains forbidden by the supported ledger CLI. New action authority enters through `js/scripts/mandate_gate.js` after operator-signature verification.

## Enforcement boundary

A subsystem that wants lease-controlled behavior must explicitly query an exact active lease. Examples:

```text
scheduler -> require WAKE_RIGHT lease
bus       -> require BUS_ACCESS lease
router    -> require TASK or ROLE lease
adapter   -> may require TOOL_ACCESS lease
```

For consequential side effects, the lease check is additive, not a replacement for exact action authority:

```text
required lease (if subsystem defines one)
AND
valid exact authority grant
AND
registered action adapter
-> side effect
```

No consequential capability exists merely because it existed previously. Historical leases remain evidence; only a currently active lease has current lease meaning.
