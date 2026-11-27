# Section 16 Criterion-Conditioned Source/View Projection v0.1

**Status:** EXECUTABLE CANDIDATE / BOUNDED SANDBOX TESTING  
**Authority:** structural projection only  
**Semantic owner:** none

This file preserves the mechanical §16 candidate while normalizing the explanatory vocabulary toward established source/view, slicing-criterion, projection, abstraction/refinement, and active-context terminology.

The executable JSON helper retains the existing `boundary_id` field and `--boundary` CLI option as compatibility names. In the semantic relation below, `B` is a **current criterion**, not a standing controller, planner, or authority.

## Core relation

```text
X_t = SOURCE / WORKING STATE AT t
B_t = CURRENT CRITERION AT t
P   = PROJECTION / EVALUATION RELATION
r_t = RESULTING VIEW

r_t = P(X_t, B_t)
```

`r_t` may be sufficient for `B_t` while omitting information present in `X_t`.

```text
r_t
→ MAY BE SUFFICIENT FOR B_t
→ NEED NOT PRESERVE ALL INFORMATION IN X_t

r_t NEED NOT EQUAL X_t

SUFFICIENT(r_t, B_t)
↛ SUFFICIENT(r_t, B′)
```

Projection/evaluation does not itself mutate the source:

```text
r_t = P(X_t, B_t)
→ X_t UNCHANGED

PROJECTION != MUTATION
VIEW != SOURCE STATE
CRITERION RESOLUTION != SOURCE-STATE REWRITE

LOCAL RESOLUTION
↛ COMPLETE JUDGMENT
↛ GLOBAL DEFINITION
↛ BINARY ONTOLOGY
```

## Information relation

```text
NON-INJECTIVE / LOSSY PROJECTION
→ r_t ALONE ↛ RECONSTRUCT X_t

r_t
+ SUFFICIENT COMPLEMENT / SOURCE INFORMATION
→ MAY RECOVER DISTINCTIONS NOT PRESENT IN r_t ALONE

LOSSLESS / IDENTITY-EQUIVALENT PROJECTION
→ MAY PRESERVE ENOUGH INFORMATION TO RECONSTRUCT X_t

SOURCE → VIEW
↛ VIEW → SOURCE

CYCLIC ACCESS
!=
SYMMETRIC INFORMATION RELATION
```

Returning toward source is refinement/retrieval, not inversion of the view.

## Criterion lifecycle and source refinement

The temporal form separates **view insufficiency** from **criterion release**.

```text
r_t = P(X_t, B_t)

r_t INSUFFICIENT
OR
r_t MISBOUND
→ RETURN TOWARD X_t
   OR THE INTENDED RICHER SOURCE / REPRESENTATION
→ RE-EVALUATE UNDER THE SAME B_t
```

Important asymmetry:

```text
INSUFFICIENT VIEW
↛ INVALID CRITERION
```

Sometimes the current criterion is still the right question; the active view is simply too poor.

Criterion release is a different operation:

```text
B_t RESOLVED
OR
B_t INVALIDATED
→ RELEASE B_t

RELEASE B_t
↛ REQUIRE SUCCESSOR

NEW LOAD-BEARING DISTINCTION?
    YES → B_{t+1}
    NO  → ∅

B_t ↛ B_{t+1}
```

Here `RESOLVED` is descriptive: the current task no longer requires that criterion to remain active. It is **not** an implemented semantic oracle.

The lifecycle may therefore cycle through richer source and focused views without claiming reversibility:

```text
X
→ P(X, B)
→ r
→ X / RICHER SOURCE
→ P(X, B′) IF NEEDED
→ r′
```

## Inference-effect boundary

Non-destructive source handling is not the same as inference neutrality.

```text
PROJECTION
↛ SOURCE MUTATION

BUT

USE(r_t)
→ MAY ALTER SUBSEQUENT INFERENCE TRAJECTORY

NON-DESTRUCTIVE
↛ INFERENCE-NEUTRAL
```

