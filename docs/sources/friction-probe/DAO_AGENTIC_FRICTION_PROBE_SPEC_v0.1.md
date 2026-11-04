# Dao-Agentic Friction Probe & Register — Specification v0.1

**Status:** PROPOSED — specification only; no implementation or production integration is authorized by this document.  
**Target project:** `linuxremaster/Dao-Agentic`  
**Primary compatibility target:** `Micro_Probe_Kernel_v0.6.3_r2_release_8_FINAL`  
**Purpose:** Define a deterministic, evidence-bound subsystem that detects, records, coalesces, and rechecks orchestration/harness friction without becoming a new authority source or autonomous policy engine.

---

## 0. Normative language and authority boundary

The key words **MUST**, **MUST NOT**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative within this proposed specification.

This specification is **not** a work order, merge authorization, protocol amendment, or production-state change. It does not modify the existing Dao-Agentic lifecycle, event kinds, relay protocol, authority model, or GitHub state.

A future implementation SHALL be governed by the then-current project work order and repository state. Where this specification conflicts with a later valid work order or merged requirement, the later valid authority governs and the conflict SHALL be preserved rather than silently reconciled.

Hashes in this document identify bytes only:

```text
HASH-BOUND != AUTHORIZED
BYTE IDENTITY != SEMANTIC TRUTH
SOURCE-LOCAL AUTHORITY != PROJECT AUTHORITY
```

---

## 1. Source basis

### 1.1 Micro-Probe compatibility anchor

This specification was grounded against the release contained in the project corpus:

- release archive: `Micro_Probe_Kernel_v0.6.3_r2_release_8_FINAL.zip`
- release archive SHA-256: `4c953ba91ca966d62466351953b11e3249ab90c0441f020157ee4668765be6c5`
- outer corpus SHA-256: `008b49688ed52079aa569c1a0c5a3a29faf738b89d6b02448f93da6fbb996ea0`
- canonical Micro-Probe record SHA-256: `11aacceb3ac7f8a4788341beedd1787c752347df4fb8a2b1216114b213902f1e`
- Micro-Probe invariants SHA-256: `15c55e33c97fe54035c97cc3f7ef2a5a843d76ed5ff9f83bff5952d1ba477a4e`

The source release's own `check_release.py` was executed on the unpacked release and returned:

```text
ACCEPT - file set, digests and all gates pass
this establishes which bytes are present, not that they were authorized (B)
```

The compatibility requirements derived from that release are listed explicitly in §4. This specification copies the **control architecture and epistemic constraints**, not the Micro-Probe target taxonomy.

### 1.2 Dao-Agentic repository integration anchor

At drafting time, the verified repository baseline used for integration analysis was:

`17af45699a2a597bde75dc81347bdb5b35cfea52`

Relevant current repository facts at that baseline:

- the project describes itself as a **harness framework with a deterministic control spine**;
- Python 3.10+ standard library is the verified WO-001 reference;
- `pyproject.toml` declares no dependencies;
- the deterministic core performs no filesystem/network I/O and consults no clock, randomness, model, environment, or external facts;
- event history is append-only and materialized by a pure reducer;
- payload claims do not select lifecycle transitions;
- structural validity and history hashing do not establish semantic truth;
- JavaScript cross-runtime canonicalization remains a separate unresolved boundary.

These facts constrain integration design but do not freeze future repository structure.

### 1.3 Additional design source

The project source bundle includes the **PROPOSED SPECIFICATIONS / REQUIREMENTS ADDENDUM — Verification, Authority, and Continuity Controls — Revised**. This specification adopts its relevant design direction where compatible with the verified repo and Micro-Probe release:

```text
PERCEPTION / RECOGNITION != AUTHORITY / CONTROL
RATIONALE / HISTORY != EVIDENCE / AUTHORIZATION
UNVERIFIED CANDIDATE != CURRENT STATE
CHECK PASS != CLAIMS BEYOND CHECK COVERAGE
STATE PROMOTION / COMPILATION IS A CONTROL ACTION
```

The addendum remains a proposed source unless independently promoted by project authority. Its use here is design provenance, not silent authority promotion.

---

## 2. Objective

Create a small subsystem that can answer, deterministically and inspectably:

1. **What operational friction is currently observable?**
2. **What evidence established each friction finding?**
3. **Which probes could not run because required evidence is missing?**
4. **Which findings are duplicates or overlapping labels for the same locus?**
5. **Which friction remains active, mitigated, resolved, accepted, or held?**
6. **What is the smallest justified next control disposition: `LET_RUN`, `ACT_ONCE`, or `HOLD`?**
7. **Has a mitigation actually removed the friction without introducing a new one?**

The subsystem exists to reduce coordination debt and repeated reconstruction. It SHALL NOT become a generalized autonomous project manager, semantic oracle, or authorization service.

---

## 3. Non-goals

Version 0.1 SHALL NOT:

- infer human intent or motive;
- decide project authority from tone, account name, commit author, or relay sender labels;
- merge branches, write to `main`, close issues, delete files, or change scheduled tasks;
- create or amend work orders;
- mutate the existing `core/events.py` event vocabulary;
- alter the existing task lifecycle reducer;
- resolve the numeric cross-runtime identity HOLD;
- treat absence of evidence as `NO_HIT`;
- treat model confidence as deterministic evidence;
- use an LLM inside the deterministic probe engine;
- call GitHub, Google Drive, a PM service, the network, the filesystem, a clock, or randomness from the pure probe/reducer core;
- automatically convert recurring friction into a new policy or guard;
- silently repair, archive, suppress, or delete contradictory state;
- count multiple labels as multiple votes for stronger intervention.

