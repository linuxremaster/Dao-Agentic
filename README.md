# Dao-Agentic

Dao-Agentic is currently a **harness framework with a deterministic control spine**, not yet a complete orchestration runtime.

```yaml
INTENT != ACTION
ACTION != OUTCOME
OUTCOME != VERIFIED SUCCESS
```

Control semantics are intended to be language-independent. JavaScript is preferred
when it is the simplest adequate choice for browser-facing use, but it is not a
semantic authority or a hard language requirement. The Python 3.10+ standard-library
implementation remains the verified WO-001 reference while cross-runtime conformance
is evaluated.

The current WO-002R JavaScript candidate reproduces the ordinary lifecycle fixtures,
including matching history hashes, but numeric representation exposes unresolved
Python/JavaScript canonicalization differences. Those differences are preserved as
`HOLD` evidence rather than hidden behind a compatibility rule. Persistence remains
intentionally deferred until that boundary is resolved.

Run the Python suite:

```sh
python -m unittest discover -s tests -v
```

Run the JavaScript conformance suite with a modern Node runtime:

```sh
node --test js/tests/*.test.js
```

See [architecture](docs/architecture.md), [conformance evidence](docs/conformance.md),
and [operating predicates](docs/operating-predicates.md).