Therefore:

```text
REPETITION
SALIENCE
PERSISTENCE
LOCAL SUCCESS
↛ GREATER EVIDENTIAL OR OPERATIONAL AUTHORITY
```

Repeated exposure may create selection pressure or fixation. That is a **testable trajectory hypothesis**, not an established attractor mechanism and not a reason to add a standing anti-attractor controller.

## Update semantics

```text
VIEW / PROJECTION UPDATE
↛ UNIQUE SOURCE-STATE UPDATE

SOURCE-STATE CHANGE
→ REQUIRE EXPLICIT UPDATE POLICY / MUTATION PATH
→ BIND THE UPDATE TO THE INTENDED SOURCE
   WHERE THAT BINDING IS LOAD-BEARING
→ DO NOT INFER MUTATION
   FROM PROJECTION / EVALUATION ALONE

SIMILARITY
POSITION
RETRIEVAL PROXIMITY
↛ CORRECT SOURCE BINDING
```

A new criterion should normally re-evaluate from source state where available, or from a representation sufficiently rich for that criterion. Preserve unknown where source information does not support resolution.

## Executable candidate mapping

Current implementation:

```text
DECLARED STRUCTURAL SPEC B + JSON SOURCE X
→ r = PROJECT(X, B)
```

The structural spec is externally supplied. Its current schema uses the compatibility field `boundary_id`:

```json
{
  "boundary_id": "current-working-state",
  "required": ["/current_objective", "/load_bearing_unknowns"],
  "optional": ["/recipient_identity_status"]
}
```

`required` means only that the declared structural projection fails if the path is absent. It does not mean the field is semantically required by the actual criterion.

The helper binds exact source/spec SHA-256 values, reports missing required/optional paths, and leaves source bytes unchanged. It reports only the mechanically observed `root_selected` condition; it does not classify information loss.

```text
root_selected = false
↛ INFORMATION LOSS ESTABLISHED

root_selected = true
→ FULL SOURCE VALUE IS PRESENT IN THE SELECTED VIEW
```

Every result carries `semantic_sufficiency = NOT_EVALUATED`.

## Usage

`python tools/boundary_projection.py project --source state.json --boundary boundary.json`

Add `--output projection.json` for atomic output. Output may not overwrite source or boundary spec.

## Failure boundary

```text
MISSING DECLARED REQUIRED PATH
→ structural failure only
→ no output artifact written

STRUCTURALLY COMPLETE
↛ SEMANTICALLY SUFFICIENT

DECLARED SPEC
↛ CORRECT CRITERION

SELECTOR PRESENT
↛ RELEVANT

SOURCE HASH MATCH
↛ SEMANTIC TRUTH

PROJECTION
↛ SOURCE MUTATION
↛ SOURCE-DELETION AUTHORITY

INSUFFICIENT VIEW
↛ INVALID CRITERION

RELEASED CRITERION
↛ REQUIRED SUCCESSOR
```

## Admission test evidence

Local standard-library suite: **8 / 8 PASS**.

Covered source-byte preservation, required/optional paths, RFC 6901 pointer traversal/escaping, ASCII array-index syntax including rejection of leading-zero and Unicode-digit tokens, overwrite protection, deterministic spec hashing, explicit root-selection reporting without a lossiness claim, and root projection. A current `state.json` shape also projected successfully.

These tests establish only the tested mechanics; they do not validate the temporal criterion lifecycle, semantic sufficiency, criterion resolution, source refinement, or any LLM behavioral/trajectory effect.

## Not implemented

- `determine_criterion()` / `determine_boundary()`
- relevance scoring
- `is_sufficient()`
- automatic criterion release
- automatic successor-criterion selection
- source-refinement controller
- trajectory / attractor scoring
- semantic compression
- source mutation/deletion
- authority/action selection