---

## 4. Micro-Probe compatibility profile

A conforming Friction Probe implementation SHALL preserve the following Micro-Probe kernel properties.

| Kernel property | Friction Probe requirement |
|---|---|
| Canonical machine-readable record is authority; prose projections are not checking inputs | Friction probe catalog/config SHALL have one canonical machine-readable source. Generated Markdown is a projection only. |
| Approved invariants maintained separately | Load-bearing closed sets and prose pins SHALL be held in a separately maintained invariants file. |
| Counts are derived, not stored | Probe/family/finding totals SHALL be calculated by tooling, never duplicated as authoritative values. |
| Closed probe result set | Probe result vocabulary SHALL be exactly `HIT`, `NO_HIT`, `NOT_RUN_MISSING_EVIDENCE`. |
| Missing evidence is not a clean result | A probe with no eligible evidence mode SHALL return `NOT_RUN_MISSING_EVIDENCE`, never `NO_HIT`. |
| Evidence modes are explicit | Each probe SHALL declare evidence requirements per mode using `requires_all` and/or `requires_any`. |
| Required finding fields | Every probe result SHALL retain at least `target_id`, `mode`, `locus`, `verdict`. |
| Overlap/locus coalescing | Labels SHALL coalesce only where both overlap group and locus match. Labels are not votes. |
| Closed control outcomes | Control disposition SHALL be exactly `LET_RUN`, `ACT_ONCE`, or `HOLD`. |
| `ACT_ONCE` is bounded | One mitigation pass only. No recursive `D2` repair loop. |
| `HOLD` preserves state | HOLD SHALL preserve source evidence, established friction, rejected mitigation, and hold reason. |
| Source independence before screening | The evidence packet SHALL be externalized/frozen before deterministic screening. If a model-based suggestion path is used, its independence status SHALL be explicit. |
| Regression after correction | A mitigation SHALL be re-evaluated against the same applicable probe criteria before being accepted as resolved. |
| Negative controls | The checker SHALL ship mutation tests proving that known-invalid records/configurations are rejected for the expected reason. |
| Projection checks | Generated documentation SHALL be checked against the canonical record. |
| Exact release inventory/digests | A release checker SHALL reject missing, extra, duplicate, malformed, or digest-mismatched release artifacts. |
| Bytes do not establish approval | Release verification SHALL explicitly state that byte identity/reproducibility does not establish authorization. |

### 4.1 Format compatibility versus semantic compatibility

The Micro-Probe release uses YAML as its canonical record. Dao-Agentic currently has no declared runtime dependencies and the verified Python control spine is standard-library only.

Therefore v0.1 of the Friction Probe SHALL use **JSON** for its canonical runtime records unless a future work order explicitly authorizes a YAML dependency or parser.

This is an intentional repository-integration choice, not a relaxation of the kernel architecture:

```text
canonical machine-readable record
+ separately maintained invariants
+ deterministic checker
+ generated projection
+ negative controls
+ release gate
```

remain mandatory.

---

## 5. Architecture

### 5.1 Required separation

```text
EXTERNAL SOURCES
GitHub / relay / audit request / policy / operator-provided snapshots
        |
        v
COLLECTORS / ADAPTERS           <-- I/O allowed here
        |
        v
FROZEN EVIDENCE PACKET (D0)
        |
        v
DETERMINISTIC PROBES            <-- pure
        |
        v
RAW FINDINGS
        |
        v
COALESCE(overlap_group, locus)   <-- pure
        |
        v
FRICTION EVENTS
        |
        v
PURE FRICTION REDUCER           <-- pure
        |
        v
FRICTION REGISTER
        |
        +--> advisory control disposition: LET_RUN / ACT_ONCE / HOLD
        |
        +--> generated Markdown / UI / optional PM mirror
```

### 5.2 Deterministic-core boundary

The deterministic probe and reducer modules SHALL NOT directly access:

- network;
- GitHub API;
- Google Drive;
- filesystem;
- wall clock;
- environment variables;
- randomness;
- model inference;
- human judgment;
- PM tools.

All such information MUST enter as explicit, serializable evidence in D0.

### 5.3 Provider adapters

Provider adapters MAY collect and normalize external evidence. Adapters are not semantic authorities. They SHALL record provider metadata and source identity separately from self-declared message or commit fields.

Example:

```text
relay.from = "CLAUDE-BUILDER"          # self-declared content
provider.account = "operator-account"   # authenticated provider observation
```

The engine SHALL NOT infer:

```text
provider.account == human originator
```

unless an authority policy explicitly establishes that mapping.

---

## 6. Canonical artifacts

Proposed repository placement:

