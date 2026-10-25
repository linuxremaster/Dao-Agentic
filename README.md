# Dao-Agentic

Dao-Agentic is currently a **harness framework with a deterministic control spine**, not yet a complete orchestration runtime.

```yaml
INTENT != ACTION
ACTION != OUTCOME
OUTCOME != VERIFIED SUCCESS
```

The standard-library Python core admits ordered events, materializes lifecycle
state, and recovers it by deterministic replay. No runtime dependencies are needed.

Run with Python 3.10 or newer:

```sh
python -m unittest discover -s tests -v
```

See [architecture](docs/architecture.md) and [operating predicates](docs/operating-predicates.md).
