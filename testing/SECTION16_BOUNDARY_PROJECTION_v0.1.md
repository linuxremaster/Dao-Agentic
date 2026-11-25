# Section 16 Boundary Projection Tool v0.1

**Status:** EXECUTABLE CANDIDATE / BOUNDED SANDBOX TESTING  
**Authority:** structural projection only  
**Semantic owner:** none

Implements the mechanical core of §16 as a deterministic, non-destructive JSON projection helper.

It does not determine the current boundary, relevance, semantic sufficiency, truth, authorization, or source-deletion permission.

## Contract

DECLARED BOUNDARY B + JSON SOURCE X → r = PROJECT(X, B)

r selects only declared JSON Pointer paths, binds exact source and boundary-spec SHA-256 values, reports missing required/optional paths, leaves source bytes unchanged, and may be lossy or identity-equivalent.

r != X. r does not establish complete judgment, semantic sufficiency, or sufficiency for another boundary.

Every result carries `semantic_sufficiency = NOT_EVALUATED`.

Boundary specs are supplied externally, for example:

```json
{
  "boundary_id": "current-working-state",
  "required": ["/current_objective", "/load_bearing_unknowns"],
  "optional": ["/recipient_identity_status"]
}
```

`required` means only that the declared structural projection fails if the path is absent. It does not mean the field is semantically required by the real decision boundary.

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

BOUNDARY SPEC
↛ CORRECT BOUNDARY

SELECTOR PRESENT
↛ RELEVANT

SOURCE HASH MATCH
↛ SEMANTIC TRUTH

PROJECTION
↛ SOURCE MUTATION
↛ SOURCE-DELETION AUTHORITY
```

New boundaries should normally reproject from richer source rather than silently reuse an older projection.

## Admission test evidence

Local standard-library suite: **6 / 6 PASS**.

Covered source-byte preservation, required/optional paths, RFC 6901 pointer traversal/escaping, overwrite protection, deterministic boundary hashing, and identity-equivalent root projection. A current `state.json` shape also projected successfully.

These tests establish only the tested mechanics; they do not validate §16 as an LLM behavioral intervention.

## Not implemented

- `determine_boundary()`
- relevance scoring
- `is_sufficient()`
- semantic compression
- source mutation/deletion
- automatic traversal controller
- authority/action selection