```text
contracts/friction/
  friction_catalog.json        # canonical probe/family/evidence/control record
  friction_invariants.json     # separately maintained approved invariants
  evidence_packet.schema.json
  friction_event.schema.json
  friction_register.schema.json

core/friction/
  probe.py                     # pure probe execution
  coalesce.py                  # pure overlap/locus coalescing
  reducer.py                   # pure register reducer
  policy.py                    # pure disposition calculation

adapters/friction/
  github_snapshot.py           # optional collector; I/O edge
  relay_snapshot.py            # optional collector; I/O edge

scripts/friction/
  specchk.py                   # validates canonical catalog/invariants
  gendoc.py                    # generates docs/friction-probe.md
  negctl.py                    # mutation/negative controls
  check_release.py             # exact artifact + digest + gate checker

contracts/friction/fixtures/
  *.json

tests/
  test_friction_probe.py
  test_friction_reducer.py
  test_friction_regression.py
  test_friction_adapters.py

docs/
  friction-probe.md            # generated projection, not authority
```

The exact paths MAY change under a future work order, but separation of canonical record, invariants, pure core, I/O adapters, fixtures, tests, and generated documentation SHALL remain.

---

## 7. Canonical catalog schema

The canonical catalog SHALL minimally contain:

```json
{
  "schema_version": "1.0",
  "implementation_version": "0.1.0",
  "record_revision": "r1",
  "base_input": "D0",
  "families": [],
  "targets": [],
  "evidence_sources": {},
  "probe_results": [
    "HIT",
    "NO_HIT",
    "NOT_RUN_MISSING_EVIDENCE"
  ],
  "evidence_requirements": [],
  "overlap_groups": [],
  "finding_schema": {},
  "coalescing": {},
  "control_policy": {},
  "harness_checks": []
}
```

The checker SHALL compare closed vocabularies by equality, not subset. An extra permissive value is a failure, not harmless extensibility.

---

## 8. D0 — frozen evidence packet

### 8.1 Meaning

For this subsystem, `D0` is the complete frozen observation packet for one screening pass.

It is not model recollection and not a prose summary generated after the fact.

A D0 packet SHOULD contain only the evidence needed for the requested probes. Irrelevant context increases contamination and reconstruction risk.

### 8.2 Required envelope

```json
{
  "packet_id": "...",
  "schema_version": "1.0",
  "scope": {
    "project": "linuxremaster/Dao-Agentic",
    "thread": "optional",
    "work_order": "optional",
    "baseline": "optional",
    "head": "optional"
  },
  "available_evidence": ["repository_snapshot"],
  "evidence": {},
  "provenance": []
}
```

`available_evidence` MUST identify which evidence classes are actually present. A field name without usable content MUST NOT make an evidence mode eligible.

### 8.3 Evidence-source meanings

Initial generic evidence sources:

| Source | Meaning |
|---|---|
| `repository_snapshot` | Frozen provider-observed repository facts: refs, commit IDs, diffs, file digests/content locators, issue/PR state. |
| `work_order` | Frozen text/metadata of the applicable work order or equivalent scoped requirement. |
| `authority_policy` | Explicit rule defining which source/channel/principal may authorize which action class. |
| `relay_snapshot` | Frozen relay message metadata/content and parent/reply relationships. |
| `provider_metadata` | Provider-observed creation/modification/account metadata distinct from self-declared content. |
| `audit_frozen_set` | The exact inputs/refs an audit is permitted to use. |
| `audit_exposure_log` | Observable records of sources/context shown to the auditor, when available. |
| `contradiction_registry` | Prior claim IDs/dispositions such as VERIFIED, FAILED, SUPERSEDED, PENDING, with provenance. |
| `friction_history` | Prior canonical friction events/register snapshots needed for recurrence tests. |
| `timing_policy` | Explicit timeout/overdue thresholds. A wall clock value alone is not a policy. |
| `role_policy` | Explicit mapping of roles to permitted request/action classes. |
| `change_policy` | Explicit branch/path/file/change constraints for the scoped work. |
| `current_time_observation` | Externally supplied time observation used only by probes whose policy requires time. |

Evidence semantics are load-bearing and SHALL be separately pinned in `friction_invariants.json`.

---

## 9. Probe verdict contract

Every applicable target returns exactly one verdict:

```text
HIT
NO_HIT
NOT_RUN_MISSING_EVIDENCE
```

Definitions:

- **HIT** — required evidence was available and the deterministic predicate established the target condition.
- **NO_HIT** — required evidence was available and the predicate established that the target condition was absent for the screened locus.
- **NOT_RUN_MISSING_EVIDENCE** — no declared evidence mode was eligible. This is neither pass nor failure.

A tool or dashboard SHALL NOT collapse `NOT_RUN_MISSING_EVIDENCE` into green/success.

---

## 10. Finding schema

Every probe result SHALL include the Micro-Probe-required fields:

```json
{
  "target_id": "FP01",
  "mode": "channel_authority_check",
  "locus": "action:merge:pr-7",
  "verdict": "HIT"
}
```

A HIT SHOULD additionally include:

```json
{
  "finding_id": "deterministic stable id",
  "family_id": "FF1",
  "evidence_refs": ["..."],
  "observed": {},
  "expected": {},
  "severity": "BLOCKING | MATERIAL | ADVISORY",
  "probe_version": "0.1.0"
}
```

`severity` is advisory control metadata; it SHALL NOT substitute for authority or evidence.

`locus` MUST identify the same operational object/claim/change when coalescing. Examples:

```text
action:merge:pr-7
relay:AUDIT-REQ-003C-001
git-ref:wo-003c-payload-reader-inventory
claim:CONTRACTION:P8:reducer-payload
frozen-set:AUDIT-REQ-003C-002
```

---

## 11. Initial probe families and candidate targets

