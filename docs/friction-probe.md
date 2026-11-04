# Friction Probe — WO-004 Phase B MVP slice

Status: **NON-CANONICAL, UNAUDITED.** Diagnostic evidence only.
FRICTION DETECTION != AUTHORITY · HIT != AUTHORITY TO ACT · NO_HIT != COMPLETE ACCOUNT ·
AVAILABLE CAPABILITY != AUTHORIZED ACTION.

Scope: issue #10, Phase B scope comments 6591831215 and 6591837070 (JavaScript only; smallest slice).
Source material: `docs/sources/friction-probe/` (transplanted byte-for-byte from
`wo-004b-friction-probe-sources` @ `a8232b0`; see `SOURCES.md`). Section numbers below refer to
`DAO_AGENTIC_FRICTION_PROBE_SPEC_v0.1.md`.

## Files

| Path | Role |
|---|---|
| `contracts/friction/friction_catalog.json` | Machine-readable record of implemented targets, modes and evidence requirements. This doc is a projection of it. |
| `js/friction/ingress.js` | Inert-input boundary (`parseInert`, `assertInert`). |
| `js/friction/probe.js` | Pure core: catalog checker, three probes, `screen(packet, catalog)`. |
| `contracts/friction/fixtures/*.json` | Frozen real-incident packets and synthetic controls. |
| `js/tests/friction.test.js` | Fixture, determinism, ingress and catalog negative-control tests (`npm run test:js`). |

## Boundary (spec §5)

```
connector/tool (host) -> normalized evidence packet D0 -> probe (pure) -> findings -> host authorization layer
```

The core reads nothing but its two arguments: no network, filesystem, clock, environment,
randomness, provider SDK or credentials. Providers (Drive, GitHub, …) stay behind the host's
connector layer, which builds the packet. No action-request envelope is defined in this slice;
nothing here executes or requests an action.

## Packet (spec §8.2)

Exactly: `packet_id`, `schema_version` (`"1.0"`), `scope`, `available_evidence`, `evidence`,
`provenance`. A source is eligible only if it is listed in `available_evidence` **and** present in
`evidence` as a non-empty object. Unknown evidence sources reject the packet.

## Verdicts (spec §9)

Exactly `HIT`, `NO_HIT`, `NOT_RUN_MISSING_EVIDENCE`. When no mode of a target is eligible, the
target yields one `NOT_RUN_MISSING_EVIDENCE` finding at locus `packet:<packet_id>` with `mode: null`.
When a mode runs but a locus lacks a needed fact, that locus is `NOT_RUN_MISSING_EVIDENCE`.
Missing evidence never becomes `NO_HIT`.

Every finding has `target_id`, `mode`, `locus`, `verdict`, plus `finding_id`
(`target|mode|locus`), `family_id`, `observed`, `expected`, `evidence_refs`, `probe_version`.
Findings are sorted by `target_id`, then `locus`; counts are derived.

## Implemented targets

| Target | Mode | Requires all | Locus | HIT when |
|---|---|---|---|---|
| FP01 Action/Authority Channel Mismatch | `channel_authority_check` | `authority_policy`, `relay_snapshot` | `action:<class>:<request_id>` | the request's host-observed channel is not in the policy's permitted channels for its action class, or the class is not established by the policy |
| FP03 Baseline/Head Drift (base-ancestry variant) | `base_ancestry_check` | `repository_snapshot`, `work_order` | `git-ref:<branch>` | a supplied ancestry observation says the branch head does not contain the work order's required base |
| FP07 Duplicate Single-Response Pickup | `single_response_check` | `relay_snapshot`, `relay_policy` | `relay:<parent_id>` | more than one active (non-superseded) reply exists for a parent the supplied policy marks single-response |

Evidence shapes used:

- `authority_policy.action_classes.<class>.permitted_channels: string[]`
- `relay_snapshot.requests: [{request_id, action_class, channel}]`, `relay_snapshot.messages: [{message_id, parent_message_id, file, supersedes?}]`
- `relay_policy.single_response_parents: string[]` (not in spec §8.3; added because FP07 requires a supplied expectation)
- `repository_snapshot.refs: {branch: sha}`, `repository_snapshot.ancestry: [{ancestor, descendant, is_ancestor}]` (the core cannot run git; ancestry is a provider observation)
- `work_order.branches: [{branch, required_base}]`

FP07 first excludes every message whose `message_id` is named by a nonempty string
`supersedes` by a message replying to the **same parent** in the supplied snapshot,
including intermediate members of correction chains. Links from other parents do not
suppress replies. Invalid same-parent links (self-reference, cycles, unknown targets,
empty or non-string supersession values) yield NOT_RUN_MISSING_EVIDENCE for that parent.
It then records active reply count, reply files and shared message_ids. Independent active
replies and duplicate deliveries still count separately. No original message is changed.
FP01 requests lacking a nonempty string `request_id`, or null/non-object request entries, yield
`NOT_RUN_MISSING_EVIDENCE` at the packet locus. If any FP07 message lacks a nonempty string
`message_id` or is null/non-object, FP07 yields `NOT_RUN_MISSING_EVIDENCE` at the
packet locus: an incomplete snapshot cannot establish active-reply multiplicity.
FP07 records diagnostic observations only. It states `cause: NOT ESTABLISHED`;
it does not infer one.

## Ingress (bus VERIFY-066-ACCESSOR-MUSE-001)

Input must come from JSON text through `parseInert`. It validates JSON-derived values,
deeply freezes all parsed objects/arrays and registers their identities in a private WeakSet.
`assertInert`, `screen` and `checkCatalog` accept only those registered object identities;
arbitrary in-memory objects reject **before** reflection or property reads. This includes
Proxies, Proxy wrappers of registered values, accessors and symbol-bearing objects. There
is no portable, trap-free Proxy detector. Freezing a caller-owned object does not establish
parsed provenance. Do not stringify an untrusted object to bypass this boundary: stringification
can execute its getters, `toJSON` or Proxy traps. Obtain the original JSON text at the host.
Parsed values are immutable, so callers constructing or editing test/host packets must parse
fresh JSON text before screening. No Node-specific APIs or dependencies are introduced.

`parseInert` reuses `AdmissionError` and the plain-object / finite / acyclic rules of
`js/core/events.js`. `js/core` is unchanged. Observed, not fixed here: `canonicalEventText` in
`js/core/events.js` runs payload getters (via `Object.values`) and silently drops symbol-keyed
properties.

## Fixtures

Real incidents (facts observed 2026-11-03):

- R1: two outbox files both declaring `AUDIT-RESULT-003C-004` with parent `AUDIT-REQ-003C-004` → FP07 HIT. The single-response expectation is a fixture assumption.
- R2: `wo-004b-friction-probe-sources` @ `a8232b0` does not contain main @ `cda063d` → FP03 HIT; the Phase A head `b531ed2` contains the WO-004 baseline `9981972` → FP03 NO_HIT.

Synthetic controls: FP01 two-sided with a policy transcribed from DECISION-AUTH-001 as test data
(the probe does not adopt it); FP03 and FP07 clean cases; packet-level and locus-level missing
evidence.

## Not in this slice (spec items left open)

Coalescing (§13), friction register/reducer (§14), control disposition LET_RUN/ACT_ONCE/HOLD (§15),
regression (§16), adapters (§17–18), the full checker and invariant pinning (§20), release checker
(§23), and targets FP02, FP04–FP06, FP08–FP15. Spec §27 lists these for a full MVP; issue #10 asks
for the smallest slice first.
