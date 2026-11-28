# Dao Agentic

**Status:** TESTING / NO NEW AUTHORIZATION  
**Architecture:** Cognitive Architecture (experimental)  
**Engineering realization:** Cognitive Architecture Runtime (experimental; under development)  
**Supporting component:** Sandbox Runtime Library v0.1.4  
**Environment:** v0.1.31 TESTING  
**Temporal Notepad:** v0.1.14 TESTING

Dao Agentic investigates cognition in the context of cognitive science and artificial intelligence through development of an experimental cognitive architecture. Its engineering realization is the Cognitive Architecture Runtime, supported by the Sandbox Runtime Library. The current research focus is computational metacognition; the research objective is adaptive self-regulation through experience, including the monitoring, evaluation and regulation of cognition. The current library prototype (v0.1.4) is a working-state and memory scaffold; the runtime's architectural capabilities remain unvalidated.

## Scientific framing

Use established scientific terminology and formalisms wherever they adequately express the distinction. Scientific conformity means conceptual comparability and evidentiary rigor, not mandatory reproduction of existing architectures. Novelty may emerge from research evidence; novelty is not a design objective. Cognitive architecture is the broader scientific architectural category; computational metacognition is the present research focus, and computational metacognitive architectures (CMAs) are a relevant specialization, not the exclusive category for this project. Cognitive Architecture Runtime and Sandbox Runtime Library are descriptive engineering designations, not claims of standardized scientific categories. Historical project designations (Dao Sandbox Mini Harness, Unified Sandbox Runtime, Unified Metacognition Runtime / UMR) remain recoverable as lineage and retrieval terms only. The existing manifest identifier `harness_name: dao-agentic-unified-runtime` and version strings are retained for compatibility, not as active architecture names. No implementation or version change follows from this terminology update.

Terminological precedent: [How metacognitive architectures remember their own thoughts: a systematic scoping review](https://doi.org/10.1007/s10462-026-11669-5) uses computational metacognitive architectures (CMAs) and identifies inconsistent terminology as a barrier to comparison. This supports terminology selection, not validation of Dao Agentic's architecture.

## Research method

Dao Agentic uses an [evidence-based research method](research/methodology/EVIDENCE_BASED_RESEARCH_METHOD_v0.1.md): normalize project terminology toward established scientific/engineering terms before search; reuse adequate transferable external evidence rather than duplicating research experiments; mechanically verify local implementations separately; and when adequate external evidence is unavailable, use the smallest justified sandbox simulation or naturalistic production/ordinary-work observation capable of resolving the load-bearing uncertainty. Intuition may generate research questions or hypotheses but does not establish effects, requirements, causal attribution, or authorization.

This repository originated in the single-project merge of the earlier sandbox scaffold and the calibration / context-hygiene policy package. The prior SOCRATES/Epiq working-tree architecture is intentionally not carried forward. Git history remains the historical record of that ablated tree.

## Start

1. Read `index.md`.
2. Use `state.json` only when current working state is load-bearing.
3. For manual FIRST_INFERENCE / RECALIBRATION, use `policy/DAO_ENVIRONMENT_PLUS_NOTEPAD_v0.1.31_v0.1.14_CONTEXT_PASTE.md`.
4. Retrieve `notepad.md`, `events.jsonl`, `contradictions.jsonl`, or verification history only as needed.

## Repository flow

Core project principle: [Repository Stewardship](policy/repository_stewardship.md) governs authorized repository updates and shared-artifact distribution; private evidence is not required to be public.

- Private development source: `linuxremaster/Dao-Agentic-Private`.
- Public mirror: `linuxremaster/Dao-Agentic`.
- Accepted shared changes flow **PRIVATE → PUBLIC** in the same update cycle; an accepted private change is not complete while the public mirror is stale.
- Public may omit private-only provenance or coordination material deliberately. Shared policy/runtime artifacts should otherwise remain aligned, and any intentional public divergence should have an explicit distribution reason.

## Layout

- `index.md`, `state.json`, `notepad.md`, `events.jsonl`, `contradictions.jsonl` — runtime memory / working-state surfaces.
- `LICENSE` — Mozilla Public License 2.0 restored from the pre-ablation tree; distribution metadata only.
- `policy/` — current Environment and Temporal Notepad owner artifacts stored once, plus the manual combined context paste, external changelog, and shared repository-stewardship requirements.
- `research/` — shared research methodology, bounded experimental specifications/results, and archival-interoperability standards; no runtime semantic or scientific-validity authority.
- `verification/` — release verification, lineage, reviews, checksums, and historical diffs.
- `testing/` — non-authoritative candidate mechanisms/reminders under ordinary-use testing; no implementation mandate.

## Boundary

The current Sandbox Runtime Library scaffold is a memory / working-state aid. It is not a semantic owner, controller, authority source, roster, behavioral scorer, or live graph-mutation capability. Current policy semantics remain bounded to the owner artifacts under `policy/`.

Local projections, summaries, notes, event records, and indices do not become source state merely because they are convenient or persistent.

## Contributors

- **linuxremaster** — project coordination, research, architecture, and repository stewardship.
- **Claude (Anthropic)** — development and audit contributions reflected in repository history.
- **ChatGPT (OpenAI)** — design synthesis, auditing, policy/runtime integration, repository unification, and verification support.

AI collaborators are credited in repository metadata and, where GitHub-recognized identities exist, through commit co-author attribution.