All targets below are **proposed until implemented and validated**. A future canonical catalog SHALL mark target status explicitly.

### FF1 — Authority and Actuation

#### FP01 — Action/Authority Channel Mismatch

**Definition:** A requested action requires an authority class not established by the supplied authority policy and request provenance.

Evidence modes:

- `channel_authority_check`: `authority_policy` + request/relay/provider evidence.

Examples:

- merge requested by a channel that policy permits only for branch-scoped reversible work;
- delete/close/schedule action without required direct authorization.

The probe SHALL judge the supplied policy mechanically. It SHALL NOT invent an authority policy when none is supplied.

#### FP02 — Authority Origin Ambiguity

**Definition:** The authority policy requires an origin distinction that available provider/self-declared metadata cannot establish.

Example:

```text
GitHub account = linuxremaster
required distinction = operator-human vs agent acting through same credential
```

If no valid observation can establish the distinction, the correct result may be HIT for ambiguity, not a guessed principal.

### FF2 — Currentness and Frozen-State Integrity

#### FP03 — Baseline/Head Drift

**Definition:** A current branch/head no longer matches the baseline/head frozen for the applicable work or review.

Requires `repository_snapshot` plus `work_order` or `audit_frozen_set`.

#### FP04 — Frozen Target Changed After Review Start

**Definition:** Any file/ref in an audit frozen set changed after the audit request was frozen and before the audit result was recorded.

The probe establishes target movement only. Whether the audit is invalidated is a control-policy decision declared separately.

#### FP05 — Scope/Diff Violation

**Definition:** Actual changed files or refs exceed a supplied `change_policy`/work-order scope.

No work-order/change policy -> `NOT_RUN_MISSING_EVIDENCE`, not `NO_HIT`.

### FF3 — Relay, Pickup, and Wake State

#### FP06 — Orphan Reply

**Definition:** A result/ACK references a `parent_message_id` not present in the supplied relay snapshot.

#### FP07 — Duplicate Single-Response Pickup

**Definition:** More than one response exists for a parent whose supplied relay policy expects exactly one active reply.

Multiplicity alone is not a defect unless single-response behavior is actually required.

#### FP08 — Overdue Unanswered Gate

**Definition:** A named request remains unanswered beyond an explicit `timing_policy` threshold.

Requires `relay_snapshot` + `timing_policy` + `current_time_observation`.

The result SHALL NOT infer cause:

```text
UNANSWERED != WAKER FAILED
```

### FF4 — Provenance and Contradiction

#### FP09 — Declared/Provider Timestamp Contradiction

**Definition:** A self-declared timestamp is inconsistent with provider-observed metadata beyond the tolerance specified by policy.

Without an explicit tolerance/policy, the engine MAY report the numeric delta but SHALL NOT classify it as a defect.

#### FP10 — FAILED Premise Still Present in Canonical Artifact

**Definition:** A claim classified `FAILED` in a supplied contradiction registry remains present in a current canonical artifact identified by repository evidence.

The finding SHALL preserve:

- failed claim ID;
- original provenance;
- current artifact locus;
- whether the contradiction is still active.

Presence does not mean the later correction is merged or authoritative.

#### FP11 — Missing Required Provenance

**Definition:** A record type requires provenance fields/evidence refs under the supplied schema/policy and one or more are absent or malformed.

### FF5 — Audit Exposure and Independence

#### FP12 — Frozen-Set Exposure Violation

**Definition:** Observable audit exposure includes a source explicitly excluded by the audit frozen-set policy before the auditor's independent result was recorded.

Requires `audit_frozen_set` + `audit_exposure_log`.

No exposure log -> `NOT_RUN_MISSING_EVIDENCE`.

#### FP13 — Independence Degraded

**Definition:** A process labels a result independent while the supplied exposure/source metadata does not satisfy the declared independence requirement.

The correction is to classify verification as degraded/HOLD, not to fabricate independence.

### FF6 — Role and Scope Routing

#### FP14 — Role/Action Mismatch

**Definition:** A role requests or performs an action outside the supplied `role_policy`.

This probe SHALL NOT hardcode transient project roles into the generic engine.

### FF7 — Reconstruction and Coordination Load

#### FP15 — Repeated Manual Reconstruction

**Definition:** The same friction signature/locus has required repeated reconstruction above an explicitly configured recurrence threshold without a stable deterministic check or canonical record.

Requires `friction_history` and a recurrence policy.

This target detects coordination load; it does not decide what new policy should be created.

A possible advisory output is:

```text
REPEATED MANUAL RECONSTRUCTION
-> CONSIDER EXPLICIT INVARIANT / PROBE / DOCUMENTATION
```

This advice is not itself authorization to add one.

---

## 12. Semantic friction suggestions

Not every useful friction point is deterministically discoverable.

Examples include:

- a recurring conceptual ambiguity between parsed representation and source representation;
- unclear vocabulary that repeatedly causes agents to infer the wrong boundary;
- a workflow distinction that is costly but not observable from structured state.

The system MAY accept a separate record type:

```text
FRICTION_SUGGESTION
```

A suggestion:

- MAY be submitted by a model, operator, or reviewer;
- MUST preserve its source and rationale;
- MUST NOT be represented as a deterministic probe HIT;
- MUST NOT block action merely because it exists;
- MAY become an implemented probe only through a separate evidence/requirement process.

Suggested lifecycle:

