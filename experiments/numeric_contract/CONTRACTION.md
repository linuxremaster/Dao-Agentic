# WO-003B — Cross-runtime event identity boundary: contraction record

Status: **CONTRACTION / no candidate selected / no implementation**

Input state: branch `wo-003b-cross-runtime-contract` at
`ac4fabec10cd618fca2037751d3d61b65bb71305` (WO-003A). This record changes no
code, fixture, or evidence file.

Notation: **[OBS]** = observed in a cited WO-003A/WO-002R artifact or re-run;
**[INF]** = inference by the author of this record, not observed.
Fixture names refer to `evidence.json` → `observations[].name`.

---

## 1. Evidence and provenance status

| Item | Status |
|---|---|
| Author of this record | Claude (claude.ai/code session). **DEGRADED, not independent:** the author had read earlier harness proposals, their audits, and WO-003A reasoning before writing. Agreement between this record and WO-003A is not independent confirmation. |
| `evidence.json` | Re-read. 38 observations. Per-candidate counts recomputed from the file match `RESULTS.md`. Each recorded `event_sha256`/`payload_sha256` recomputes from its recorded `canonical_hex`. Python and JavaScript HOLD reasons are identical for all N/J/D HOLDs (0 differences). [OBS] |
| Replays | `replays` show identical final state and history hashes across runtimes for N, J and D (6 events, DONE). [OBS] |
| Test suites | Re-run by the author on Python 3.13 / Node 22 (WO-003A recorded Python 3.12.14 / Node v24.19.0). Counts reproduced. Same author, same exposure: re-execution, not independent replication. No CI exists. [OBS] |
| Browser | `RESULTS.md` states no browser was executed; browser conformance is QUALIFIED. Unchanged here. [OBS] |
| Standards | RFC 8259 / 7493 / 8785 are cited by WO-003A as anchors; the RFC fetch returned 403 in WO-003A's environment. This record does not treat any RFC as project authority (STANDARD EXISTS ≠ PROJECT AUTHORITY). |
| WO-002R baseline | `docs/conformance.md`: Python reference vs JS candidate mismatch on sequence `1.0`, payload `1.0`, `-0.0`, `1e20`, `9007199254740993`; `9007199254740991` agrees. [OBS] |

## 2. Audit of WO-003A reasoning

### 2.1 Common ancestry / shared-premise leakage — **material**

N, J and D are not three independent designs. In both runtimes they share one
`parse(raw)` (token-preserving; rejects duplicate keys, lone surrogates,
malformed input, depth > 64) and one `control(event)` (sequence must match
`[1-9][0-9]*`, ≤ 16 chars, ≤ 2^53−1). [OBS: `python/candidates.py`,
`js/candidates.js`]

Consequence, counted from `evidence.json` [OBS]:

- **9 of 38 fixtures HOLD in all three candidates with the identical reason**
  (`sequence_lexical_float`, `sequence_above_safe`, `duplicate_payload_key`,
  `sequence_boolean`, `sequence_zero`, `sequence_negative`,
  `sequence_exponent`, `lone_surrogate`, `nonfinite_literal`). These rows are
  *one* observation of the shared code, not three agreeing observations.
- Candidate-specific HOLDs: N = 2, J = 10, D = 0.

