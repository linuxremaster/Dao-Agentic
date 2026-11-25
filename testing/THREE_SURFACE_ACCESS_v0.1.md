# Three-Surface Access v0.1

**Status:** PRIOR-WORK-SUPPORTED SYNTHESIS / GENERALIZATION / BOUNDED SEARCH COMPLETE FOR CURRENT HINGE / NO IMPLEMENTATION AUTHORITY  
**Evidence boundary:** exact precedent was not found in the bounded search; this is **not** a novelty claim.  
**Scope:** preserve the missing abstraction recovered from SOC-THREAD-092's final discussion and the bounded academic synthesis that followed. Do not promote it into architecture or build new machinery from it.  
**Provenance:** reconstructed from the surviving SOC-THREAD-092 transcript, contemporaneous SOC-THREAD-093 recollection, repository artifacts, and a bounded academic search completed by SOC-THREAD-094. Repository presence adds no authority.

## Synthesis

```text
SURFACES
→ TOOL
→ MEMORY
→ OBSERVE

COMMON OPERATION
→ BOUNDARY-CONDITIONED PROGRESSIVE DISCLOSURE
```

Let:

```text
S = RICHER AVAILABLE SURFACE
B = CURRENT DECISION BOUNDARY
C = STRUCTURAL / COST / PERMISSION CONSTRAINTS

R = ACCESSIBLE(S, B, C)
```

Then:

```text
R
→ BOUNDED CANDIDATE PROJECTION

R ↛ S
```

The exposed result is a boundary-conditioned view over a richer available surface. Exposure does not exhaust, replace, define, or destroy that surface.

## Two-sided failure boundary

The bounded search found direct precedent for both failure directions.

```text
TOO LITTLE EXPOSURE
→ OMISSION / ALIASING / INSUFFICIENCY

TOO MUCH EXPOSURE
→ DISTRACTION / UTILIZATION DEGRADATION / COST

THEREFORE

BOUNDED EXPOSURE
+ RECOVERY TOWARD RICHER SOURCE
```

Selective exposure is therefore not treated as inherently correct. It is useful only while the current projection remains sufficient for the load-bearing boundary.

## Recovery / non-collapse firewall

```text
ACTIVE VIEW != SOURCE

NOT EXPOSED ↛ NOT AVAILABLE
NOT RETRIEVED ↛ IRRELEVANT
FILTER MISS ↛ ABSENCE

R INSUFFICIENT / UNKNOWN
→ EXPAND
→ RELAX
→ DRILL DOWN
→ RETURN TOWARD RICHER SOURCE
```

The design hinge remains:

> **Existence does not create an obligation to expose.**

Equivalently:

```text
AVAILABLE
!= ACTIVE

PERSISTENT
!= SALIENT

ACCESSIBLE
!= CURRENTLY EXPOSED

NOT EXPOSED
!= DESTROYED / IRRELEVANT / ABSENT
```

## Anti-attractor / authority firewall

Selective access changes what is salient to downstream inference even when the richer source remains unchanged.

```text
REPETITION
SALIENCE
PERSISTENCE
LOCAL SUCCESS
↛ ACCRUED AUTHORITY
```

Compactly:

```text
ATTENTION HISTORY
↛ AUTHORITY
```

This is a project-specific synthesis layer over the selective-access mechanisms. The bounded search found strong precedent for selective retrieval, active perception, limited active context, and recovery after insufficient retrieval; it did **not** establish that repeated exposure should acquire epistemic or operational authority.

## Anti-reification boundary

```text
THREE SURFACES
↛ THREE SUBSYSTEMS
↛ THREE MANAGERS
↛ EXACTLY-THREE OPTIMALITY CLAIM
```

`TOOL`, `MEMORY`, and `OBSERVE` are candidate exposed access surfaces. Each may front many heterogeneous backend objects. This synthesis does not prescribe a dedicated controller, manager, store, scheduler, scoring function, or traversal authority for any surface.

```text
INTERFACE
↛ MANAGER

FILTER
↛ AUTHORITY

ACCESSIBILITY
↛ RELEVANCE TRUTH

RELEVANCE
↛ SUFFICIENCY
```