```text
PROPOSED
-> CONFIRMED_BY_DETERMINISTIC_PROBE
or
-> ACCEPTED_BY_AUTHORITY
or
-> REJECTED / HOLD
```

Model agreement or repetition alone SHALL NOT promote a suggestion.

---

## 13. Overlap groups and coalescing

The canonical catalog SHALL define overlap groups only where multiple probes can label the same underlying friction event.

Initial candidates:

| Group | Members | Rationale |
|---|---|---|
| `FOG1` | FP01, FP02 | Invalid authority channel and unresolvable authority origin can describe one authorization locus. |
| `FOG2` | FP03, FP04 | Branch drift and frozen-target movement may be two labels for the same changed ref. |
| `FOG3` | FP12, FP13 | Exposure violation may also establish degraded independence for the same audit locus. |

Coalescing key SHALL be exactly:

```text
(overlap_group, locus)
```

Rules:

1. Preserve every applicable label.
2. Do not increase intervention strength because several probes label one event.
3. Do not decrease intervention strength because several labels coalesce.
4. The same overlap group at different loci remains separate friction events.

---

## 14. Friction event and register model

### 14.1 Separate subsystem

Version 0.1 friction events SHALL use a separate schema and reducer. They SHALL NOT extend Dao-Agentic's current task-event `KINDS` without a separate authorized architectural change.

### 14.2 Event types

Proposed closed event vocabulary:

```text
FRICTION_OBSERVED
FRICTION_RECHECKED
MITIGATION_RECORDED
FRICTION_RESOLVED
FRICTION_ACCEPTED
FRICTION_HOLD_ENTERED
SUGGESTION_RECORDED
SUGGESTION_DISPOSITIONED
```

The exact set becomes normative only when frozen in the canonical record/invariants.

### 14.3 Register entry

Minimum materialized entry:

```json
{
  "friction_id": "...",
  "status": "ACTIVE",
  "labels": ["FP03"],
  "locus": "git-ref:branch-name",
  "first_seen_sequence": 12,
  "last_seen_sequence": 12,
  "occurrences": 1,
  "evidence_refs": ["..."],
  "mitigation": null,
  "recovery_condition": "...",
  "authority_state": "UNKNOWN"
}
```

Proposed register statuses:

```text
ACTIVE
MITIGATED
RESOLVED
ACCEPTED
HOLD
```

`RESOLVED` SHALL require a recheck showing that the relevant probe no longer hits under eligible evidence.

`MITIGATED` means an intervention was recorded but resolution has not yet been independently established.

`ACCEPTED` means the friction is intentionally tolerated under explicit policy/authority; it is not equivalent to absent.

`HOLD` preserves unresolved/conflicting state.

### 14.4 Pure reducer

The friction register SHALL be computed as:

```text
FrictionState(n+1) = REDUCE(FrictionState(n), FrictionEvent(n+1))
```

The reducer SHALL be pure and deterministic. It SHALL NOT inspect live evidence or decide whether an event is true. Admission/probe layers establish the event; the reducer materializes it.

---

## 15. Control policy

The subsystem SHALL reuse the kernel's closed control vocabulary.

### `LET_RUN`

No material blocking friction established for the requested operation.

```text
output: advisory permission to continue existing flow
mutation: none
```

`LET_RUN` is not a grant of project authority. The requested operation still requires whatever authority the project requires.

### `ACT_ONCE`

One bounded mitigation is justified by established friction and available authority.

Examples:

- post one missing correction record;
- regenerate one stale projection;
- request one missing evidence source;
- re-run one frozen-set review;
- create one bounded friction fixture under an authorized work order.

Permitted abstract operations SHALL remain equivalent to the kernel's closed set:

```text
add
remove
restructure
```

A project-specific authorization gate sits outside this abstract permission.

### `HOLD`

Use when:

- required evidence is missing for a blocking decision;
- authority is unresolved;
- candidate/current state conflict cannot be safely resolved;
- the mitigation regression check fails;
- a proposed correction would exceed scope;
- independent verification is required but degraded.

HOLD preserves:

```text
D0
established friction and evidence
rejected mitigation candidate
hold reason
recovery condition
```

### No recursion

```text
D0 -> ACT_ONCE -> D1 -> REGRESSION
```

If D1 fails regression:

```text
HOLD
```

not:

```text
D1 -> D2 -> D3 -> ...
```

---

## 16. Regression and recovery

A mitigation SHALL have an explicit recovery condition before it is applied.

After one bounded mitigation, the system SHALL build a new frozen evidence packet and run the same applicable probes against the affected loci.

Resolution criteria:

```text
previous HIT -> NO_HIT
AND
no new material HIT introduced by the mitigation
AND
scope/currentness preserved
```

If a required regression probe cannot run:

```text
NOT_RUN_MISSING_EVIDENCE -> HOLD
```

The system SHALL NOT claim RESOLVED merely because the mitigation command succeeded.

```text
ACTION != OUTCOME
OUTCOME != VERIFIED SUCCESS
```

---

## 17. GitHub integration specification

### 17.1 GitHub is an evidence provider, not project authority

The GitHub adapter MAY observe:

- repository identity;
- branch/ref SHA;
- compare status and ahead/behind counts;
- changed-file set;
- issue/PR state;
- commit ancestry;
- file bytes/digests;
- workflow/check results when supplied.

