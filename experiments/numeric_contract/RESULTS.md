# WO-003A: numeric contract exploration

**NO RECOMMENDATION / CONTRACT PHASE REQUIRED**

## Scope and reproduction

A / EXPLORE only, issue [#5](https://github.com/linuxremaster/Dao-Agentic/issues/5).
Baseline: `c865c7b0891fc328913061bc230945bd05a46b1b`, on the stacked
`wo-003a-numeric-contract-explore` branch. Nothing here changes `core/`, `js/core/`,
production schema, existing fixtures/tests, dependencies, or shared semantics.
No persistence or orchestration is implemented. This branch is evidence, not a
promotion-ready change relative to `main`.

Run from the checkout root with Python 3.10+ and a modern Web-Crypto-capable Node
(test execution used Python 3.12.14 / Node v24.19.0):

```sh
python -m unittest discover -s tests -v
node --test js/tests/*.test.js
python -m unittest experiments.numeric_contract.python.test_candidates -v
node --test experiments/numeric_contract/js/*.test.js
# Reproduce evidence; redirect only when intentionally refreshing the artifact.
python -m experiments.numeric_contract.python.compare
```

Validation: baseline Python **14 passed, 0 failed**; baseline JS **19 passed,
0 failed**; experiment Python **10 passed, 0 failed**; experiment JS **8 passed,
0 failed**. The experiment contains 38 raw-input probes.

No installation or third-party packages are required. Browser-targeted logic is
`js/candidates.js`. `js/emit.js`, `js/run.js`, and tests are Node-only loaders/runners.
The browser module uses ES modules, BigInt, DataView, well-formed-string checking,
TextEncoder/TextDecoder, Uint8Array, and Web Crypto SHA-256 (secure-context support
required). It imports only the unchanged browser-compatible event kinds/admission
predicates. Static dependency checks pass; an actual browser was **not** executed.
Browser execution remains QUALIFIED, not a measured browser conformance claim.

## Standards anchors and limits

- [RFC 8259 §6](https://www.rfc-editor.org/rfc/rfc8259.html#section-6): numeric
  range/precision may be limited; the interoperable exact integer interval is
  `[-9007199254740991, 9007199254740991]`.
- [RFC 7493 §2.2](https://www.rfc-editor.org/rfc/rfc7493.html#section-2.2) and
  [§4.3](https://www.rfc-editor.org/rfc/rfc7493.html#section-4.3): binary64
  interoperability and string representations for larger/exacter values.
- [RFC 8785 §3.2.2.3](https://www.rfc-editor.org/rfc/rfc8785.html#section-3.2.2.3),
  [§3.2.3](https://www.rfc-editor.org/rfc/rfc8785.html#section-3.2.3), and Appendix D:
  ECMAScript number serialization, UTF-16 property sorting, and alternate
  representation of richer numbers.

These are the issue's design references, not adopted project authority. Direct
RFC-editor and IETF Datatracker retrieval returned HTTP 403 in this environment;
this is not a complete standards audit. The implementations below deliberately
support less than full JCS, and tests establish only the declared subset and
fixtures. In particular J rejects some valid binary64/JCS inputs, including `0.1`
and `1e20`, instead of approximating an exact source value or inventing a formatter.
**JCS_SUBSET_PROBE**, never full RFC 8785 compliance.

`STANDARD EXISTS != STANDARD AUTOMATICALLY FITS THIS PROJECT.`

## Candidate definitions and identity boundaries

All three consume **raw event text**, not a previously parsed native object.
A small token-preserving JSON parser keeps every number's source token and the
exact payload substring. Native parsing would already erase `1.0` in JavaScript
and lose high-precision decimals in both runtimes. The source text is retained
in [fixtures/probes.json](fixtures/probes.json) and [evidence.json](evidence.json).
The parser rejects duplicate keys, malformed JSON, lone surrogates and nesting
beyond 64 levels. Those are experimental supported-domain boundaries, not changes
to production JSON admission. Inputs are Unicode text representing valid scalar
UTF-8 JSON objects, not arbitrary binary payloads.

The common **control** domain requires the original four event fields, a nonempty
ID, recognized kind, object payload, and a positive plain integer sequence token
within the safe interval. `1.0` and `1e0` sequence tokens HOLD even though their
mathematical value is one. Sequence maximum probes test representation/admission
of the control domain only: starting a lifecycle at that maximum still rejects a
sequence gap. Experimental replay reuses the unchanged lifecycle admission rules.

| Probe | Representation and commitment |
| --- | --- |
| P (comparison only) | Unchanged Python WO-001 canonical event bytes and reducer. The comparison named `baseline` records actual P emissions alongside unchanged WO-002R native JS emissions; it is not a fourth implementation. |
| N | Safe plain integer payload tokens remain JSON integers. Every other numeric token becomes `{"$numeric":{"kind":"integer" or "decimal","text":"original token"}}`. Decimal/exponent tokens, including exactly representable `1.5`, are deliberately explicit. `-0` is tagged too. Objects use UTF-16 key sorting and Python-compatible ASCII escapes. The hash commits to the transformed event, including tagged numeric lexical spelling, not original whitespace or object order. |
| J | **JCS_SUBSET_PROBE**: UTF-16-sorted keys and unescaped scalar UTF-8 strings with JSON-required escapes. Supports safe mathematical integers (normalizing `1.0`, `-0.0`, and `1e0`) and exact binary64 fractions with magnitude `[1e-6, 1e15)` and at most 15 significant fixed-decimal digits. Python checks `Decimal.from_float` against the raw decimal; JS checks exact integer ratios against the binary64 bits. Numeric tokens are at most 1024 characters, lexical exponents within ±400, adjusted nonzero magnitude within decimal exponents ±400. Outside the subset: HOLD, use explicit tags. No general ECMAScript formatter is claimed. The hash commits to normalized subset values or explicit tag strings, not raw numeric spelling. |
| D | Hash the exact UTF-8 payload substring separately, then canonicalize an ASCII-escaped, UTF-16-sorted envelope containing `format: "D-v1"`, `event_id`, `kind`, `sequence`, `payload_sha256`. The payload digest is bound into event/history identity. Payload bytes are not replaced with a native Number interpretation. Outer whitespace/field order is not committed; payload whitespace, key order, numeric spelling, and Unicode byte spelling are. |

N/J reserve the `$numeric` object namespace experimentally. Preexisting explicit
tags must have exactly `kind` and JSON-number-token `text`; integer tags require an
integer spelling. Malformed/colliding tags HOLD instead of being silently treated
as ordinary application data. Tags preserve arbitrary-precision **representations**,
not implemented arithmetic. D never interprets this tag namespace; it is payload
content. D checks JSON grammar/scalar validity but not payload numeric truth or
domain meaning. Hash binding alone cannot establish payload availability.

For N/J, payload sorting/spelling outside numbers is intentionally normalized.
J does not normalize Unicode, and numeric equivalence is distinct from lexical
identity. N/D ASCII escaping differs from J's UTF-8 for non-ASCII strings.

For every experiment replay, start with SHA-256(empty bytes) and hash
`previous_digest_bytes || emitted_event_bytes` for each admitted event, exactly
as a hash-chain mechanism (not an adoption of production numeric semantics).
Each event also has a standalone SHA-256 recorded in evidence. Lifecycle status,
sequence, IDs, and full final history hash are emitted by **both** runtimes and
compared directly. The six-event trace reaches DONE in each. No snapshots,
external observations, authorization, or semantic truth are inferred from hashes.

## Fixture observations

Each row below links by name to the exact raw source, canonical UTF-8 hex, readable
canonical text, standalone digest, D payload digest, and original runtime rejection
messages in `evidence.json`. PASS means actual emitted byte arrays **and** digests
match in both runtimes. HOLD includes unsupported inputs and rejected inputs;
matching rejection labels never count as byte equality. Native parse rejection
messages may differ and are retained verbatim. Rows are encoding probes, not
claims that isolated high sequences can start a valid lifecycle.

| Fixture | P vs native JS | N | J | D | Observation |
| --- | --- | --- | --- | --- | --- |
| sequence_one | PASS | PASS | PASS | PASS | Shared positive integer control. |
| sequence_lexical_float | HOLD | HOLD | HOLD | HOLD | P rejects; native JS erases lexical float. N/J/D HOLD before conversion. |
| sequence_safe_max | PASS | PASS | PASS | PASS | Encoding accepts safe maximum; replay from NEW rejects gap. |
| sequence_above_safe | PASS | HOLD | HOLD | HOLD | N/J/D reject even though this particular value is binary64-exact. |
| payload_integer | PASS | PASS | PASS | PASS | Ordinary 42 stays ordinary in N/J. |
| payload_dyadic | PASS | PASS | PASS | PASS | N tags 1.5; J emits exact binary64 1.5; D binds source. |
| payload_lexical_one | HOLD | PASS | PASS | PASS | P emits 1.0; JS emits 1. N tags original; J normalizes to 1. |
| payload_integer_one | PASS | PASS | PASS | PASS | Discriminating counterpart to lexical 1.0. |
| payload_negative_zero | HOLD | PASS | PASS | PASS | P emits -0.0; JS emits 0. N retains tag; J emits 0. |
| payload_zero | PASS | PASS | PASS | PASS | Discriminating counterpart to -0.0. |
| payload_exponent | HOLD | PASS | HOLD | PASS | P emits 1e+20; JS fixed digits. J outside safe-integer subset. |
| payload_unsafe_integer | HOLD | PASS | HOLD | PASS | Native JS loses integer precision. N tags exact token; J HOLD. |
| payload_high_precision | HOLD | PASS | HOLD | PASS | Native parsing loses decimal precision. N retains token; J HOLD. |
| payload_nested | HOLD | PASS | HOLD | PASS | Rich numeric preservation through arrays/objects; J needs explicit tags. |
| payload_unicode | HOLD | PASS | PASS | PASS | Unicode beside 1.5 plus UTF-16/code-point ordering boundary. |
| raw_lexical_a | HOLD | PASS | PASS | PASS | Payload spaces and 1e0 spelling are material to D; J normalizes value. |
| raw_lexical_b | HOLD | PASS | PASS | PASS | D digest differs from raw_lexical_a; N retains distinct numeric token. |
| payload_inexact_tenth | PASS | PASS | HOLD | PASS | J intentionally rejects exact-decimal-to-binary64 loss for 0.1. |
| payload_exact_small | PASS | PASS | PASS | PASS | Supported exact fractional decimal in the J subset. |
| payload_subnormal | PASS | PASS | HOLD | PASS | J outside exact/magnitude subset; no rounded compatibility behavior. |
| payload_overflow | HOLD | PASS | HOLD | PASS | Native P/JS reject nonfinite parsed number; N/D retain finite lexical JSON token. |
| payload_safe_max | PASS | PASS | PASS | PASS | Native byte/hash equality control at safe maximum. |
| explicit_integer | PASS | PASS | PASS | PASS | N/J preserve exact integer string; D binds tag as opaque JSON bytes. |
| explicit_decimal | PASS | PASS | PASS | PASS | N/J preserve exact decimal string without Number/float conversion. |
| explicit_nested | PASS | PASS | PASS | PASS | Explicit exact tags nested in arrays and objects. |
| reserved_tag_collision | PASS | HOLD | HOLD | PASS | N/J HOLD reserved namespace collision; D does not interpret tags. |
| duplicate_payload_key | PASS | HOLD | HOLD | HOLD | N/J/D HOLD ambiguity; native baseline collapses duplicate keys. |
| sequence_boolean | HOLD | HOLD | HOLD | HOLD | Not numeric control. |
| sequence_zero | HOLD | HOLD | HOLD | HOLD | Not positive control. |
| sequence_negative | HOLD | HOLD | HOLD | HOLD | Not positive control. |
| sequence_exponent | HOLD | HOLD | HOLD | HOLD | Exact value one still not a plain control integer token. |
| lone_surrogate | PASS | HOLD | HOLD | HOLD | N/J/D HOLD invalid Unicode scalar rather than invent encoding. |
| nonfinite_literal | HOLD | HOLD | HOLD | HOLD | NaN is not JSON; no candidate accepts it. |
| proto_key | HOLD | PASS | PASS | PASS | __proto__ is an ordinary JSON key; no prototype mutation. |
| long_exact_spelling | PASS | PASS | PASS | PASS | Trailing zeros remain in N/D evidence; J normalizes exact 1.5. |
| unicode_key_order_minimal | HOLD | PASS | PASS | PASS | Smallest two-key witness of code-point vs UTF-16 ordering, outside numeric issue itself. |
| explicit_tag_trailing_newline | PASS | HOLD | HOLD | PASS | N/J HOLD trailing newline in reserved numeric token text; D binds it as JSON string content. |
| payload_exact_binary64_outside_subset | PASS | PASS | HOLD | PASS | Exact binary64 value of native 0.1 has over 15 source significant digits; J HOLD rather than count its shorter rounded spelling. |

Measured accepted byte+digest identity comparisons (not a ranking): baseline: 20/38; N: 27/38; J: 19/38; D: 29/38.

## Conformance and tradeoff matrix

The matrix separates dimensions; there is no weighted score. PASS applies only to
specified measurements. QUALIFIED means scoped or unmeasured beyond the described
conditions; HOLD means the broader property cannot be claimed.

| Dimension | P baseline | N | J | D |
| --- | --- | --- | --- | --- |
| Exact cross-runtime bytes | HOLD: numeric and Unicode witnesses differ from native JS | QUALIFIED: accepted fixture hex/digests match; tagged representation | QUALIFIED: accepted subset hex/digests match | QUALIFIED: accepted envelope bytes and payload digests match |
| Exact cross-runtime semantics | HOLD for full native numeric domain | QUALIFIED: safe control values/tag token text agree; arithmetic not supplied | QUALIFIED: exact subset values/explicit strings and replay state agree; broader numeric domain HOLD | QUALIFIED: control/replay state and byte references agree; payload meaning NOT_APPLICABLE |
| Lexical numeric distinctions | QUALIFIED: Python retains int/float and negative zero but loses other spelling | PASS for tested payload numeric tokens, including long spelling; control float tokens HOLD | HOLD for ordinary numbers: 1/1.0 and zero/-0.0 collapse; explicit strings preserve | PASS for supported payload text, including whitespace and spelling |
| Arbitrary-precision preservation | QUALIFIED: Python integers exact; native decimals lose precision | QUALIFIED: exact token strings retained, no arithmetic implemented | QUALIFIED: explicit tags retained; untagged high precision HOLD | QUALIFIED: exact UTF-8 bytes retained, no shared payload arithmetic |
| Browser compatibility | NOT_APPLICABLE to Python P; native WO-002R JS remains a comparison | QUALIFIED: browser APIs/static dependency test only | QUALIFIED: same, plus BigInt/binary64 bit inspection | QUALIFIED: same, plus secure-context Web Crypto required |
| Python compatibility | PASS: unchanged 14-test suite | PASS: tested Python emissions/tests | PASS: tested Decimal checks/subset tests | PASS: tested hashlib/raw-text binding |
| Deterministic replay suitability | PASS in baseline suite | QUALIFIED: six-event trace, repeats, changed-payload hash, admission rejections | QUALIFIED: same within subset | QUALIFIED: same with payload byte commitments |
| History-identity clarity | QUALIFIED: Python-native encoded history only | QUALIFIED: transformed payload/tag identity; not original whitespace | QUALIFIED: normalized subset event identity; lexical loss explicit | QUALIFIED: D-v1 envelope plus payload digest; no availability/meaning guarantee |
| Provenance/raw evidence | HOLD for full raw provenance in P state alone | QUALIFIED: raw fixtures retained externally; chain keeps numeric tags, not full source | QUALIFIED: raw fixtures retained externally; chain loses ordinary numeric spelling | QUALIFIED: payload raw bytes retained externally and digest-bound; outer source not bound |
| Migration from WO-001 | NOT_APPLICABLE | QUALIFIED: safe control restriction, token-aware ingress, reserved tags, UTF-16 sorting; some ordinary identities unchanged | QUALIFIED: new Unicode/number formatting, safe/subset limits, token-aware ingress and tags | QUALIFIED: new envelope format/hash identity and separate raw payload retention |
| Complexity/new concepts | QUALIFIED: existing native JSON and SHA chain | QUALIFIED: token parser, tag schema, shared key ordering | QUALIFIED: token parser, exact rational checks, subset formatter bounds, tags, UTF-16 sorting | QUALIFIED: token parser, exact source slicing, separate payload digest/envelope and availability concerns |
| Ambiguity introduced | HOLD: native number/key-order drift | QUALIFIED: reserved-tag collision explicitly HOLD; tag kind/string not arithmetic authority | QUALIFIED: value normalization intentionally erases spelling; subset limits explicit | QUALIFIED: byte equality is not numeric/value equivalence; payload interpretation intentionally outside control |
| Explicit unsupported rejection | QUALIFIED: existing production predicates, not shared numeric contract | PASS: fixture HOLD controls/tags/duplicate keys/surrogates plus malformed/depth tests | PASS: same plus unsafe/inexact/out-of-subset numeric HOLD | PASS: control/JSON/Unicode/depth HOLD; rich tokens need no numeric interpretation |
| Future storage-adapter compatibility | QUALIFIED: replay history could be retained; no adapter tested | QUALIFIED: transformed bytes and source provenance would need explicit retention | QUALIFIED: subset bytes plus raw source if lexical audit required | QUALIFIED: envelope and exact payload must both be retrievable/verified; no adapter tested |

## Smallest observed mismatches and discriminating pairs

- P vs native JS: one sequence token `1.0` produces reject vs acceptance; one
  payload number `1.0`, `-0.0`, `1e20`, or `9007199254740993` yields different
  actual canonical bytes/digests. All original WO-002R fixtures remain untouched.
- `1.0000000000000000000001`: the raw decimal is lost by native float/Number
  parsing before canonicalization. P emits `1.0`, JS emits `1`; neither is source
  precision. N's tag and D's bytes retain the source; J requires an explicit tag.
- J pairs `1.0`/`1`, `-0.0`/`0`, and spaced `1e0`/compact `1.00` have identical
  emitted bytes/digests in both runtimes. The same pairs have distinct N numeric
  tags and distinct D payload digests. These differences are retained as tradeoffs,
  not called implementation errors.
- D: `{ "value" : 1e0 }` vs `{"value":1.00}` produces different payload and
  envelope digests even though J's emitted bytes agree. Changing only outer
  whitespace leaves D's emitted bytes unchanged; changing the control ID changes
  the envelope digest but leaves the payload digest unchanged.
- `unicode_key_order_minimal`: just two payload keys U+E000 and U+10000 with value
  zero discriminate Python code-point sorting from native JS UTF-16 sorting.
  N/J/D explicitly use UTF-16 order. This **additional nonnumeric** baseline
  mismatch is preserved, not silently fixed in production or reframed as numeric.
- `reserved_tag_collision`: N/J HOLD for `{"$numeric":"ordinary user data"}`,
  while D binds it without claiming tag semantics. `duplicate_payload_key` shows
  native parsers collapsing an ambiguity that all three experiments HOLD.

There are no observed accepted N/J/D Python-vs-JS byte/digest mismatches in this
fixture set. Unsupported cases remain HOLD even where both runtimes reject them.
The full native baseline numeric/hash parity remains HOLD; that does not negate
its measured ordinary lifecycle conformance.

## Migration, limitations, and unresolved questions

No candidate can interpret an already-rounded native value as its original token.
Ingress must preserve source text before Number/float conversion. Token-aware
parsing is a new concept shared by this particular experiment, not proof that all
future adapters must use this parser. The reserved tag namespace, plain-integer
sequence policy, explicit bounds and UTF-16 ordering would need contract review
before any promotion. Existing Python hashes containing decimal spellings,
negative zero, rich integers or differently sorted Unicode keys cannot be silently
relabelled as these experimental identities. D changes the event representation
and requires payload retrieval and digest verification outside the reducer.

Unresolved (QUALIFIED / HOLD):

- Numeric type/value equivalence beyond the supported probes, arithmetic on tags,
  tag namespace ownership, and whether lexical spelling belongs in history identity.
- Full RFC 8785/I-JSON compliance, general ECMAScript shortest-number formatting,
  nonexact binary64 acceptance policy, and high-precision domain authority.
- Production control/payload contract choice, migration/versioning strategy,
  adapters accepting only native objects, and browser execution across engines.
- Resource limits beyond the explicit depth/J-number limits; a complete hostile
  input/parser audit was not performed. No arbitrary-binary payload claim is made.
- D's payload availability, provenance retention lifecycle, storage validation,
  semantic validation, and any trust/authentication model. Digests do not authenticate.

`VALUE EQUIVALENCE != LEXICAL IDENTITY`

`CANONICAL EVENT IDENTITY != SEMANTIC TRUTH`

`RICH LOCAL CAPABILITY != SHARED SEMANTIC AUTHORITY`

`COMMON INVARIANT != LOWEST COMMON DENOMINATOR`

`IMPLEMENTATION DIVERGENCE MAY BE ALLOWED; SILENT SEMANTIC DIVERGENCE IS NOT.`

**NO RECOMMENDATION / CONTRACT PHASE REQUIRED.** No winner is selected. WO-003B
has not begun. Nothing is merged, promoted, or proposed as a success PR to main.
