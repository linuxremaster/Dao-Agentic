# Context Compaction Mechanism Matrix v0.1

Status: **FROZEN RESEARCH INPUT / MECHANISM SELECTION / NO IMPLEMENTATION AUTHORITY**

Purpose: select, modify, reject, or test prior-work mechanisms for bounded context compaction without turning the compactor, memory hierarchy, retrieval layer, or this matrix into a semantic owner.

This is **not** an architecture proposal, implementation mandate, policy owner, memory authority, or claim of novelty.

## Frozen research disposition

```text
CONTEXT COMPACTION
→ NO LONGER AN INVENTION PROBLEM

IT IS NOW
→ PRIOR-WORK SELECTION
→ COMPOSITION
→ ABLATION
→ BOUNDED TESTING
```

Bounded search status:

```text
CONTEXT COMPACTION SEARCH v0.1

STATUS
→ BOUNDED SEARCH COMPLETE
  FOR CURRENT DESIGN BOUNDARY

FOUND
→ PEER-REVIEWED DIRECT PRECEDENT
→ RECENT NEAR-MATCHES
→ MATURE ADJACENT SYSTEMS PRECEDENT

CLAIM BOUNDARY
→ NOT FOUND IN BOUNDED SEARCH
↛ DOES NOT EXIST
```

Generic searching should not reopen by default. Reopen only if a new load-bearing design hinge cannot be resolved from the current prior-work set or implementation testing exposes a material gap.

## Established terminology

Prefer established hierarchical-memory terminology where sufficient:

```text
α(X)     → EXTRACTION
C(·)     → COARSENING
τ(·, B)  → TRAVERSAL / RETRIEVAL
```

Project semantic boundary:

```text
rₙ = Cⁿ(α(X))

rₙ
→ LOSSY PROJECTION
→ MAY BE SUFFICIENT FOR B

rₙ != X

SUFFICIENT(rₙ, B)
↛ SUFFICIENT(rₙ, B′)

INSUFFICIENT / UNKNOWN AT B
→ TRAVERSE / REFINE / HYDRATE

SOURCE X
→ UNCHANGED
```

`SUFFICIENT(r, B)?` remains a semantic judgment. Do not implement it as a deterministic oracle.

## Constitutional separation

```text
TRAVERSAL MECHANICS
→ deterministic where possible

SUFFICIENCY JUDGMENT
→ semantic

STRUCTURAL RETRIEVAL SUCCESS
!=
CONTEXTUAL SUFFICIENCY
```

```text
COMPACTOR
→ MAY PRODUCE DERIVED PROJECTIONS
↛ ESTABLISH TRUTH
↛ ESTABLISH AUTHORITY
↛ RESOLVE UNKNOWN BY OMISSION
↛ AUTHORIZE SOURCE DESTRUCTION
```

## Mechanism matrix

| Prior mechanism | Disposition | Reusable mechanic | Failure surface | §16 / authority boundary |
|---|---|---|---|---|
| Recursive coarsening | **KEEP** | Repeatedly derive lower-resolution representations from richer material | Accumulated lossy distortion / summary-of-summary error | Every generation remains a projection; `Cⁿ(α(X)) != X` |
| Multi-resolution hierarchy | **KEEP** | Maintain coarse-to-fine representations for bounded traversal | Hierarchy may become mistaken for ontology or authority | Resolution level describes representation granularity only |
| Cold-source retention | **KEEP** | Keep richer source outside active context and hydrate only when needed | Storage/provenance burden; stale or missing source binding | Source remains richer; eviction from active context != source destruction |
| Recoverable source handles | **KEEP** | Carry handles from coarse representations toward richer records | Broken/stale handles; similarity substituted for identity | Verify exact refs/hashes where binding is load-bearing |
| Active / external memory split | **KEEP** | Bound active context while retaining richer external material | External store becomes silent semantic owner | Location/persistence != authority |
| Hierarchical traversal / refinement | **KEEP** | Start coarse, descend when current boundary requires more detail | Retrieval success mistaken for sufficient understanding | `τ` returns material; it does not judge contextual sufficiency |
| Token-budget traversal | **MODIFY** | Bound traversal by available processing budget | Budget becomes a proxy for epistemic closure | Resource exhaustion / stop != claim closure |
| Completed-subtrajectory folding | **MODIFY** | Fold completed local work into compact result/state | Premature completion; omitted unresolved dependencies | Local completion != global sufficiency; preserve open hinges/UNKNOWN |
| Iterative compaction checking | **MODIFY** | Compare compressed representation against richer input before sealing | Checker becomes epistemic governor; repeated refinement self-confirms | Validation may test declared preservation conditions; semantic sufficiency stays separate |
| Structured state compression | **MODIFY** | Prefer dense state/evidence/uncertainty/failure representation over prose-only summary where useful | Structure can erase unmodelled distinctions | Schema coverage != complete semantics; unknown distinctions survive as UNKNOWN |
| Geometric / cascading rollover | **TEST** | Trigger coarsening when bounded lower-resolution buffers fill; higher levels update less often | Arbitrary thresholds; compaction schedule becomes behavioral controller | Capacity condition may trigger mechanical compaction only |
| Monotonically decreasing temporal resolution | **TEST** | Keep recent material richer and older material progressively coarser | Age becomes proxy for relevance; old hinge disappears | Age may control default resolution, never semantic worth |
| Tree / DAG retrieval | **TEST** | Link coarse and fine representations when linear retrieval shows friction | Architecture inflation; graph structure gains implied semantics | Add only after observed navigation/query failure; links != authority |
| Asynchronous compaction | **TEST** | Compact off critical path when provenance/currentness can be preserved | Race with live context; stale projection installed after source changes | Installation requires explicit currentness/source binding |
| Post-eviction recalibration | **TEST** | After material active-context eviction, rebuild the working projection from surviving/current material | Ritualized recalibration; unnecessary context churn | Consequence-triggered experimental mechanism, not universal duty |
| Importance / salience scalar as retention authority | **REJECT** | — | Proxy becomes global memory-value controller / Goodhart surface | Use boundary-conditioned sufficiency judgment instead of universal importance authority |
| Automatic summary promotion to fact/state | **REJECT** | — | Derived content silently becomes source truth | `SUMMARY / PROJECTION != SOURCE` |
| Destructive loss of richer source by default | **REJECT** | — | Future boundary cannot recover distinctions omitted by lossy projection | Lossy projection does not authorize source deletion |
| Deterministic `is_sufficient()` oracle | **REJECT** | — | Memory machinery becomes epistemic governor | Sufficiency remains semantic and boundary-conditioned |
| Compressor-issued authorization / next-action authority | **REJECT** | — | Generated plan/action becomes authority through compression | Judgment != authorization; projection contents add no authority |