The adapter MUST NOT infer human origin from account attribution when credentials can be shared by agents.

```text
GITHUB AUTHOR != HUMAN ORIGINATOR
```

unless a separate authority policy establishes that mapping.

### 17.2 Read-only first release

The initial GitHub adapter SHOULD be read-only.

The deterministic friction engine SHALL have no GitHub write capability.

Any later action adapter for comments, issue creation, branch writes, merges, deletes, labels, or workflow reruns SHALL be a separate capability with explicit authority gating and its own tests.

### 17.3 Frozen GitHub snapshot

A normalized snapshot SHOULD resemble:

```json
{
  "repository": "linuxremaster/Dao-Agentic",
  "observed_ref": "wo-example",
  "head_sha": "...",
  "base_sha": "...",
  "compare": {
    "ahead_by": 1,
    "behind_by": 0,
    "files": [
      {"path": "docs/example.md", "status": "modified"}
    ]
  },
  "issues": [
    {"number": 8, "state": "open", "title": "..."}
  ]
}
```

The pure probe receives this snapshot; it does not fetch GitHub itself.

### 17.4 GitHub-ready development workflow

A future implementation SHOULD be delivered through the repository's ordinary branch/review workflow rather than direct `main` edits.

The implementation work order SHOULD freeze:

- baseline SHA;
- branch name;
- exact permitted paths;
- required tests;
- whether dependencies may change;
- whether a workflow file may be added;
- delivery/stop conditions.

This specification does not itself authorize creation of that work order or branch.

### 17.5 CI/check expectations

Once authorized, GitHub CI SHOULD run at minimum:

```text
python -m unittest discover -s tests -v
python scripts/friction/specchk.py contracts/friction/friction_catalog.json
python scripts/friction/negctl.py
python scripts/friction/gendoc.py --check
python scripts/friction/check_release.py
```

If JavaScript friction logic is later introduced, cross-runtime parity SHALL be a separate explicit requirement rather than assumed from Python behavior.

---

## 18. Relay / orchestration integration

The relay collector SHOULD normalize:

- `message_id`;
- `parent_message_id`;
- `supersedes`;
- thread;
- self-declared sender/recipient;
- declared timestamp;
- provider-created timestamp;
- filename;
- provider file ID;
- optional content digest;
- message kind;
- observed folder/state.

The friction core SHALL preserve distinctions such as:

```text
AVAILABLE != READ
ACKNOWLEDGED != WORK COMPLETED
UNANSWERED != WAKER FAILED
DECLARED SENDER != AUTHENTICATED SENDER
```

A relay folder convention is not an access-control boundary unless actual provider permissions establish one.

---

## 19. Optional PM mirror

A PM tool MAY be used as a projection or task-management surface for the friction register.

It MUST NOT be the canonical friction state unless separately designed and authorized as such.

Good PM responsibilities:

- owner display;
- due date/reminder;
- filtering;
- dashboards;
- human notes;
- links back to canonical evidence.

Bad PM responsibilities:

- deciding probe verdicts;
- promoting `PROPOSED` to deterministic `ACTIVE`;
- granting authority;
- rewriting friction history;
- converting missing evidence into success.

The PM mirror SHOULD carry the canonical `friction_id` and evidence links so it can be rebuilt from source state.

---

## 20. Checker specification

`specchk.py` SHALL perform only deterministic structural/invariant checks.

Minimum checks:

1. supported schema version;
2. required top-level keys;
3. unique family IDs;
4. unique target IDs;
5. every target references an existing family;
6. status values are a closed set;
7. probe results equal the required closed set;
8. every target has evidence requirements;
9. every evidence source referenced by a mode exists;
10. every overlap-group member exists;
11. no target appears in contradictory overlap definitions;
12. finding required fields include the kernel minimum;
13. coalescing key equals `overlap_group + locus`;
14. control outcomes equal `LET_RUN / ACT_ONCE / HOLD`;
15. `ACT_ONCE` abstract permits equal `add/remove/restructure`;
16. HOLD preservation fields are pinned;
17. no-recursion prose is pinned by invariant hash;
18. checker-independence and regression checks exist with required timing;
19. evidence-source meanings match their pinned hashes;
20. canonical record byte digest matches the separately maintained invariant binding;
21. derived counts are calculated and not accepted from record-supplied totals.

The checker SHALL return non-zero on failure.

---

## 21. Negative controls

Negative controls are mandatory. At minimum, mutations SHALL prove rejection of:

- extra probe verdict value;
- missing `NOT_RUN_MISSING_EVIDENCE`;
- unknown evidence source;
- target referencing unknown family;
- duplicate target ID;
- coalescing key weakened to overlap group alone;
- coalescing key weakened to locus alone;
- `ACT_ONCE` gaining an additional permissive operation;
- HOLD dropping evidence preservation;
- recursion rule changed to allow repeated repair;
- checker independence changed from mandatory;
- regression check removed;
- `frozen_record`/equivalent evidence semantics redefined as model recollection;
- canonical bytes changed while invariants remain frozen;
- parsed object validated against different hashed bytes;
- generated Markdown manually edited away from canonical projection;
- release payload file omitted from digest list;
- unexpected stale file added to release;
- duplicate digest entry;
- symlink/directory substituted for required regular file.

Each mutation SHOULD fail for its own intended reason so a broad unrelated failure does not mask loss of coverage.

---

## 22. Test fixtures

