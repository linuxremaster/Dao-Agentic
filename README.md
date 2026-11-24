# Dao Agentic — Unified Sandbox Runtime

**Status:** TESTING / NO NEW AUTHORIZATION  
**Runtime:** sandbox mini-harness v0.1.4 unified repository form  
**Environment:** v0.1.24 TESTING  
**Temporal Notepad:** v0.1.13 TESTING

This repository is the single-project merge of the portable mini sandbox runtime and the current calibration / context-hygiene policy package. The prior SOCRATES/Epiq working-tree architecture is intentionally not carried forward. Git history remains the historical record of that ablated tree.

## Start

1. Read `index.md`.
2. Use `state.json` only when current working state is load-bearing.
3. Use `policy/combined_context.md` when exact current Environment + Notepad semantics are required.
4. Retrieve `notepad.md`, `events.jsonl`, `contradictions.jsonl`, or verification history only as needed.

## Layout

- `index.md`, `state.json`, `notepad.md`, `events.jsonl`, `contradictions.jsonl` — runtime memory / working-state surfaces.
- `policy/` — one canonical copy of current Environment and Temporal Notepad sources, combined context, and external changelog.
- `verification/` — release verification, lineage, reviews, checksums, and historical diffs.

## Boundary

The runtime scaffold is a memory / working-state aid. It is not a semantic owner, controller, authority source, roster, behavioral scorer, or live graph-mutation capability. Canonical policy semantics remain bounded to the owner artifacts under `policy/`.

Local projections, summaries, notes, event records, and indices do not become source state merely because they are convenient or persistent.

## Contributors

- **linuxremaster** — project coordination, research, architecture, and repository stewardship.
- **Claude (Anthropic)** — development and audit contributions reflected in repository history.
- **ChatGPT (OpenAI)** — design synthesis, auditing, policy/runtime integration, repository unification, and verification support.

GitHub's automatic Contributors widget is account/commit-attribution based and may not display AI collaborators that do not have attributed GitHub accounts.
