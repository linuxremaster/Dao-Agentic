# Passive Model / Runtime Telemetry v0.1

Status: minimal passive observation surface. This directory does not own project semantics, model identity, authorization, evaluation, comparison, or causal diagnosis.

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
→ EVALUATION
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

If an observation later becomes material to project trajectory, `events.jsonl` may reference its `observation_id`.

REFERENCE ↛ TELEMETRY RECORD BECOMES SEMANTIC STATE

## Record schema

Each line of `observations.jsonl` is one JSON object.

```json
{
  "telemetry_version": "0.1",
  "observation_id": "...",
  "supersedes_observation_id": null,
  "observed_at": "...",
  "recorded_at": "...",
  "project": "...",
  "thread_handle": "...",
  "runtime": {
    "provider": "...",
    "model_label": "...",
    "visible_configuration": "...",
    "identity_status": "UNKNOWN"
  },
  "observation_type": "...",
  "boundary": "...",
  "source_refs": [],
  "artifact_hashes": [],
  "tool_refs": [],
  "observable": {
    "status": "...",
    "declared_unknowns": [],
    "correction_observed": false,
    "correction_ref": null,
    "notes": "..."
  },
  "provenance_refs": []
}
```

Fields are recorded only when externally observable and available. Unknowns remain unknown rather than inferred.

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

No comparison machinery, scoring framework, serving-state store, continuity controller, or model-transition controller is defined by this v0.1 surface.