## Bounded academic support

The search was organized by mechanism family rather than by novelty language.

### TOOL — direct precedent

- **AnyTool: Self-Reflective, Hierarchical Agents for Large-Scale API Calls** (Du, Wei, Zhang, 2024; ICML 2024 / arXiv:2402.04253). Hierarchical API retrieval selects candidate tools from a much larger library; self-reflection can reactivate retrieval when the initial candidate set proves impracticable. Supports bounded tool exposure plus recovery after an insufficient first projection.
- **Tulip Agent — Enabling LLM-Based Agents to Solve Tasks Using Large Tool Libraries** (Ocker, Tanneberg, Eggert, Gienger, 2024; arXiv:2407.21778). Does not encode all available tool descriptions in the active prompt; recursively searches an extensible tool library instead. Direct support for `NOT EXPOSED ↛ NOT AVAILABLE`.
- **EcoAct: Economic Agent Determines When to Register What Action** (Zhang et al., 2024; arXiv:2411.01643). Selectively registers tools as needed rather than retaining all candidate tools in context. Supports task/step-conditioned tool exposure.

### MEMORY — direct precedent

- **MemGPT: Towards LLMs as Operating Systems** (Packer et al., 2023; arXiv:2310.08560). Uses hierarchical memory tiers and moves information between a limited active context and richer external memory. Direct precedent for `AVAILABLE MEMORY > ACTIVE MEMORY`; its stronger OS/controller metaphor is not inherited here.
- **HiAgent: Hierarchical Working Memory Management for Solving Long-Horizon Agent Tasks with Large Language Model** (Hu et al., 2024/2025). Retains action-observation pairs relevant to the current subgoal while summarizing/replacing prior working-memory material. Direct precedent for boundary/subgoal-conditioned active memory.
- **Generative Agents: Interactive Simulacra of Human Behavior** (Park et al., UIST 2023). Stores a complete natural-language record of experience, synthesizes higher-level reflections, and dynamically retrieves memories for planning. Partial precedent connecting richer experience storage, observation, and selective active memory.

### OBSERVE — direct precedent

- **Towards Active Perception in Situated Multi-Agent Systems** (Weyns, Steegmans, Holvoet, 2004). Directs perception toward aspects of the environment relevant to the current task using selected foci and filters. Strong direct precedent for task-conditioned observation exposure.
- **Learning to Perceive and Act by Trial and Error** (Whitehead & Ballard, 1991). Active perception learns where to focus sensory attention, while explicitly identifying **perceptual aliasing**: selective internal representations can conflate distinct external states. This is direct support for the insufficiency/recovery boundary.

### AVAILABLE > ACTIVE — strong computational / cognitive analogs

- **Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer** (Shazeer et al., ICLR 2017). A much larger available parameter capacity exists while a router activates only a sparse input-conditioned subset. Strong computational analog for `AVAILABLE ↛ ACTIVE`, but not an agent access-surface architecture.
- **Access to Information in Working Memory: Exploring the Focus of Attention** (Oberauer, 2002). Distinguishes activated long-term memory, a limited region of direct access, and a still narrower focus of attention. Strong cognitive analog for available/accessed/focused state separation, not an LLM engineering prescription.

### SUFFICIENCY / OVEREXPOSURE — direct failure evidence

- **Lost in the Middle: How Language Models Use Long Contexts** (Liu et al., TACL 2024). Shows that merely making more context available does not guarantee robust use of relevant information; utilization can degrade with long context and information position. Supports the `TOO MUCH EXPOSURE` side of the boundary.
- **Sufficient Context: A New Lens on Retrieval Augmented Generation Systems** (Joren et al., 2024/ICLR 2025). Separates retrieval/context presence from whether the supplied context is sufficient to answer the query. Direct support for `RELEVANCE != SUFFICIENCY`.

### Cross-surface partial precedents

