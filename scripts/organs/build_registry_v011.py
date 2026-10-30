"""Reproducibly derive organ registry v0.1.1 from the preserved v0.1 source.

Every change from v0.1 is made here, in code, so the transform can be re-run and
reviewed. Values the source does not supply are written as UNSPECIFIED, never
invented. See docs/organ-registry.md for the basis of each change.

Usage: python3 scripts/organs/build_registry_v011.py  (writes contracts/organs/organ_registry.json)
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "contracts/organs/source/SOCRATES_ORGAN_REGISTRY_v0.1_PROPOSED.json"
OUTPUT = ROOT / "contracts/organs/organ_registry.json"

UNSPECIFIED = "UNSPECIFIED"

# Purpose lines quoted from the harness spec section 6 (sha256 07a97946...).
PURPOSE = {
    "O00_SCENARIO_ORACLE": "Own simulation truth, permitted observations, fault injection, logical time, and deterministic environment effects. The actor MUST NOT own the oracle.",
    "O01_CONTRACT_AUTHORITY": "Make objectives, invariants, permitted actions/probes, consequence classes, validity bounds, recovery rules, and scoped authority externally declared rather than model-defined.",
    "O02_EVIDENCE_PROVENANCE": "Preserve what evidence existed at decision time, how it was typed, where it came from, what remained missing, and whether claimed independence is actually established.",
    "O03_COORDINATION_LIFECYCLE": "Maintain deterministic workflow/lifecycle state without trusting payload narration.",
    "O04_FRICTION_PROBE": "Deterministically detect mechanically observable orchestration friction from a frozen evidence packet without becoming policy authority.",
    "O05_BFP": "Provide descriptive longitudinal behavioral measurement without claiming identity, persona, hidden-state cause, or authority.",
    "O06_CANARY_DRIFT": "Run matched, hash-bound contrast tests and preserve baseline changes explicitly over time.",
    "O07_VERIFICATION_ROUTER": "Deterministically perform checks that are actually mechanical and route claims requiring semantic review without laundering structural validity into truth.",
    "O08_CHALLENGE_RESEARCH_ROUTER": "Convert a material challenge or UNKNOWN into the smallest productive evidence-bearing route rather than defaulting to fabricated certainty, dead-end abstention, or unlimited research.",
    "O09_WU_WEI_TEMPORAL": "Expose only transitions justified by current state, history, logical time, authority, constraints, and observations; select the minimum sufficient valid transition.",
    "O10_CONSEQUENTIAL_AUTHORIZATION": "Intercept a concrete action after proposal and before side effects, applying explicit authority and accountability preconditions.",
    "O11_ACTUATOR": "Execute only authorized simulated actions and produce an execution receipt distinct from the later observed effect.",
    "O12_EFFECT_VERIFICATION": "Prevent \"tool returned success\" from becoming \"desired outcome occurred.\"",
    "O13_ARC": "Make consequential execution reconstructible to contemporaneous evidence, scoped authority, verification state, decision, authorization, receipt, and observed outcome without pretending the chain proves correctness.",
    "O14_TRACE_TELEMETRY": "Preserve enough runtime fact to replay, compare, and diagnose without creating another sovereign state store.",
    "O15_RECOVERY_STOP": "Terminate or recover without deleting unresolved epistemic state.",
    "O16_PROMOTION_MUTATION_GATE": "Prevent experimental or structurally valid state from silently becoming load-bearing/canonical state and actively test the gate against bypass mutations.",
    "O17_REPLAY_FAULT_ABLATION": "Run deterministic counterfactuals around stochastic actor behavior by freezing scenario state and changing one organ/rule/fault at a time.",
    "O18_METRICS_SCORER": "Score predeclared observables and costs without collapsing system quality into one compensatory scalar.",
}

# Builder mapping of harness spec section 7.1 runtime groups to organs [INF].
# OFFLINE = not in the per-action run loop (measurement, change control, experiment tooling).
STAGE = {
    "O00_SCENARIO_ORACLE": 1,
    "O01_CONTRACT_AUTHORITY": 2, "O02_EVIDENCE_PROVENANCE": 2,
    "O03_COORDINATION_LIFECYCLE": 3, "O04_FRICTION_PROBE": 3,
    "O07_VERIFICATION_ROUTER": 3, "O08_CHALLENGE_RESEARCH_ROUTER": 3,
    "O09_WU_WEI_TEMPORAL": 4,
    "O13_ARC": 5,
    "O10_CONSEQUENTIAL_AUTHORIZATION": 6,
    "O11_ACTUATOR": 7,
    "O12_EFFECT_VERIFICATION": 8,
    "O14_TRACE_TELEMETRY": 9,
    "O15_RECOVERY_STOP": 10, "O18_METRICS_SCORER": 10,
    "O05_BFP": "OFFLINE", "O06_CANARY_DRIFT": "OFFLINE",
    "O16_PROMOTION_MUTATION_GATE": "OFFLINE", "O17_REPLAY_FAULT_ABLATION": "OFFLINE",
    "O19_WU_WEI_CERTIFICATION_GUARD": "OFFLINE",
}

# Access classes only where the harness spec states them; everything else UNSPECIFIED.
ACCESS = {
    "O00_SCENARIO_ORACLE": "EVALUATOR_ONLY",   # spec: hidden ground truth is oracle-only
    "O11_ACTUATOR": "EFFECTOR_BOUNDARY",       # spec: bounded actuator / execution boundary
}

SPINE_EVIDENCE = [
    "repo linuxremaster/Dao-Agentic main 99819723727259d5b613ad916968e3e687f54ab6: core/, js/core/",
    "tests re-run 2026-10-30 by CLAUDE-BUILDER (DEGRADED independence: same builder): python -m unittest discover -s tests -> OK; node --test js/tests/*.test.js -> 19/19 pass",
    "experiments/numeric_contract/E1_PAYLOAD_READERS.md: payload does not select lifecycle transitions but IS part of history identity",
]

SUBSTRATES = [
    {
        "substrate_id": "S00_DETERMINISTIC_CONTROL_SPINE",
        "name": "Deterministic control spine (WO-001 reference + WO-002R JS candidate)",
        "class": "substrate",
        "implementation_status": "REPRODUCED_EXECUTABLE",
        "purpose": "Strict event admission, lifecycle predicates, pure reducer, replay and history hash. Shared substrate, not an ordinary organ.",
        "evidence_refs": SPINE_EVIDENCE,
        "notes": "Was represented inside O03 in v0.1 as SOURCE_REPORTED_EXISTING. Cross-runtime identity remains HOLD (WO-003B/WO-003C).",
    },
    {
        "substrate_id": "S01_EVENT_SUBSTRATE",
        "name": "Primitive append-only event substrate (proposed)",
        "class": "substrate",
        "implementation_status": "PROPOSED_CONCEPT",
        "purpose": "One minimal append-only event record beneath effect verification, ARC, trace and telemetry, so those become views rather than competing truth stores.",
        "evidence_refs": [
            "SOC-THREAD-051 MISSING_PIECES.md item 8 (O12/O14 ordering defect and proposed repair)",
            "SOC-THREAD-066 audit of the 051 corpus (endorses the repair)",
            "harness spec section 20 item 5 (canonical event substrate unresolved)",
        ],
        "notes": "Wire format and persistence intentionally unchosen. Must carry payload as history-identity-bearing (E1).",
    },
]

O19 = {
    "organ_id": "O19_WU_WEI_CERTIFICATION_GUARD",
    "name": "Wu Wei Certification Guard",
    "class": "root_of_trust_runtime_integrity",
    "implementation_status": "PROPOSED_CONCEPT",
    "adoption": "NOT_ADOPTED",
    "accepted_input_types": ["WW_CERT_RECORD", "WW_ANALOGUE_MANIFEST", "organ_registry", "authority_contract",
                             "protected_test_metadata", "runtime_component_digests", "parent_state_root",
                             "anti_rollback_state", "logical_tick"],
    "deterministic_output_types": ["VALID", "INVALID_SIGNATURE", "ROOT_MISMATCH", "COMPONENT_MISMATCH",
                                   "MISSING_ANALOGUE", "UNAUTHORIZED_REVISION", "ROLLBACK_DETECTED",
                                   "CERTIFICATION_STALE", "RECERTIFICATION_REQUIRED"],
    "invariants": ["INVALID != DEGRADED_NORMAL_OPERATION", "MISMATCH -> ordinary ACT blocked",
                   "MISSING WU WEI BASIS -> ordinary runtime unreachable", "RUNTIME CANNOT SELF-CERTIFY",
                   "BREAK_GLASS CANNOT RESTORE NORMAL"],
    "dependencies": [],
    "failure_modes": ["exposes ordinary high-consequence actuator paths on failure"],
    "tests": [UNSPECIFIED],
    "evidence_refs": ["SOCRATES_WU_WEI_CERTIFICATION_STATE_BINDING_SPEC_v0.1_PROPOSED.md section 6 (sha256 ba7c68a4...)"],
    "implementation_note": (
        "PROPOSED / NON-CANONICAL / NOT YET IMPLEMENTED (operator clarification, DECISION-AUTH-002). "
        "Not adopted or activated; no organ may depend on it. The source spec's requirement that O19 be "
        "logically prior to all runtime organs is NOT applied here. Signing, key custody, rollback protection, "
        "schema constraints and certification authority are unresolved."
    ),
    "purpose": "Bind runtime state to a certified Wu Wei functional-analogue basis so tampering blocks ordinary operation (source spec intent; not adopted).",
}


def build():
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    organs = []
    for o in source["organs"]:
        oid = o["organ_id"]
        deps = list(o["dependencies"])
        note = o["implementation_status"]
        status = o["status"]
        evidence = []
        if oid == "O03_COORDINATION_LIFECYCLE":
            deps = ["S00_DETERMINISTIC_CONTROL_SPINE"] + deps
            status = "PENDING_INTEGRATION"
            note = "v0.1.1: spine moved to substrate S00; O03 is the coordination/relay projection over it."
            evidence = ["Drive relay bus protocol v0.1 + Addendum A (operational, not implemented as code)"]
        if oid == "O12_EFFECT_VERIFICATION":
            deps = [d for d in deps if d != "O14_TRACE_TELEMETRY"] + ["S01_EVENT_SUBSTRATE"]
            note += " | v0.1.1: dependency on O14 (runs later) replaced by S01_EVENT_SUBSTRATE."
        if oid == "O14_TRACE_TELEMETRY":
            deps = deps + ["S01_EVENT_SUBSTRATE"]
            note += " | v0.1.1: trace becomes a projection over S01_EVENT_SUBSTRATE."
        if oid == "O16_PROMOTION_MUTATION_GATE":
            evidence = ["previous working-state reproduction (56/56, 15/15, 19/19); implementation bytes not in this repository"]
        if oid == "O05_BFP":
            evidence = ["BFP v0.2.1 test suite PASS in SOC-THREAD-64-66 audit; implementation bytes not in this repository"]
        organs.append({
            "organ_id": oid,
            "name": o["name"],
            "class": o["class"],
            "organ_version": "0.1.1",
            "implementation_status": status,
            "implementation_note": note,
            "purpose": PURPOSE[oid],
            "trigger": UNSPECIFIED,
            "accepted_input_types": o["inputs"],
            "required_input_grades": UNSPECIFIED,
            "deterministic_output_types": o["deterministic_outputs"],
            "side_effect_class": UNSPECIFIED,
            "invariants": o["invariants"],
            "dependencies": deps,
            "authority_requirement": UNSPECIFIED,
            "failure_modes": o["failure_modes"],
            "tests": o["tests"],
            "stop_condition": UNSPECIFIED,
            "trace_fields": UNSPECIFIED,
            "access_class": ACCESS.get(oid, UNSPECIFIED),
            "runtime_stage": STAGE[oid],
            "evidence_refs": evidence,
        })
    o19 = dict(O19)
    o19.update({"organ_version": "0.1.1", "trigger": UNSPECIFIED, "required_input_grades": UNSPECIFIED,
                "side_effect_class": UNSPECIFIED, "authority_requirement": UNSPECIFIED,
                "stop_condition": UNSPECIFIED, "trace_fields": UNSPECIFIED,
                "access_class": UNSPECIFIED, "runtime_stage": STAGE["O19_WU_WEI_CERTIFICATION_GUARD"]})
    organs.append(o19)
    return {
        "registry_version": "0.1.1",
        "status": "PROPOSED_NON_CANONICAL",
        "authority": "NON_AUTHORITATIVE",
        "work_order": "WO-004 Phase A",
        "source": {
            "registry": "contracts/organs/source/SOCRATES_ORGAN_REGISTRY_v0.1_PROPOSED.json",
            "registry_sha256": "783c825d22a752fd8312b8dd92a41c1849bdf8301e1ffd2071bff2fe0eacb949",
            "harness_spec": "SOCRATES_EXECUTABLE_ORGAN_SIMULATION_HARNESS_SPEC_v0.1_PROPOSED.md",
            "harness_spec_sha256": "07a97946e62aed2af79fa02af4639e49575cdb3f807e46fccb7fe52f0f54fc5d",
        },
        "status_vocabulary": source["status_vocabulary"],
        "access_class_vocabulary": ["ACTOR_CALLABLE", "HARNESS_INTERNAL", "EVALUATOR_ONLY", "EFFECTOR_BOUNDARY", UNSPECIFIED],
        "contract_fields": ["organ_id", "organ_version", "implementation_status", "purpose", "trigger",
                            "accepted_input_types", "required_input_grades", "deterministic_output_types",
                            "side_effect_class", "invariants", "dependencies", "authority_requirement",
                            "failure_modes", "tests", "stop_condition", "trace_fields",
                            "access_class", "runtime_stage", "evidence_refs"],
        "runtime_stage_basis": "Builder mapping of harness spec section 7.1 runtime groups to organs [INF]. OFFLINE = outside the per-action run loop.",
        "substrates": SUBSTRATES,
        "organs": organs,
    }


if __name__ == "__main__":
    OUTPUT.write_text(json.dumps(build(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
