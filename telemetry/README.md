# Passive Environmental / Runtime Telemetry v0.2

Status: minimal passive observation surface for environmental regulation, external environmental behavior, development outcomes, and bounded runtime/model observations. This directory does not own project semantics, model identity, authorization, evaluation, comparison, or causal diagnosis.

## Observation target

PRIMARY RESEARCH TARGET
→ ENVIRONMENTAL REGULATION
→ EXTERNAL ENVIRONMENTAL BEHAVIOR
→ COUPLED DEVELOPMENT TRAJECTORY

MODEL / RUNTIME OUTPUT
→ ONE OBSERVATION SURFACE
↛ DEFAULT OBJECT OF SCORING
↛ BEHAVIORAL ASSAY
↛ RUBRIC RESULT

Raw telemetry remains passive. Longitudinal aggregation may support descriptive environmental comparison or research interpretation, but an observation record is not itself an evaluation, score, diagnosis, or control signal.

## Contract

TELEMETRY IS
→ PASSIVE
→ APPEND-ONLY
→ EXTERNALLY OBSERVABLE
→ PROVENANCE-PRESERVING

TELEMETRY IS NOT
→ SEMANTIC STATE
→ PROJECT EVENT BY DEFAULT
→ MODEL IDENTITY
→ SUCCESSORSHIP
→ AUTHORIZATION
→ STANDING EVALUATION
→ MODEL SCORE
→ CONTROL SIGNAL
→ CAUSAL DIAGNOSIS
→ HIDDEN-STATE INFERENCE

OBSERVATION ↛ TRUTH
REPETITION ↛ AUTHORITY
AGREEMENT ↛ VERIFICATION
DISAGREEMENT ↛ FAILURE
RECORDING ↛ MATERIALITY

TELEMETRY RECORDING FAILURE ↛ PROJECT WORK FAILURE
TELEMETRY AVAILABILITY ↛ RECORDING DUTY
TELEMETRY PRESENCE ↛ MATERIALITY
TELEMETRY ABSENCE ↛ EVENT ABSENCE

Observed model behavior != project-state event.
Observed environmental behavior != automatic causal explanation.

If an observation later becomes material to project trajectory, `events.jsonl` may reference its `observation_id`.

REFERENCE ↛ TELEMETRY RECORD BECOMES SEMANTIC STATE

## Observation scopes

Use the smallest scope supported by the source:

```text
ENVIRONMENTAL_REGULATION
EXTERNAL_ENVIRONMENT
DEVELOPMENT_OUTCOME
RUNTIME_MODEL
UNKNOWN
```

Examples include stale-assumption recurrence, currentness failures, trajectory discontinuities, requirement omissions, retrieval/reconstruction friction, human coordination burden, host/product/UI changes, connector/tool behavior, blocked/completed work, recovery effort, and bounded model/runtime observations.

A stale assumption is an externally supported currentness mismatch, not proof of model failure or a particular internal cause.

```text
STALE ASSUMPTION OBSERVED
↛ MODEL FAILURE
↛ RETRIEVAL FAILURE ESTABLISHED
↛ CAUSAL STAGE ESTABLISHED
```

## Record schema

Each line of `observations.jsonl` is one JSON object. Fields are recorded only when externally observable and available. Unknowns remain unknown rather than inferred.

```json
{
  "telemetry_version": "0.2",
  "observation_id": "...",
  "supersedes_observation_id": null,
  "observed_at": "...",
  "recorded_at": "...",
  "project": "...",
  "thread_handle": "...",
  "observation_scope": "ENVIRONMENTAL_REGULATION | EXTERNAL_ENVIRONMENT | DEVELOPMENT_OUTCOME | RUNTIME_MODEL | UNKNOWN",
  "observation_type": "...",
  "criterion": null,
  "source_refs": [],
  "artifact_hashes": [],
  "tool_refs": [],
  "environment": {
    "provider": null,
    "product_surface": null,
    "model_label": null,
    "visible_configuration": null,
    "connector_or_tool": null,
    "identity_status": "UNKNOWN"
  },
  "observable": {
    "status": "...",
    "stale_assumption_observed": false,
    "correction_observed": false,
    "correction_ref": null,
    "declared_unknowns": [],
    "notes": "..."
  },
  "provenance_refs": []
}
```

Historical v0.1 records, if present, remain valid provenance and are not silently rewritten.

## Longitudinal use boundary

```text
EVENT RECORD
→ PASSIVE OBSERVATION

AGGREGATION
→ DESCRIPTIVE LONGITUDINAL PROJECTION

RESEARCH INTERPRETATION
→ ENVIRONMENTAL HYPOTHESIS

INTERVENTION
→ SEPARATELY JUSTIFIED ACTION
```

COUNTED FREQUENCY != IMPORTANCE
LOW ERROR COUNT != IMPROVEMENT
HIGH RECOVERY SPEED != CORRECTNESS

ERROR COUNT ↓
↛ ENVIRONMENT IMPROVED

OBSERVABILITY ↑
→ RECORDED ERROR COUNT MAY TEMPORARILY ↑

No composite environmental score is required.

## Append-only correction

Existing observation records are not silently rewritten.

A correction or replacement is appended as a new observation with:

```text
supersedes_observation_id → prior observation_id
```

The prior record remains part of the longitudinal provenance.

## Forbidden promotions

A telemetry observation does not by itself become:
- semantic state;
- a material project event;
- evidence beyond its valid support relation;
- model identity or successor identity;
- authorization;
- a model evaluation or score;
- a causal diagnosis;
- a hidden-state claim;
- a duty to compare, test, record, or intervene.

Descriptive environmental aggregation does not create semantic state, authority, a controller, or a standing behavioral assay.

No comparison machinery, scoring framework, serving-state store, continuity controller, or model-transition controller is defined by this v0.2 surface.
