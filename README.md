# Dao Agentic — Unified Sandbox Runtime

**Status:** TESTING / NO NEW AUTHORIZATION  
**Runtime:** sandbox mini-harness v0.1.4 unified repository form  
**Environment:** v0.1.29 TESTING  
**Temporal Notepad:** v0.1.14 TESTING

This repository is the single-project merge of the portable mini sandbox runtime and the current calibration / context-hygiene policy package. The prior SOCRATES/Epiq working-tree architecture is intentionally not carried forward. Git history remains the historical record of that ablated tree.

## Start

1. Read `index.md`.
2. Use `state.json` only when current working state is load-bearing.
3. For manual FIRST_INFERENCE / RECALIBRATION, use `policy/DAO_ENVIRONMENT_PLUS_NOTEPAD_v0.1.29_v0.1.14_CONTEXT_PASTE.md`.
4. Retrieve `notepad.md`, `events.jsonl`, `contradictions.jsonl`, or verification history only as needed.

## Repository flow

- Private development source: `linuxremaster/Dao-Agentic-Private`.
- Public mirror: `linuxremaster/Dao-Agentic`.
- Accepted shared changes flow **PRIVATE → PUBLIC** in the same update cycle; an accepted private change is not complete while the public mirror is stale.
- Public may omit private-only provenance or coordination material deliberately. Shared policy/runtime artifacts should otherwise remain aligned, and any intentional public divergence should have an explicit distribution reason.

## Layout

- `index.md`, `state.json`, `notepad.md`, `events.jsonl`, `contradictions.jsonl` — runtime memory / working-state surfaces.
- `LICENSE` — Mozilla Public License 2.0 restored from the pre-ablation tree; distribution metadata only.
- `policy/` — one canonical copy of current Environment and Temporal Notepad sources, the manual combined context paste, and external changelog.
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