## Preservation firewall for candidate experiments

A compaction experiment should preserve or explicitly bind, where present and load-bearing:

```text
→ provenance / source references
→ temporal coverage
→ current / superseded relations
→ unresolved UNKNOWN
→ unresolved contradiction
→ consequential decision state
→ open work / unresolved hinge
→ source-binding hashes or exact identities where required
→ explicit lossiness / generation metadata
```

Presence in this list does not mean every field must exist in every compacted object. It means compaction must not silently erase a load-bearing distinction merely because the chosen representation lacks a field for it.

## Post-eviction recalibration hypothesis

Experimental hinge only:

```text
ACTIVE CONTEXT CHANGES MATERIALLY
→ PRIOR CONDITIONING MAY PERSIST BEHAVIORALLY
→ RECALIBRATION MAY REDUCE STALE-FRAME ERROR
```

But:

```text
EVICTION
↛ AUTOMATIC PROOF THAT RECALIBRATION IS REQUIRED
```

Candidate test disposition:

```text
POST-EVICTION RECALIBRATION
→ CANDIDATE FOR CONSEQUENCE-TRIGGERED TESTING
↛ UNIVERSAL MANDATORY RITUAL
```

## Prior-work anchors for the bounded design boundary

Primary reading queue:

1. **Context Compression for LLM Agents — EMNLP 2026 survey**  
   https://aclanthology.org/2026.emnlp-main.2396/
2. **Toward a Theory of Hierarchical Memory for Language Agents — ICLR 2026**  
   https://openreview.net/pdf?id=8GRnzouMjR
3. **Folio: Recoverable Multi-Resolution Context Folding for Long-Horizon Language Agents — arXiv preprint, 2026-11-12**  
   https://arxiv.org/abs/2611.16627
4. **Context Folding — ICML 2026**  
   https://proceedings.mlr.press/v306/sun26x.html
5. **E-mem — ICML 2026**  
   https://proceedings.mlr.press/v306/wang26ee.html
6. **RAPTOR — ICLR 2024**  
   https://proceedings.iclr.cc/paper_files/paper/2024/hash/8a2acd174940dbca361a6398a4f9df91-Abstract-Conference.html

Additional direct/adjacent precedent identified in the bounded search includes RE-TRAC, HMT, MEMENTO, Generative Agents, LSM-tree compaction, exponential histograms / multiscale sliding windows, and generational garbage collection. These are precedent sources, not project authorities.

## Admission rule

A borrowed mechanism earns implementation only if:

```text
MECHANISM
→ ADDRESSES OBSERVED / TESTABLE FAILURE
→ SURVIVES §16 NON-COLLAPSE
→ DOES NOT ACQUIRE UNJUSTIFIED AUTHORITY
→ HAS BOUNDED STRUCTURAL CONTRACT
→ INTRODUCES LESS FAILURE SURFACE THAN IT REMOVES

OTHERWISE
→ DO NOT IMPLEMENT
```

## Current next boundary

```text
IF REOPENED BY MATERIAL HINGE
→ inspect strongest mechanisms at implementation detail
→ extract smallest reusable mechanics
→ define bounded sandbox experiment

OTHERWISE
→ preserve current research disposition
→ no compaction implementation duty

NOT NEXT
→ design a new memory architecture
→ add importance scoring
→ build graph machinery preemptively
→ promote compaction summaries into project state
```
