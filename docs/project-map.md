# Dao-Agentic project map v0

> Navigation artifact, not an authority grant.  
> Snapshot baseline: `main@57ee56f61e47544a570eee039d352448d955d0b8` on 2026-11-04.

## Purpose

Build from the existing small deterministic control spine toward a usable evidence-responsive harness without pretending missing capabilities already exist.

Minimality is a starting constraint, not the product.

## What exists now

The repository currently implements:

- a four-field event contract: `event_id`, `sequence`, `kind`, `payload`;
- hard lifecycle admission predicates;
- pure Python and JavaScript reducers;
- replay from a caller-supplied ordered event history;
- a rolling SHA-256 history commitment;
- Python / JavaScript conformance tests and documented numeric HOLD cases.

The current core does **not** itself provide durable persistence, automatic logging, a provenance graph, a graph renderer, provider adapters, an authorization service, or an independent semantic verifier.

## Current work

| Item | State | Purpose |
| --- | --- | --- |
| [WO-006 #15](https://github.com/linuxremaster/Dao-Agentic/issues/15) | OPEN | CI workflow + forged-state guard |
| [WO-005 #13](https://github.com/linuxremaster/Dao-Agentic/issues/13) | OPEN / NON-RUNTIME | Ambiguity action-regulation measurement validity |
| [DOC #3](https://github.com/linuxremaster/Dao-Agentic/issues/3) | OPEN / DOC | Context-integrity and training-data-filter framing |
| [WO-004 #10](https://github.com/linuxremaster/Dao-Agentic/issues/10) | CLOSED | Organ registry + Friction Probe work order |

## Outcome milestones

These are project-navigation milestones. They do not authorize implementation by themselves.

### M1 — Trustworthy kernel

A caller cannot manufacture a privileged state, and every checked-in runtime path is continuously tested.

Minimum evidence:
- CI runs Python and JavaScript suites on push / pull request;
- forged caller-constructed state is rejected;
- replay and normal stepwise reduction remain valid;
- current lifecycle/conformance tests remain green.

Current work: WO-006 #15.

### M2 — Durable observability

The harness can show what actually happened without relying on conversational memory.

Minimum evidence:
- admitted events can be durably retained outside the pure reducer;
- an append-only operation/event log is produced mechanically;
- restart/recovery can replay from retained history;
- log entries identify target/version/result rather than only narrative text;
- failures to record are visible failures, not silent omissions.

No current work order establishes this milestone.

### M3 — Provenance and subject binding

Verification and derived state are bound to the thing they claim to describe.

Minimum evidence:
- outputs/artifacts have stable identifiers or hashes;
- verification records bind to a specific subject/version;
- provenance links are mechanically derivable from retained events;
- a derived graph can be rebuilt from those records;
- graph edges distinguish observed relations from model-authored claims.

No current work order establishes this milestone.

### M4 — External effect boundary

Conversational reasoning can request an external effect without pretending the conversation itself created it.

Minimum evidence:
- typed requests reach explicit provider/filesystem actions;
- actual provider permissions determine whether an effect is allowed;
- returned provider IDs/hashes/versions become the evidence of effect;
- attempted, rejected, and completed effects are logged;
- GitHub/Drive/filesystem actions remain provider reality, not model-declared state.

No generic adapter layer currently exists in this repository.

### M5 — Optimization and evaluation

Only after the harness can observe and bind its own behavior should optimization claims become load-bearing.

Minimum evidence:
- measurable objective(s) and costs are stated;
- optimization does not reduce required capability below adequacy;
- behavioral evaluation is vocabulary-blind where construct contamination is possible;
- project terminology is not treated as measurement evidence.

WO-005 #13 is relevant to measurement validity but does not establish an optimizer or runtime control policy.

## Immediate sequence

`M1 -> M2 -> M3 -> M4 -> M5`

This ordering is provisional. A later milestone may begin early when a concrete dependency requires it, but missing earlier capabilities must remain visible rather than being filled in conversationally.

## Anti-inflation rule

When describing the repository, distinguish:

- **implemented** — present in code and testable;
- **current work** — bounded by an open work order;
- **candidate milestone** — useful project direction, not yet implementation scope;
- **concept / hypothesis** — not a repository capability.

Do not promote one category into another by repetition, analogy, summary, or agreement.
