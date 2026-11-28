# Initial Bounded Composition Comparison v0.1

**Status:** COMPLETED BOUNDED FIXTURE RUN / LOCAL EVIDENCE ONLY  
**Specification:** `DAO_REPRESENTATION_INDEPENDENT_COMPOSITION_CONSTRUCTIVE_FALSIFICATION_SPEC_v0.1.3.md`  
**Executable fixture:** `tools/composition_fixture.py`  
**Mechanical tests:** `tests/test_composition_fixture.py`  
**Exact run result:** `INITIAL_BOUNDED_COMPARISON_v0.1.json`  
**Result SHA-256:** `130b46274db6544bc9ac9e687be6cfa1e3d0106514d62f91ed02dc7bb7e58d27`

## Question

Can an explicit persistent workflow graph (M1) be substituted by materially different state-local transition predicates (M3) for the selected workflow properties and disturbances without the test apparatus silently performing candidate workflow execution?

This is the first small fixture only. It is not the full M1-M5 x S0-S6 matrix and is not evidence of global representation independence or harness independence.

## Candidate pair

```text
M1
→ explicit persistent workflow graph
→ dependency information stored in graph relations
→ candidate chooses A before B

M3
→ state-local transition predicates
→ dependency/join information encoded in local code predicates
→ candidate chooses B before A
```

The different branch orders intentionally demonstrate that identical traces are not required.

## Declared common substrate

```text
RAW DURABLE MAPPING
→ survives S1 replacement

ATOMIC AUTHORIZATION STORE
→ exact version / target / scope commit check
→ common substrate contribution is disclosed

OBSERVATIONAL EFFECT SINK
→ records attempts / actual effects
↛ deduplication
↛ retry policy

COMMON RUNNER
→ wake candidate
→ inject declared exogenous replacement / revocation / observation faults
→ capture trace
↛ choose A / B / C / D
↛ enforce join
↛ recover relations
↛ deduplicate effect
↛ retry on candidate behalf
```

## Initial scenarios

```text
S0  nominal candidate-directed execution
S1  replacement after first contribution commit
S2a revocation after observed authorization, before C commit
S2a revocation after observed authorization, before D effect attempt
S4a candidate sees UNKNOWN; hidden effect occurred
S4b candidate sees identical UNKNOWN history; hidden effect did not occur
```

The S4 candidate-visible histories are byte-equivalent after sequence normalization for both candidates while evaluator truth differs.

## Mechanical fixture validation

`python -m unittest -v tests/test_composition_fixture.py`

```text
12 tests
→ 12 passed
```

The controls include defective traces for duplicate-A/lost-B contribution handling, C-before-B ordering, duplicate external effect, and retry-after-UNKNOWN, plus acceptable alternative ordering and the matched S4 pair. These controls test assertion discrimination only; they are not a standing behavioral assay.

## Bounded result

```text
SELECTED SCENARIO-LOCAL ASSERTIONS
→ PASS FOR M1
→ PASS FOR M3

DECLARED SPARSE OUTCOMES
→ SUPPORTED FOR M1
→ SUPPORTED FOR M3

SUBSTITUTION
→ LOCALLY SUPPORTED

REENCODING
→ SUPPORTED
→ dependency / join functionality remains encoded in M3 predicates/code

DISPLACEMENT
→ NOT ESTABLISHED
→ authorization atomicity + durable storage are common substrate for both

ABLATION OF COMPOSITION FUNCTIONALITY
→ NOT ESTABLISHED

EXPLICIT PERSISTENT GRAPH REPRESENTATION
→ ABSENT IN M3

HARNESS INDEPENDENCE
→ NOT ESTABLISHED
```

The important result is therefore not “graph unnecessary.” The initial fixture shows that the explicit persistent graph representation can be substituted in this bounded slice while the composition function is reencoded in local predicates.

## Current limitations

- P1 requisite parallel progress is not established by this single-thread deterministic fixture.
- P6 source-degradation epistemic integrity is not in the initial scenario slice.
- S2b/S2c, S3, S5, S6 and H2 migration/adaptive-selection work remain untested.
- V3 apparatus non-substitution is supported by bounded code inspection and the declared interface, not formal proof.
- The candidates are deterministic software fixtures, not LLM behavioral implementations.
- Common durable storage and authorization atomicity materially contribute to the observed result and must remain attributed.
- Passing this fixture does not validate Cognitive Architecture Runtime capabilities generally.

## Stop / next hinge

The first hinge is resolved narrowly enough to stop expanding this fixture by default:

```text
M1 vs M3
+ selected S0 / S1 / S2a / S4 conditions
→ local substitution + reencoding evidence
↛ functionality ablation
↛ harness independence
```

A next experiment is justified only if a surviving question can change the engineering disposition. Candidate examples are source-loss recovery (P6/S3), a stronger apparatus-displacement question, or migration feasibility; none is automatically required by this result.

## Fixity

- spec: `317a64361f3d9cd67482538f37b2f2e9865cbba404c984a358a847bb54546988`
- fixture: `772754c501c2330dedffb12133b4066b21af3b6d76f762a3957985970c2f4fca`
- tests: `d88e0345a79e46c3852ca5cb632ba35497f071540d23baac7defdb014b3aa626`
- result JSON: `ac24e7259460e95dbc8a547d8be807d174d17df430045b43d6654d56e69538b3`
- v0.1.2→v0.1.3 diff: `3a48cc47cf2889cd4ecff9e55875a98b999a46fac8fa660e31009eb4577aec2a`
