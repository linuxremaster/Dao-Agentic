# WO-002R cross-runtime conformance evidence

Status: **HOLD — numeric canonicalization / contract representation unresolved**.

The verified Python WO-001 reference and browser-compatible JavaScript candidate
agree on the checked-in ordinary conformance fixtures, including lifecycle state,
admission/rejection behavior for representable cases, event-ID content, sequence,
canonical bytes, and history hashes.

The following smallest numeric probes expose material differences under native JSON
and JavaScript `Number` semantics:

| Probe | Python reference | Browser-compatible JavaScript candidate |
| --- | --- | --- |
| sequence `1.0` | rejected: sequence is Python `float` | parsed as Number `1`; admitted |
| payload `1.0` | canonical value `1.0` | canonical value `1` |
| payload `-0.0` | canonical value `-0.0` | canonical value `0` |
| payload `1e20` | canonical value `1e+20` | canonical value `100000000000000000000` |
| payload `9007199254740991` | exact | exact; PASS control |
| payload `9007199254740993` | exact integer retained | parsed as `9007199254740992` |

The fixtures are preserved in `contracts/conformance/numeric-boundaries.json`.

No compatibility rule is selected here. Resolving this boundary would require a
separate architectural decision such as narrowing numeric semantics, defining a
language-neutral canonical number representation, adopting a specified
canonicalization standard, or using a lossless parsing/representation strategy.
Those are new requirements and are therefore outside WO-002R.

The result is intentionally `HOLD`, not failure concealment:

```
assumption -> explicit fixture -> cross-runtime execution -> mismatch preserved -> HOLD
```
