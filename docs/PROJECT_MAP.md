# Project map

Status: v0.1, non-canonical. Updated: 2026-11-04, by CLAUDE-BUILDER at main 57ee56f.

This is where the project stands, not where it is going. The target is deliberately undisclosed, and nothing here states it.

## The rule that stops scope erosion

1. Every work order names the map row(s) it advances.
2. A work order that advances no row is either parked or adds a row first, and that new row is itself reviewed.
3. When work merges, update the row's status and evidence in the same PR.

## Map

Status in this repo:
- BUILT: code and tests on main.
- PARTIAL: some code on main.
- SPEC: specified, no code here.
- CONCEPT: proposed only.
- ELSEWHERE: reproduced outside this repo.

Status is taken from `contracts/organs/organ_registry.json` v0.1.1. Some of those statuses are builder inferences; see `docs/organ-registry.md`.

| Row | Function | In this repo | Evidence | Active work |
|---|---|---|---|---|
| S00 | Deterministic control spine | BUILT | `core/`, `js/core/`, PR #1, #7 | WO-006 (#15): forged-state guard |
| S01 | Event substrate | CONCEPT | none | |
| O00 | Scenario / oracle | CONCEPT | none | |
| O01 | Contract / authority boundary | SPEC | registry only | |
| O02 | Evidence snapshot / provenance | SPEC | registry only | |
| O03 | Coordination / relay lifecycle | SPEC (runs on the Drive bus, not in code) | bus protocol 00-04 | |
| O04 | Friction probe and register | PARTIAL: FP01, FP03 (subset), FP07 | `js/friction/`, PR #14 | |
| O05 | Behavioral fingerprint | ELSEWHERE | registry note | |
| O06 | Canary / drift ledger | CONCEPT | none | |
| O07 | Verification router | SPEC (relaystate.js is on the bus, not in the repo) | registry only | |
| O08 | Challenge / research router | CONCEPT | none | |
| O09 | Wu Wei temporal supervisor | SPEC | registry only | WO-005 (#13): PARKED |
| O10 | Consequential authorization gate | SPEC | registry only | |
| O11 | Bounded actuator | SPEC | registry only | |
| O12 | Effect verification | SPEC | registry only | |
| O13 | Accountability reconstruction (ARC) | SPEC | registry only | |
| O14 | Trace / telemetry | SPEC (runs as bus trace lines plus a scheduled compiler, not in code) | bus 02, state/TRACER.md | |
| O15 | Recovery / stop | PARTIAL (HOLD and recovery transitions in the spine) | `core/predicates.py` | |
| O16 | Promotion / mutation gate | ELSEWHERE | registry note | |
| O17 | Replay / fault / ablation | PARTIAL (deterministic replay in the spine) | `core/reducer.py` replay | |
| O18 | Metrics / scorer | CONCEPT | none | |
| O19 | Wu Wei certification guard | CONCEPT. Never adopt or depend on it (DECISION-AUTH-002). | none | |
| INFRA | CI test workflow | not yet | none | WO-006 (#15) |

## Parked (no row advanced; kept, not deleted)

- KOAN probe
- BIDIR diagram revision
- Verification subject-binding (069 A2)
- relaystate.js ingress (069 B10)
