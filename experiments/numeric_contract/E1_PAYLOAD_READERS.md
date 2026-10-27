# WO-003C / E1 — Payload-reader inventory and requirement discrimination

Status: **INVENTORY / no candidate selected / no implementation**

Work order: issue #8 (author `linuxremaster`). Baseline: `main` at
`17af45699a2a597bde75dc81347bdb5b35cfea52`. Branch: `wo-003c-payload-reader-inventory`.
Author: CLAUDE-BUILDER (claude.ai/code session). **Not independent:** the author wrote
WO-003B (`CONTRACTION.md`), which posed this question.

This record is **partly an inventory**. A complete inventory is not stronger empirical
evidence: absence of a reader establishes only that none was found within the audited
scope. It does not show that a future consumer will not need the property.

Classification labels (issue #8): **[READER]** observed existing reader ·
**[FROZEN]** frozen requirement under the AUTHORITY RULE · **[PROPOSED]** proposed /
non-authoritative · **[INF]** inference · **[MISSING]** missing requirement.

---

## 1. Audited scope

- All 33 tracked files at the baseline (`git ls-files`), searched with
  `git grep -i payload` (725 matching lines) plus searches for every caller of
  `canonical_event`, `canonicalEvent`, `canonicalEventText`, `reduce` and `replay`.
  Every non-experiment file that mentions `payload` was read in full.
- All issues and PRs in `linuxremaster/Dao-Agentic` (#1–#8), whose bodies were searched for
  `payload`, `hash`, `replay`, `canonical`, `identity`, `lexical` and `byte`.
- Executed checks (Python 3 and Node, this session): what the production canonical encoders
  keep and lose for `1`, `1.0`, `1.00`, `-0.0`, `0.0`, `1e20`, `1E+20`,
  `100000000000000000000.0` and `9007199254740993` (§2.1).
- Out of scope: anything outside the repository and its issues, including relay-bus
  documents, harness proposals and chat history. These are [PROPOSED] by rule.

## 2. Payload-reader inventory

### 2.1 Production readers

| # | Location | Component | Payload property consumed | Spelling / bytes / value / neither | Class |
|---|---|---|---|---|---|
| R1 | `core/events.py` | `canonical_event`, `_validate_json` | Type and finiteness of every payload value, and the payload being a `dict`; serializes the payload into canonical bytes (sorted keys, ASCII escapes, Python `json` numbers) | **Parsed value plus Python type.** It receives an already-parsed object and never sees source text. | [READER] |
| R2 | `core/reducer.py` | `reduce`, `replay` | The canonical event bytes from R1, payload included, as input to `history_hash` | **The bytes R1 produces.** The payload does not select transitions, but it is committed into history identity. | [READER] |
| R3 | `js/core/events.js` | `canonicalEventText`, `validateJson`, `canonicalValue` | Same role as R1 under JavaScript `Number`/`JSON.stringify` | **Parsed JS value.** No int/float distinction. | [READER] |
| R4 | `js/core/reducer.js` | `reduce`, `replay` | Canonical bytes from R3 into `historyHash` | The bytes R3 produces | [READER] |
| — | `core/predicates.py`, `js/core/predicates.js` | `admit` | **None.** No payload reference; transitions depend on `kind`, `sequence` and `event_id` only. | neither | [READER] (non-reader confirmed) |

Executed observation for R1 vs R3 (spelling → canonical payload value):

| Source spelling | R1 (Python) | R3 (JS) |
|---|---|---|
| `1` | `1` | `1` |
| `1.0` / `1.00` | `1.0` / `1.0` | `1` / `1` |
| `-0.0` / `0.0` | `-0.0` / `0.0` | `0` / `0` |
| `1e20` / `1E+20` / `100000000000000000000.0` | `1e+20` (all three) | `100000000000000000000` |
| `9007199254740993` | `9007199254740993` | `9007199254740992` |

So R1 keeps the **int/float type distinction and the sign of zero**, but **not source
spelling** (`1.0` = `1.00`, and all three exponent forms collapse). R3 keeps neither. No
production reader consumes exact lexical spelling or exact source bytes.

### 2.2 Test readers (merged)

| # | Location | What it pins | Class |
|---|---|---|---|
| T1 | `tests/test_reducer.py::test_canonical_payload_order` | Payload key order (nested too) does not change `history_hash` | [READER] test |
| T2 | `tests/test_reducer.py::test_non_json_payload_rejected` | NaN, ±inf, tuples, sets, non-string keys and cycles are rejected | [READER] test |
| T3 | `tests/test_reducer.py::test_inputs_unchanged_and_payload_not_retained` | Changing payload content changes `history_hash`; the core keeps no reference to caller payload | [READER] test |
| T4 | `tests/test_conformance.py`, `js/tests/conformance.test.js` | Exact `history_hash` for payload-bearing cases in `contracts/conformance/cases.json` (`nested_order`, `scalars`, `escaped_control`, `unicode`, `safe_numbers`); `numeric-boundaries.json` probes against Python reference outputs | [READER] test |

### 2.3 Experiment readers

`experiments/numeric_contract/python/candidates.py`, `js/candidates.js` (N/J/D transforms;
D hashes the exact payload substring), the `emit.*` scripts, the `test_candidates.*` suites
and `fixtures/probes.json`. These are WO-003A experiment code. Their consumption of exact
source bytes (D) and lexical tokens (N) is a **candidate design property, not a
requirement**. [READER] experiment.

### 2.4 Documentation and specification statements

| Location | Statement about payload | Class |
|---|---|---|
| `contracts/event.schema.json` | `payload` is a JSON object; nothing more | [READER] doc |
| `docs/architecture.md` | "Payload claims do not select transitions"; the hash "commits to the ordered history; it is neither a signature nor evidence that a payload claim is true" | [READER] doc |
| `docs/operating-predicates.md` | Payload text cannot override admission or lifecycle transitions | [READER] doc |
| `docs/conformance.md` | Records P-vs-JS payload numeric mismatches as HOLD | [READER] doc |

None of these states that payload spelling, source bytes or numeric type must be part of
identity.

### 2.5 Proposed / non-authoritative

| Source | Content | Why non-authoritative |
|---|---|---|
| #2 WO-002 (journal) | "non-canonical records are corruption even when semantically equivalent JSON"; exact-byte readback | Closed `not_planned`, marked SUPERSEDED, never merged |
| `CONTRACTION.md` (WO-003B) | Propositions P1–P13 | Issue #8: the source of the question, not evidence for the answer |
| Relay-bus protocol, harness proposals | — | Outside the repository; [PROPOSED] by rule |

## 3. Frozen consumer requirements found

AUTHORITY RULE (issue #8): merged to `main` **and** named as a requirement in a WO issue
authored by `linuxremaster`.

| # | Requirement | Merged artifact | Named in | Status |
|---|---|---|---|---|
| F1 | Cross-runtime conformance fixtures are canonical authority; where exact parity is claimed, canonical bytes and final `history_hash` must match | `contracts/conformance/cases.json`, `numeric-boundaries.json`, `docs/conformance.md` | #4 WO-002R ("Canonical authority belongs to explicit control semantics and conformance fixtures"; "canonical event bytes where exact parity is claimed"; "final history hash where exact parity is claimed") | **[FROZEN]** |
| F2 | Do not silently create competing semantics between runtimes; mismatches are preserved as HOLD; do not modify Python semantics to make tests pass | same | #4 WO-002R | **[FROZEN]** (as a process constraint on WO-002R) |
| F3 | Deterministic replay; canonical hashing | `core/*` (WO-001) | #1 — **a PR, not an issue**; "canonical hashing confirmed" sits under its execution report, not a requirements list | **UNRESOLVED.** Whether #1 qualifies under "WO issue" is not decided here: issue #8 says not to decide authority locally. |

What F1/F2 require of payload: the payload's **canonical bytes under the current WO-001
encoding** must be reproduced wherever parity is claimed. The pinned payload cases contain
only values on which R1 and R3 already agree (`42`, `1.5`, `-7`, strings, booleans,
`null`, nested objects, Unicode). F1 binds the **current** encoding. It says nothing about
which **new** representation (N, J or D) should replace it.

## 4. Authority / provenance classification summary

- [READER] production: R1–R4. They consume parsed value plus runtime type, and commit the
  resulting bytes to `history_hash`. None consumes source spelling or source bytes.
- [READER] tests T1–T4: key-order insensitivity, content sensitivity, rejection of
  non-JSON values, exact hashes for representable cases.
- [FROZEN] F1, F2. F3 unresolved (PR vs issue).
- [PROPOSED] WO-002 journal byte requirement, CONTRACTION.md propositions, all relay
  material.
- [MISSING] No authoritative requirement states whether payload numeric **spelling**,
  numeric **type** (`1` vs `1.0`), sign of zero, or **source bytes** are identity-bearing in
  a cross-runtime representation.

## 5. Discriminating requirement

**None found.**

- N vs J (spelling/type preserved vs value-normalized): no reader or frozen requirement
  needs spelling. R1's int/float and `-0.0` distinctions are **current behavior**. No
  WO issue names them as a requirement. [MISSING]
- J vs D (payload value interpreted vs opaque bytes): no production reader interprets
  payload values, so nothing needs a cross-runtime payload *value*. Nothing needs source
  bytes either. [MISSING]
- F1 rules out silently changing the **existing** WO-001 hashes, which all of N, J and D
  would change (WO-003A: Python bytes equal P on N 9/38, J 12/38, D 0/38 probes). That is
  WO-003B P10 (versioning), not a discriminator among candidates. Versioning and migration
  policy are out of scope here (issue #8 DO NOT).

No fixtures were added. DO item 5 permits them only when an authoritative requirement needs
them, and none was found.

## 6. Correction to a WO-003B premise

`CONTRACTION.md` (P2 observation line 158, P5 line 195, P8 line 219, §5 table line 299) states that the reducer "does
not read payload" / "ignores payload", based on `core/reducer.py` containing no
`payload` token. **That is incomplete.** R2 commits the payload's canonical bytes into
`history_hash`, and T3 pins that payload changes change the hash.

The accurate statement: **payload does not affect lifecycle transitions** (predicates
never read it), **but it is part of history identity** (R1→R2, R3→R4).

Effect on WO-003B dispositions [INF]: P2, P5 and P8 keep their dispositions. P8 stays QUALIFIED; this sharpens its missing
premise rather than resolving it. Separating payload from *identity* (D) would change
current behavior; separating it from *transitions* is already true. No WO-003B disposition
flips. Per issue #8's file restriction this record does not edit `CONTRACTION.md`.

## 7. Remaining uncertainty

1. **F3 authority.** WO-001 exists on GitHub only as PR #1. Whether it counts as a "WO
   issue" is an operator decision.
2. **Authorship is not authentication.** [READER-adjacent observation] PR #7 was opened
   by CLAUDE-BUILDER through this session's GitHub credential, yet GitHub lists its author
   as `linuxremaster`. The AUTHORITY RULE's "authored by `linuxremaster`" test therefore
   cannot, by itself, tell operator-written work orders from builder-written ones. Every
   issue #1–#8 shows the same author. DECLARED SENDER != AUTHENTICATED SENDER.
3. **Scope limits.** Only in-repository readers were inventoried. Future readers (relay
   ingress, verifiers, persistence) are excluded by rule. The finding "none requires
   spelling, bytes or value" holds for the baseline only.
4. **R1 int/float behavior.** R1 distinguishes `1` from `1.0` and `-0.0` from `0.0`. No
   requirement says whether that is intended semantics or incidental Python behavior.
   [MISSING]

## 8. Effect on N/J/D and whether another experiment is justified

- **N / J / D: HOLD (unchanged).** E1 found no authoritative requirement that discriminates
  among them. Per issue #8 DO NOT, no candidate is promoted because no reader needs a
  competing property.
- **Another experiment: NO.** The missing premise is a **requirement decision**, not an
  observation another experiment can make. Further fixtures would test candidates against
  a requirement nobody has stated. The next discriminating step is for the operator to
  decide, in a WO issue, whether payload numeric type, spelling or source bytes are
  identity-bearing in a cross-runtime representation, or to leave that HOLD.