Every property the three candidates "agree on" is therefore suspect as a
surviving invariant unless a fixture forces it independently of the shared code
(SHARED PREMISE ≠ INDEPENDENTLY SURVIVING INVARIANT; control rule of #6).

### 2.2 Pass-count bias

PASS counts differ partly because the candidates make claims of different width
(see 2.4). D's 0 candidate-specific HOLDs and J's 10 are not quality rankings.
No count is used as evidence for selection in this record
(PASS COUNT ≠ CANDIDATE QUALITY).

### 2.3 Standards-authority leakage

All three candidates sort keys by UTF-16 code units, the RFC 8785 rule [OBS:
`RESULTS.md` candidate table]. `unicode_key_order_minimal` proves an ordering
*must be chosen* (Python code-point vs JS UTF-16 diverge). It does not prove
UTF-16 is the right choice; code-point order would equally remove the
divergence if both runtimes implemented it. The choice was inherited, not
discriminated. [INF]

### 2.4 Semantic deferral disguised as compatibility

D passes the numeric fixtures because it **does not interpret** payload
numbers: the matrix row "Exact cross-runtime semantics" marks D's payload
meaning NOT_APPLICABLE [OBS]. D's agreement is byte agreement over an
uninterpreted substring. That is a legitimate design, but it relocates the
numeric problem to whatever later consumer interprets the payload. D's
`reserved_tag_collision` and `explicit_tag_trailing_newline` PASS rows are the
same effect: D binds bytes it never reads. [OBS + INF]

### 2.5 Lexical preservation treated as desirable

The matrix row "Lexical numeric distinctions" marks J **HOLD** for collapsing
`1`/`1.0` and `0`/`-0.0`, and N/D **PASS** for preserving them [OBS]. This
scores preservation as good before any consumer has been shown to need it.
For J, collapse is the intended semantics. The row is a description of
behavior, not of fitness. [INF] (See P5.)

### 2.6 Overfitting to the 38 fixtures

The fixtures were authored in the same work order as the candidates, by the
same author, after the candidates' rules were known. No randomized, grammar-based
or hostile fuzzing; no third parser (e.g. a non-Python/non-V8 JSON
implementation). The fixture set shows *that* boundaries exist; it does not
show the candidates are correct beyond them. [OBS of absence + INF]

### 2.7 Unsupported browser claims

None found. `RESULTS.md` correctly limits the browser module to static
dependency checks, QUALIFIED. [OBS]

### 2.8 Byte identity conflated with semantic correctness

`duplicate_payload_key` and `lone_surrogate` are **PASS** for the native
baseline: both runtimes emit identical bytes [OBS]. For duplicates, both silently
keep the last value (`{"value":2}`), discarding the first. Cross-runtime byte
agreement here certifies an agreed-upon loss, not correctness
(BYTE IDENTITY ≠ SEMANTIC TRUTH). WO-003A's matrix notes describe this
correctly; the PASS label alone would mislead.

### 2.9 HOLD frequency read as weakness

J's 10 specific HOLDs are its declared subset boundary (`J unsafe integer: use
explicit tag`, `J inexact binary64…`) working as specified [OBS]. A HOLD that
routes to an explicit-tag path is not a failure. Conversely D's zero HOLDs is
partly 2.4. HOLD frequency is not a ranking signal.

### 2.10 Items WO-003A handled correctly

- States explicitly that token-aware parsing is a shared concept of the
  experiment, not proof all adapters need it. [OBS]
- States "no candidate can interpret an already-rounded native value as its
  original token". [OBS]
- Uses a matrix without a weighted score. [OBS]
- Marks `sequence_above_safe` as policy ("even though this value is binary64-exact"). [OBS]

## 3. Proposition table

| # | Proposition | Disposition |
|---|---|---|
| P1 | Native parsed-object serialization is sufficient as the cross-runtime history identity boundary | **REJECT** |
| P2 | Shared control fields need a deliberately cross-runtime-safe representation independent of payload semantics | **QUALIFIED** |
| P3 | `sequence` restricted to positive plain integers within the safe range | **QUALIFIED** |
| P4 | If lexical/precision identity is load-bearing, raw representation must be preserved before native parsing | **SUPPORTED** |
| P5 | Lexical spelling SHOULD be part of canonical identity | **HOLD** |
| P6 | Object ordering must be explicitly specified | **SUPPORTED** |
| P7 | Duplicate keys / malformed input need an explicit admission rule | **QUALIFIED** |
| P8 | Payload semantics should be separable from control/lifecycle identity | **QUALIFIED** |
| P9 | A payload digest binds bytes without meaning, availability, authenticity or authorization | **SUPPORTED** |
| P10 | A new canonical representation requires version/migration semantics | **SUPPORTED** |
| P11 | Select N | **HOLD** |
| P12 | Select J | **HOLD** |
| P13 | Select D | **HOLD** |

### P1 — REJECT
- OBSERVATION: Native P vs native JS produce different bytes for
  `sequence_lexical_float` (P rejects, JS admits), `payload_lexical_one`,
  `payload_negative_zero`, `payload_exponent`, `payload_unsafe_integer`,
  `payload_high_precision`, `proto_key` (P `1.0` vs JS `1`),
  `unicode_key_order_minimal`. Same set in `docs/conformance.md`.
- INFERENCE: Native serialization is not a cross-runtime identity boundary for
  the domain the current Python reference admits.
- MISSING PREMISE: none for the rejection. Scope limit: P1 is *not* rejected for
  single-runtime replay or for the WO-002R ordinary fixtures, where it agreed.
- DISPOSITION: REJECT as a general cross-runtime boundary.

### P2 — QUALIFIED
- OBSERVATION: `sequence_lexical_float` — a control field diverges natively
  (P rejects `1.0`, JS admits it as `1`). The WO-001 reducer reads only control
  fields; `core/reducer.py` contains no reference to `payload`.
- INFERENCE: Some explicit control representation rule is forced. That it is
  *independent of payload semantics* was designed into all three candidates via
  the shared `control()` (2.1); D shows it is feasible, not that it is required.
- MISSING PREMISE: that no future control predicate needs payload values.
- DISPOSITION: QUALIFIED — "explicit control representation" survives;
  "independent of payload" is a design candidate.

### P3 — QUALIFIED
- OBSERVATION: The domain was imposed by `control()` (shared). For
  `sequence_above_safe` (2^53) both native baselines *accept and agree*; N/J/D
  HOLD by policy. `sequence_zero`, `sequence_negative`, `sequence_boolean` HOLD
  in the baseline as well.
- INFERENCE: The fixtures force "a sequence representation rule must exist"
  (via `sequence_lexical_float`). They do not force the safe-range ceiling, nor
  the rejection of `1e0`/`1.0` versus normalizing them.
- MISSING PREMISE: a runtime or consumer in which values above 2^53−1 diverge
  (would require an input like 2^53+1, untested for `sequence`).
- DISPOSITION: QUALIFIED — reasonable conservative policy, **imposed, not
  discovered**.

### P4 — SUPPORTED
- OBSERVATION: `payload_unsafe_integer` and `payload_high_precision` lose
  information under native JS parsing; `RESULTS.md`: "No candidate can interpret
  an already-rounded native value as its original token." N and D, which see the
  raw token, preserve these in both runtimes.
- INFERENCE: The conditional holds: preservation must occur before native
  parsing.
- MISSING PREMISE: none for the conditional; whether the antecedent is true is P5.
- DISPOSITION: SUPPORTED (as a conditional only).

### P5 — HOLD
- OBSERVATION: J collapses `1`/`1.0`, `0`/`-0.0`, and `raw_lexical_a`/`raw_lexical_b`
  to identical digests; N and D distinguish them. Both behaviors replay
  identically across runtimes.
- INFERENCE: Both choices are internally consistent. P4 does not imply P5.
- MISSING PREMISE: any Dao-Agentic consumer (reducer, predicate, verifier,
  relay) that needs to distinguish `1` from `1.0`. None is shown; the reducer
  ignores payload.
- DISPOSITION: HOLD.

### P6 — SUPPORTED
- OBSERVATION: `unicode_key_order_minimal` (U+E000 vs U+10000) — natives order
  differently; nonnumeric.
- INFERENCE: Ordering must be specified. **Which** ordering is not discriminated (2.3).
- MISSING PREMISE: for the choice of UTF-16 vs code-point order.
- DISPOSITION: SUPPORTED that it must be specified; choice UNRESOLVED.

### P7 — QUALIFIED
- OBSERVATION: `duplicate_payload_key`: both natives keep last value and agree;
  `lone_surrogate`: both natives accept and agree; `nonfinite_literal`: all HOLD.
  N/J/D HOLD the first two via the shared parser.
- INFERENCE: For the tested pair no cross-runtime *divergence* forces a rule;
  silent agreed loss (2.8) argues for an explicit rule. A third parser with
  first-wins or rejection semantics would diverge, but none was tested.
- MISSING PREMISE: observed divergence from another conforming parser.
- DISPOSITION: QUALIFIED — need is inferred from information loss, not observed
  as divergence.

### P8 — QUALIFIED
- OBSERVATION: D separates control envelope from payload digest and replays
  identically; the reducer does not read payload (`core/reducer.py`).
- INFERENCE: Separation is feasible and matches current reducer behavior.
- MISSING PREMISE: that predicates/verifiers will never need payload content
  for lifecycle decisions; the relay harness proposals expect verification
  against payload content.
- DISPOSITION: QUALIFIED — separable at the *identity* layer; not shown
  separable at the *verification* layer.

### P9 — SUPPORTED
- OBSERVATION: `raw_lexical_a`/`b`: D digests differ for numerically equal
  payloads. `reserved_tag_collision`, `explicit_tag_trailing_newline`: D accepts
  bytes N/J refuse to interpret. D's semantics row is NOT_APPLICABLE.
- INFERENCE: The digest commits to bytes only. Availability, authenticity and
  authorization were not exercised by any fixture; their absence is a property
  of SHA-256 over bytes, not an experimental finding.
- MISSING PREMISE: none.
- DISPOSITION: SUPPORTED.

### P10 — SUPPORTED
- OBSERVATION: Python canonical bytes equal to baseline P: N on 9/38, J on 12/38,
  D on 0/38 fixtures.
- INFERENCE: Any adoption changes existing history hashes on some or all events,
  in candidate-dependent, non-obvious patterns. Without an explicit format/version
  marker a reader cannot tell which canonicalization produced a hash.
- MISSING PREMISE: none for the requirement; migration *policy* is unresolved.
- DISPOSITION: SUPPORTED.

### P11 / P12 / P13 — HOLD
- OBSERVATION: Each candidate is internally consistent and cross-runtime
  identical on its accepted fixtures and replay.
- INFERENCE: The selection turns on P5 (lexical identity) and P8 (whether
  verification interprets payload), both unresolved.
- MISSING PREMISE: a consumer requirement.
- DISPOSITION: HOLD for all three. No weighted or count-based ranking applied.

## 4. Candidate-specific contraction

### N — explicit numeric tags
- Problem solved: lossless, cross-runtime numeric tokens in payload. [OBS]
- Semantics preserved: exact lexical numeric text, including long spelling. [OBS]
- Discarded/deferred: arithmetic and numeric equality (`1` ≠ `1.0`); consumers
  must interpret tags. [OBS: matrix "arithmetic not supplied"]
- New concepts: reserved tag namespace `{"$numeric":{kind,text}}`; collision rule.
- Obligations: reserve and police the namespace (`reserved_tag_collision`,
  `explicit_tag_trailing_newline` HOLD); every consumer needs a tag-aware reader.
- Falsifiers: a consumer that needs value equality across spellings; legitimate
  payloads containing `$numeric` keys.

### J — JCS subset probe
- Problem solved: value-normalized identity for a declared safe numeric subset. [OBS]
- Semantics preserved: numeric value within subset; explicit strings outside it.
- Discarded/deferred: lexical spelling; everything outside the subset → HOLD
  (10 fixtures). [OBS]
- New concepts: subset boundary; explicit-tag escape path; dependence on RFC 8785
  number formatting *without* claiming a general formatter. [OBS]
- Obligations: exact-binary64 checks in each runtime; namespace policing (as N).
- Falsifiers: a required payload value class outside the subset becoming common;
  a third runtime whose shortest-round-trip formatting differs inside the subset.

### D — payload digest + control envelope
- Problem solved: cross-runtime identity without interpreting payload numbers. [OBS]
- Semantics preserved: exact payload bytes (including whitespace); control fields.
- Discarded/deferred: **all payload meaning** (NOT_APPLICABLE); numerically equal
  payloads with different spelling get different identity. [OBS]
- New concepts: D-v1 envelope `{format, event_id, kind, sequence, payload_sha256}`;
  exact-substring capture from raw input.
- Obligations: retain raw payload bytes wherever identity must be re-verified;
  any consumer that interprets payload re-encounters the numeric problem (2.4).
- Falsifiers: a verifier or predicate that needs to compare payload values across
  runtimes; a transport (e.g. relay copy/paste) that alters whitespace while
  preserving meaning — D would treat that as a different event. [INF]

## 5. Identity-layer boundary assessment

| Arrow | Status | Basis |
|---|---|---|
| RAW SOURCE → INGRESS/PARSE OBSERVATION | **ESTABLISHED** | Native parsing loses information before any later layer can recover it (P4; `payload_unsafe_integer`, `payload_high_precision`). A distinct parse layer is necessary when precision matters. |
| INGRESS/PARSE → CONTROL ENVELOPE | **ESTABLISHED** | `sequence_lexical_float` diverges at the control field; an explicit control rule is required (P2). Its exact domain is CANDIDATE (P3). |
| CONTROL ENVELOPE → PAYLOAD IDENTITY/REFERENCE | **CANDIDATE** | D demonstrates separation; the reducer ignores payload. Not established as necessary (P8). |
| PAYLOAD IDENTITY → PAYLOAD INTERPRETATION | **CANDIDATE** | N/J choose interpretation at identity time; D defers it. No fixture forces either (P5). |
| PAYLOAD INTERPRETATION → SEMANTIC VERIFICATION | **NOT JUSTIFIED** (by this evidence) | No fixture exercises semantic verification. BYTE IDENTITY ≠ SEMANTIC TRUTH; VALID RECORD ≠ TRUE CLAIM. |

## 6. Minimal surviving invariants

Each item is forced by at least one fixture independently of shared candidate code,
or is a definitional property:

1. **Native parsed-object serialization is not a cross-runtime identity boundary**
   (P1; `docs/conformance.md`).
2. **Control fields require an explicit, runtime-independent representation rule**
   (P2; `sequence_lexical_float`). Domain unspecified (P3).
3. **Object key ordering must be specified** (P6; `unicode_key_order_minimal`).
   Ordering choice unspecified.
4. **If precision or lexical identity is load-bearing, it must be captured before
   native parsing** (P4, conditional).
5. **A canonical-representation change requires an explicit format/version marker**
   (P10).
6. **A digest binds bytes, not meaning, availability, authenticity or authorization**
   (P9).

Not promoted (shared-premise only, per #6 control rule): duplicate-key HOLD,
lone-surrogate HOLD, depth ≤ 64, safe-range sequence ceiling, UTF-16 ordering,
the `$numeric` namespace. Each remains a candidate policy.

## 7. Unresolved design choices

1. Does any consumer need lexical numeric identity? (decides P5 and N vs J vs D)
2. Will verification or predicates read payload values? (decides P8 depth)
3. Key ordering: UTF-16 or code-point.
4. Sequence domain: safe-range ceiling, and reject vs normalize `1.0`/`1e0`.
5. Duplicate keys / lone surrogates: reject, or explicitly specify last-wins.
6. Version marker form and migration policy for existing WO-001 hashes.
7. Whether raw payload bytes must be retained, and where (persistence is out of scope).
8. Whether relay transport may alter whitespace (affects D). [INF]

## 8. Smallest next discriminating experiment

**Required: YES.**

**E1 — consumer-requirement probe (decides choice 1 and 2).** Enumerate every
existing and currently proposed reader of `payload` (reducer, predicates, the
relay verification discipline's checks) and, for each, write one fixture in
which two payloads differ only in numeric spelling (`1` vs `1.0`; `0` vs `-0.0`)
or in whitespace. Record whether the reader's correct output differs.
- If no reader distinguishes them → P5 REJECT-candidate; N's extra obligation
  is unjustified; J or D remain.
- If no reader interprets payload at all → D's deferral costs nothing now.
- If any reader needs the distinction → J falsified for that reader.

No new candidate code is needed; it is a fixture-and-reader inventory.

**E2 (secondary, optional) — third-parser divergence.** Run the 38 raw inputs
plus duplicate-key/surrogate variants through one additional independent JSON
implementation (non-CPython, non-V8). Converts P7 and the ordering choice from
inferred to observed, and reduces the 2.6 overfitting exposure.

## 9. Production implementation decision

**PRODUCTION IMPLEMENTATION JUSTIFIED: NO.**

A WO restricted to invariants 1–6 would still have to pick a key ordering, a
sequence domain and a version marker form, none of which this evidence
discriminates. No N/J/D selection is justified. The current Python reference
remains authoritative for single-runtime replay; cross-runtime identity stays
HOLD as in WO-002R until E1 is run.
