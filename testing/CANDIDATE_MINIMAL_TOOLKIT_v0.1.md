# Candidate Minimal Toolkit v0.1

**Status:** FROZEN CANDIDATE / ORDINARY-USE TESTING  
**Authority:** none by default  
**Implementation status:** inventory only; no implementation mandate

This file records the smallest currently defensible set of deterministic helpers and ambient reasoning reminders. It is a testing surface, not a semantic owner, controller, policy primitive, or claim that the architecture is complete.

## Constitutional boundary

```text
TOOLS
→ inspect / preserve / constrain structure

REMINDERS
→ support reasoning attention

NEITHER
→ receives semantic authority by default
```

## Candidate deterministic helpers

### Identity / integrity
- `hash()` / `verify_hashes()` — establish byte identity / integrity only.
- `schema_check()` — test declared structural shape only.
- `resolve_ref()` — confirm a referenced object exists; existence does not establish relevance.

### Temporal / lineage
- `check_predecessor()` — verify the declared predecessor / lineage relation.
- `check_currentness()` — compare declared expected predecessor / source state against observed state.

```text
STALE
→ expected state differs from observed state

↛ newer is better
↛ old is false
↛ mutation required
```

### Mutation safety
- `check_write_admissibility()` — test structural admissibility only.
- `append_only()` — reject destructive rewrite of an append-only surface.
- `supersede()` — preserve the prior record and make the replacement relation explicit.
- `atomic_write()` — make a consequential write all-or-nothing.

```text
check_write_admissibility()
→ structural admissibility only

↛ judge_transition()
↛ evidence sufficiency
↛ policy merit
↛ semantic correctness
```

### Projection
- `derive_projection()` — generate a declared boundary-specific view without promoting the view into source state.

### Evidence hygiene
- `dedupe_identifiers_hashes()` — deduplicate identifiers / hashes for bookkeeping; does not establish evidentiary independence.
- `record_search_iteration()` — record search provenance / bookkeeping only.
- `verify_manifest()` — check declared files / hashes / references; manifest membership does not create authority.

`record_search_iteration()` may record:
- query
- databases / indexes
- seed references
- iteration
- retrieved identifiers
- deduplication result
- yield
- declared resource bound
- declared stop reason

It does not determine:
- whether a gap is load-bearing
- whether evidence is sufficient
- whether saturation is epistemically meaningful
- whether a claim may close

## Ambient semantic reminders

These are questions available to reasoning, not machinery.

- **Context hygiene:** Do I need to recalibrate / narrow context before continuing?
- **Boundary:** What is actually load-bearing right now?
- **Source:** Am I reasoning from source, or from a projection that is no longer sufficient?
- **Unknown:** Am I resolving something merely because completion is easier?
- **Persistence:** Why must this survive, and for which future boundary?
- **Authority:** What independently justifies authority here?
- **Mutation:** Am I observing / interpreting, or actually changing source state?
- **Evidence:** `EVIDENCE != JUDGMENT`; `JUDGMENT != AUTHORIZATION`.
- **Search:** Would another iteration materially affect a load-bearing judgment at this boundary?
- **Ablation:** What failure does removal solve, and what useful function would removal destroy?
- **Goodhart:** Is a representation / metric / safeguard quietly becoming the purpose?
- **Notepad:** This surface may be wrong, temporary, contradictory, revised, or discarded.

Orientation reminder:

> **Durability in the source and provenance; flexibility in the views; authority only at justified boundaries.**

```text
ANTI-GOODHART
→ SAFEGUARD
↛ PURPOSE / TARGET

ABLATION
→ REMOVE UNJUSTIFIED FAILURE SURFACES
↛ REMOVE USEFUL STRUCTURE
```

## Firewall

```text
REMINDER
↛ REQUIRED RECITATION
↛ CHECKLIST COMPLIANCE SCORE
↛ TELEMETRY REQUIREMENT
↛ PROOF OF GOOD REASONING

TOOL PASS
↛ CORRECT INTERPRETATION
↛ VALID JUDGMENT
↛ AUTHORITY

TOOL FAILURE
→ ONLY ESTABLISHES THE STRUCTURAL CONDITION
  THAT TOOL WAS DESIGNED TO TEST
```

## Change / admission rule

```text
PROPOSE NEW MECHANISM

→ IDENTIFY OBSERVED FAILURE
→ SHOW CURRENT PRIMITIVES CANNOT ADEQUATELY HANDLE IT
→ SHOW PROPOSED MECHANISM MATERIALLY REDUCES THAT FAILURE
→ BOUND ITS AUTHORITY
→ CHECK NEW FAILURE SURFACE

IF NOT
→ DON'T ADD IT
```

## Current disposition

```text
CANDIDATE MINIMAL TOOLKIT v0.1
→ FROZEN FOR ORDINARY-USE TESTING

STATUS
→ smallest currently defensible toolbox
↛ validated architecture
↛ implementation mandate
↛ complete future inventory

CHANGE RULE
→ reopen only when an observed failure
  cannot be adequately handled by current primitives
```