- **Voyager** (Wang et al., 2023/2024) couples retrieval from an expanding executable skill library with environment feedback and execution errors: partial TOOL/SKILL + OBSERVE precedent.
- **Generative Agents** couples observation history with selective memory retrieval: partial MEMORY + OBSERVE precedent.
- Recent systems increasingly combine tool and memory retrieval. A 2026 repository work, **Volt: A Unified RAG Architecture for Tool Selection, Context Engineering, and Autonomous Agent Memory**, extends dynamic retrieval across many context kinds. It is close in engineering direction but is not treated here as established peer-reviewed support for the exact formulation.

## Evidence disposition

```text
SELECTIVE TOOL EXPOSURE
→ ESTABLISHED PRIOR WORK

SELECTIVE / HIERARCHICAL MEMORY
→ ESTABLISHED PRIOR WORK

TASK-CONDITIONED ACTIVE PERCEPTION
→ ESTABLISHED PRIOR WORK

AVAILABLE CAPACITY > ACTIVE CAPACITY
→ ESTABLISHED COMPUTATIONAL + COGNITIVE PRECEDENT

RETRIEVAL RELEVANCE != CONTEXT SUFFICIENCY
→ DIRECT PRECEDENT

RECOVERY AFTER INSUFFICIENT PROJECTION
→ PRIOR PRECEDENT EXISTS
```

Within the bounded search:

```text
ONE COMMON NON-DESTRUCTIVE ACCESS ABSTRACTION
OVER
{ TOOL, MEMORY, OBSERVE }

+
SOURCE-RECOVERY FIREWALL

+
NO ACCRUED AUTHORITY FROM
FILTERING / EXPOSURE / SALIENCE

→ EXACT PRECEDENT NOT FOUND
→ ↛ NOVELTY CLAIM
```

The conservative claim is therefore:

```text
THREE-SURFACE ACCESS
→ PRIOR-WORK-SUPPORTED SYNTHESIS / GENERALIZATION
↛ UNPRECEDENTED MECHANISM
↛ NOVELTY ESTABLISHED
```

## Relation to §16 and §16+

```text
§16+
→ LOCAL SYNTHESIS SHORTHAND / NOT POLICY SECTION OR VERSION
→ NO INDEPENDENT POLICY OR IMPLEMENTATION AUTHORITY
```

The relationship is intentionally asymmetric and non-collapsing:

```text
§16
→ NON-COLLAPSE OF PROJECTION INTO SOURCE

THREE-SURFACE ACCESS
→ NON-COLLAPSE OF AVAILABLE SURFACE INTO ACTIVE SURFACE

§16+
→ RELEASE STALE / RESOLVED BOUNDARIES
→ CONDITIONED SOURCE RE-ANCHOR
→ PROJECTION SALIENCE HAS NO ACCRUED AUTHORITY
```

Operationally:

```text
BOUNDARY-CONDITIONED DISCLOSURE
→ LOCAL PROJECTION
→ LOCAL RESOLUTION
→ RELEASE
→ CONDITIONED SOURCE RE-ANCHOR
```

This synthesis does not modify `policy/environment.md`, Temporal Notepad semantics, or the executable §16 candidate.

## Search stop condition

The bounded academic search stopped when convergence queries ceased producing new mechanism families and instead returned additional variants of:
- tool retrieval / tool filtering;
- hierarchical or selective memory retrieval;
- active perception / selective sensing;
- sparse conditional computation;
- pairwise combinations among tools, memory, skills, and observations.

At that point, more searching would primarily enlarge the bibliography rather than change the current disposition.

```text
BOUNDED SEARCH COMPLETE FOR CURRENT HINGE
↛ LITERATURE EXHAUSTED
↛ EXACT PRECEDENT IMPOSSIBLE
↛ NOVELTY ESTABLISHED
```

## Current disposition

```text
PRESERVE SYNTHESIS
→ YES

IMPLEMENT NEW ACCESS ARCHITECTURE
→ NO

ADD THREE MANAGERS / SUBSYSTEMS
→ NO

CONTINUE SEARCH NOW
→ NO

REOPEN SEARCH
→ ONLY IF A LATER LOAD-BEARING CLAIM / DESIGN DECISION REQUIRES IT
```

Do not operationalize further until ordinary work exposes a concrete need or discriminating test surface.
