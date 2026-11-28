# Dao Agentic

**Status:** TESTING / NO NEW AUTHORIZATION  
**Runtime:** sandbox mini-harness v0.1.4 unified repository form  
**Environment:** v0.1.31 TESTING  
**Temporal Notepad:** v0.1.14 TESTING

Dao Agentic investigates computational metacognition and adaptive self-regulation through the development of an experimental computational metacognitive architecture (CMA). Its research objective is adaptive self-regulation through experience, including the monitoring, evaluation and regulation of cognition. Capability validation remains pending; the current runtime is an experimental working-state and memory scaffold, not a validated CMA.

## Scientific framing

Use established scientific terminology and formalisms wherever they adequately express the distinction. Scientific conformity means conceptual comparability and evidentiary rigor, not mandatory reproduction of existing architectures. Novelty may emerge from research evidence; novelty is not a design objective. The designation Unified Metacognition Runtime (UMR) is retained only as historical research terminology, not an active scientific category. Existing research tracks continue under computational metacognition. The Unified Sandbox Runtime v0.1.4 remains the prototype lineage; no implementation or version change follows from this terminology update.

Terminological precedent: [How metacognitive architectures remember their own thoughts: a systematic scoping review](https://doi.org/10.1007/s10462-026-11669-5) uses computational metacognitive architectures (CMAs) and identifies inconsistent terminology as a barrier to comparison. This supports terminology selection, not validation of Dao Agentic's architecture.

This repository is the single-project merge of the portable mini sandbox runtime and the current calibration / context-hygiene policy package. The prior SOCRATES/Epiq working-tree architecture is intentionally not carried forward. Git history remains the historical record of that ablated tree.

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
- `policy/` — one canonical copy of current Environment and Temporal Notepad sources, the manual combined context paste, external changelog, and shared repository-stewardship requirements.
- `verification/` — release verification, lineage, reviews, checksums, and historical diffs.
- `testing/` — non-authoritative candidate mechanisms/reminders under ordinary-use testing; no implementation mandate.

## Boundary

The runtime scaffold is a memory / working-state aid. It is not a semantic owner, controller, authority source, roster, behavioral scorer, or live graph-mutation capability. Canonical policy semantics remain bounded to the owner artifacts under `policy/`.

Local projections, summaries, notes, event records, and indices do not become source state merely because they are convenient or persistent.

## Contributors

- **linuxremaster** — project coordination, research, architecture, and repository stewardship.
- **Claude (Anthropic)** — development and audit contributions reflected in repository history.
- **ChatGPT (OpenAI)** — design synthesis, auditing, policy/runtime integration, repository unification, and verification support.

AI collaborators are credited in repository metadata and, where GitHub-recognized identities exist, through commit co-author attribution.