Fixtures SHALL include both **SHOULD HIT** and **SHOULD NOT HIT** cases.

Minimum deterministic fixture set:

| Fixture | Expected |
|---|---|
| authorized reversible branch action under matching policy | FP01 `NO_HIT` |
| merge request from disallowed relay channel | FP01 `HIT` |
| policy requires human-vs-agent origin but shared credential cannot distinguish | FP02 `HIT` |
| branch head equals frozen audit head | FP03/FP04 `NO_HIT` |
| branch head moves after freeze | FP04 `HIT` |
| diff exactly matches allowed file set | FP05 `NO_HIT` |
| diff adds unrelated file | FP05 `HIT` |
| reply parent exists | FP06 `NO_HIT` |
| reply parent missing | FP06 `HIT` |
| one reply where one expected | FP07 `NO_HIT` |
| two replies where one expected | FP07 `HIT` |
| unanswered request but no timing policy | FP08 `NOT_RUN_MISSING_EVIDENCE` |
| unanswered request beyond explicit threshold | FP08 `HIT` |
| declared/provider timestamp within tolerance | FP09 `NO_HIT` |
| contradiction exceeds tolerance | FP09 `HIT` |
| FAILED claim absent from current artifact | FP10 `NO_HIT` |
| FAILED claim remains in current artifact | FP10 `HIT` |
| audit exposure log clean | FP12 `NO_HIT` |
| forbidden sibling result exposed pre-audit | FP12 `HIT` |
| no exposure log supplied | FP12 `NOT_RUN_MISSING_EVIDENCE` |
| role action within policy | FP14 `NO_HIT` |
| role action outside policy | FP14 `HIT` |
| recurrence below configured threshold | FP15 `NO_HIT` |
| same signature exceeds threshold | FP15 `HIT` |

Fixtures SHALL use synthetic IDs by default and SHALL NOT require live GitHub/Drive access.

---

## 23. Release construction

A standalone Friction Probe release SHOULD mirror the Micro-Probe release discipline:

1. exact expected file set;
2. flat or explicitly defined inventory;
3. no unexpected directories/symlinks;
4. `SHA256SUMS` containing every payload artifact and no prose;
5. separately protected release anchor outside the mutable release;
6. canonical record digest pinned by invariants;
7. generated Markdown verified against canonical record;
8. all negative controls pass;
9. all unit/fixture tests pass;
10. one `check_release.py` command returns one acceptance/rejection exit code.

The release checker SHALL end with wording equivalent to:

```text
ACCEPT - file set, digests and gates pass.
This establishes which bytes are present and which checks passed.
It does not establish project authorization or semantic truth beyond check coverage.
```

---

## 24. Deterministic disposition examples

### Example A — missing audit result

Evidence:

- audit request exists;
- no result exists;
- no timing policy says the result is overdue.

Correct classification:

```text
state: PENDING
friction probe: no overdue verdict can run
FP08: NOT_RUN_MISSING_EVIDENCE
control: LET_RUN or HOLD depends on the requested next action
```

If the next requested action requires the audit result, policy may produce HOLD for that action. The missing result alone does not establish wake failure.

### Example B — branch moved after audit freeze

Evidence:

- frozen head `A`;
- current head `B`;
- `A != B`.

Result:

```text
FP04: HIT
```

Smallest response:

```text
HOLD reviewed promotion
request bounded re-review against B
```

No semantic judgment about the new commit is required to establish target movement.

### Example C — shared credential authority ambiguity

Evidence:

- authority policy requires direct human-origin authorization;
- GitHub/Drive provider metadata identifies a shared account only.

Result:

```text
FP02: HIT
```

The engine SHALL NOT guess that the account-authenticated action was human-originated.

### Example D — recurring semantic confusion

Three agents repeatedly debate a representation boundary, but no deterministic evidence signature has been defined.

Correct handling:

```text
FRICTION_SUGGESTION: record recurrence and provenance
NOT a deterministic HIT merely because several agents agree
```

If a stable observable signature is later defined with fixtures, it may become a probe through an authorized revision.

---

## 25. Security and integrity properties

The implementation SHALL prefer fail-closed behavior for control-critical uncertainty:

- unknown evidence source -> reject catalog or mark probe unrun;
- unknown control outcome -> reject;
- unknown event type -> reject;
- missing required provenance -> explicit finding/unrun state;
- malformed digest -> reject release;
- live provider failure -> do not fabricate snapshot;
- contradictory evidence -> preserve both and HOLD where material;
- unsupported semantic inference -> suggestion/PENDING, not VERIFIED.

No provider message body SHALL be executed as instructions by the deterministic engine.

Adapters SHALL treat remote content as data.

---

## 26. Performance and simplicity constraints

The MVP SHOULD remain small enough to audit manually.

Target characteristics:

- standard-library Python core;
- deterministic fixture-based tests;
- O(n) or O(n log n) scans over ordinary relay/register sizes;
- no database requirement;
- JSON/JSONL persistence sufficient for initial use;
- one bounded screening pass per event-triggered invocation;
- no background daemon required by the core;
- no PM dependency;
- no model dependency.

A PM/database/service layer MAY be added later only when observed traffic demonstrates a requirement.

---

## 27. Acceptance criteria for MVP

An implementation is ready for independent review when all of the following are true:

1. canonical catalog and separate invariants exist;
2. exact three-way probe result vocabulary is enforced;
3. at least FP01, FP03, FP05, FP06, FP09, FP10, FP12, and FP14 have two-sided fixtures;
4. missing evidence produces `NOT_RUN_MISSING_EVIDENCE` in tested cases;
5. findings contain `target_id`, `mode`, `locus`, `verdict`;
6. overlap/locus coalescing is implemented and tested;
7. friction reducer is pure and deterministic;
8. register can replay to identical state from the same event history;
9. provider I/O is outside the core;
10. no existing Dao-Agentic task event kinds or lifecycle transitions are changed;
11. no new runtime dependency is introduced unless explicitly authorized;
12. `LET_RUN / ACT_ONCE / HOLD` is a closed set;
13. ACT_ONCE regression is implemented with no recursive repair loop;
14. negative controls reject the required mutation classes;
15. generated docs are checked against the canonical catalog;
16. release checker rejects missing/extra/digest-mismatched artifacts;
17. GitHub adapter is read-only in v0.1;
18. tool output states its verification ceiling and never equates hash/check success with authority;
19. PM integration, if present, is demonstrably a mirror rather than canonical state;
20. an independent reviewer can reproduce the fixture results from the frozen release without network access.

---

## 28. Recommended implementation sequence

This sequence is advisory and does not authorize work.

### Phase 1 — record and checker

- freeze catalog schema;
- create invariants;
- implement structural checker;
- implement negative controls;
- generate Markdown projection.

### Phase 2 — pure probes

Implement a minimal deterministic subset with synthetic fixtures:

```text
FP01 authority channel mismatch
FP03 baseline/head drift
FP05 scope/diff violation
FP06 orphan reply
FP09 timestamp discrepancy
FP10 failed premise still present
FP12 audit exposure violation
FP14 role/action mismatch
```

### Phase 3 — register reducer

- event schema;
- replayable state;
- coalescing;
- mitigation/recheck/resolution lifecycle.

### Phase 4 — snapshot adapters

- GitHub normalized snapshot collector;
- relay snapshot collector;
- no action methods.

### Phase 5 — regression/control projection

- LET_RUN/ACT_ONCE/HOLD advisory output;
- one-shot mitigation regression;
- HOLD preservation.

### Phase 6 — optional UI/PM mirror

Only after real use establishes that filtering/ownership/dashboard friction exceeds the maintenance cost.

---

## 29. Open requirements — HOLD

The following are intentionally unresolved and SHALL NOT be silently decided by the implementer:

1. **Persistent storage location** — checked-in JSONL, Drive state, local artifact, or other store.
2. **Which friction targets become `current` first** — the catalog above is proposed.
3. **Severity-to-control mapping** — especially whether any advisory HIT blocks a requested action.
4. **Authority policy source** — generic engine is configurable; project-specific policy requires valid project authority.
5. **Timestamp tolerance** — must be explicit rather than inferred.
6. **Recurrence threshold for FP15** — requires observed traffic or an explicit policy.
7. **Whether a GitHub Action should run the release gate** — repository currently has no verified workflow requirement in this specification's baseline inspection.
8. **Whether YAML should eventually replace JSON** — would change dependency/tooling assumptions.
9. **Whether friction events should ever join the main Dao-Agentic event history** — v0.1 explicitly keeps them separate.
10. **Whether a PM connector becomes an official projection surface** — not needed for MVP correctness.

Until resolved by valid evidence/authority, these remain HOLD rather than implementation discretion.

---

## 30. Design invariants

The following should be treated as load-bearing candidate invariants for the future canonical record:

```text
FRICTION DETECTION != AUTHORITY
FRICTION HIT != AUTOMATIC INTERVENTION
NO_HIT != COMPLETE ACCOUNT
NOT_RUN_MISSING_EVIDENCE != NO_HIT
PROVIDER ACCOUNT != HUMAN ORIGINATOR
MESSAGE AVAILABLE != MESSAGE READ
UNANSWERED != WAKE FAILURE
FAILED != SUPERSEDED
MITIGATION APPLIED != FRICTION RESOLVED
HASH-BOUND != AUTHORIZED
CHECK PASS != CLAIMS BEYOND CHECK COVERAGE
MODEL SUGGESTION != DETERMINISTIC FINDING
REPETITION != VALIDATION
MULTIPLE LABELS != MULTIPLE VOTES
PM MIRROR != CANONICAL STATE
```

And the governing control principle:

```text
INTERVENTION PRESSURE MUST NOT OUTRUN EVIDENTIARY SUPPORT
```

---

## 31. Definition of success

The tool succeeds when future instances no longer need to carry routine coordination hazards entirely in conversational working memory, while the system still refuses to pretend that all friction is mechanically knowable.

A successful deployment should make statements like these cheap and reproducible:

```text
AUTHORITY_AMBIGUITY: ACTIVE
source: supplied policy + provider metadata
recovery: direct qualifying authorization

AUDIT_TARGET_DRIFT: NO_HIT
source: frozen head == current reviewed head

FAILED_PREMISE_PRESENT: HIT
source: contradiction registry + current repository snapshot

AUDIT_EXPOSURE: NOT_RUN_MISSING_EVIDENCE
reason: no exposure log supplied
```

The system should reduce hidden coordination debt **without** becoming another opaque control layer.

Its default posture remains:

> **Cooperate when justified. Challenge when warranted. HOLD when unresolved.**

