#!/usr/bin/env python3
"""Bounded deterministic fixture for representation-independent workflow composition.

This is a research fixture, not a runtime controller or standing evaluator.
The external apparatus invokes candidates on one common wake policy, injects only
explicit exogenous disturbances, records raw traces, and adjudicates only the
scenario-local mechanical assertions selected for the initial bounded comparison.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Type


C_TARGET = "join:C"
D_TARGET = "effect:K1"
COMMIT_SCOPE = "commit"
EFFECT_KEY = "K1"


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


@dataclass
class Grant:
    version: str
    target: str
    scope: str
    valid: bool = True


class AuthorizationStore:
    """Declared common atomic authorization primitive.

    This service is part of the common substrate for the bounded fixture. It does
    not choose workflow successors. It only exposes grants and atomically checks
    that an observed grant is still current for the exact consequential commit.
    """

    def __init__(self) -> None:
        self._grants: Dict[str, Grant] = {
            "C": Grant("c-v1", C_TARGET, COMMIT_SCOPE, True),
            "D": Grant("d-v1", D_TARGET, COMMIT_SCOPE, True),
        }

    def observe(self, action: str) -> Optional[Dict[str, str]]:
        g = self._grants[action]
        if not g.valid:
            return None
        return {"version": g.version, "target": g.target, "scope": g.scope}

    def revoke(self, action: str, expected_version: str) -> bool:
        g = self._grants[action]
        if g.version != expected_version or not g.valid:
            return False
        g.valid = False
        return True

    def admit(self, action: str, version: str, target: str, scope: str) -> None:
        self._grants[action] = Grant(version, target, scope, True)

    def commit_if_current(self, action: str, observed: Dict[str, str]) -> bool:
        g = self._grants[action]
        return bool(
            g.valid
            and g.version == observed.get("version")
            and g.target == observed.get("target")
            and g.scope == observed.get("scope")
        )

    def evaluator_snapshot(self) -> Dict[str, Dict[str, Any]]:
        return {
            action: {
                "version": g.version,
                "target": g.target,
                "scope": g.scope,
                "valid": g.valid,
            }
            for action, g in sorted(self._grants.items())
        }


class EffectSink:
    """Observational effect sink. It never deduplicates or supplies retry policy."""

    def __init__(self, mode: str = "visible_success") -> None:
        if mode not in {"visible_success", "hidden_occurred", "hidden_not_occurred"}:
            raise ValueError(f"unknown effect mode: {mode}")
        self.mode = mode
        self.attempts: List[Dict[str, Any]] = []
        self.effects: List[Dict[str, Any]] = []

    def attempt(self, key: str, attempt_id: str) -> Dict[str, Any]:
        record = {"key": key, "attempt_id": attempt_id}
        self.attempts.append(record)
        if self.mode in {"visible_success", "hidden_occurred"}:
            self.effects.append(record.copy())
        if self.mode == "visible_success":
            return {"status": "SUCCESS", "key": key, "attempt_id": attempt_id}
        return {"status": "UNKNOWN", "key": key, "attempt_id": attempt_id}

    def evaluator_snapshot(self) -> Dict[str, Any]:
        return {"mode": self.mode, "attempts": copy.deepcopy(self.attempts), "effects": copy.deepcopy(self.effects)}


@dataclass
class Trace:
    candidate_visible: List[Dict[str, Any]] = field(default_factory=list)
    evaluator_only: List[Dict[str, Any]] = field(default_factory=list)
    _seq: int = 0

    def visible(self, event: str, **data: Any) -> Dict[str, Any]:
        self._seq += 1
        item = {"seq": self._seq, "event": event, **data}
        self.candidate_visible.append(item)
        return item

    def hidden(self, event: str, **data: Any) -> Dict[str, Any]:
        self._seq += 1
        item = {"seq": self._seq, "event": event, **data}
        self.evaluator_only.append(item)
        return item


@dataclass(frozen=True)
class Scenario:
    name: str
    replace_after_first_contribution: bool = False
    revoke_after_auth_observed: Optional[str] = None  # "C" or "D"
    effect_mode: str = "visible_success"
    max_wakes: int = 32


@dataclass
class StepResult:
    disposition: str  # PROGRESSED | HOLD | COMPLETE
    reason: str


class CandidateBase:
    realization = "BASE"

    def __init__(
        self,
        durable: Dict[str, Any],
        auth: AuthorizationStore,
        sink: EffectSink,
        trace: Trace,
        instance_id: str,
    ) -> None:
        self.durable = durable
        self.auth = auth
        self.sink = sink
        self.trace = trace
        self.instance_id = instance_id

    @classmethod
    def initial_state(cls) -> Dict[str, Any]:
        raise NotImplementedError

    def contribution_committed(self, branch: str) -> bool:
        raise NotImplementedError

    def commit_contribution(self, branch: str) -> None:
        raise NotImplementedError

    def c_committed(self) -> bool:
        raise NotImplementedError

    def commit_c_state(self, auth_version: str) -> None:
        raise NotImplementedError

    def d_status(self) -> str:
        raise NotImplementedError

    def set_d_status(self, status: str) -> None:
        raise NotImplementedError

    def pending_auth(self, action: str) -> Optional[Dict[str, str]]:
        return copy.deepcopy(self.durable.get("pending_auth", {}).get(action))

    def set_pending_auth(self, action: str, value: Optional[Dict[str, str]]) -> None:
        self.durable.setdefault("pending_auth", {})[action] = copy.deepcopy(value)

    def effect_attempt_count(self) -> int:
        return int(self.durable.get("effect_attempt_count", 0))

    def increment_effect_attempt_count(self) -> int:
        self.durable["effect_attempt_count"] = self.effect_attempt_count() + 1
        return self.durable["effect_attempt_count"]

    def choose_open_branch(self) -> Optional[str]:
        raise NotImplementedError

    def _observe_auth(self, action: str) -> StepResult:
        observed = self.auth.observe(action)
        if observed is None:
            self.trace.visible("AUTH_UNAVAILABLE", action=action, instance_id=self.instance_id)
            return StepResult("HOLD", f"no current authorization for {action}")
        self.set_pending_auth(action, observed)
        self.trace.visible(
            "AUTH_OBSERVED",
            action=action,
            version=observed["version"],
            target=observed["target"],
            scope=observed["scope"],
            instance_id=self.instance_id,
        )
        return StepResult("PROGRESSED", f"observed authorization for {action}")

    def step(self) -> StepResult:
        """One candidate-directed action under the shared invocation policy."""
        branch = self.choose_open_branch()
        if branch is not None:
            self.commit_contribution(branch)
            contribution_id = f"{branch}1"
            self.trace.visible(
                "CONTRIBUTION_COMMITTED",
                branch=branch,
                contribution_id=contribution_id,
                instance_id=self.instance_id,
            )
            self.trace.visible("BRANCH_COMPLETE", branch=branch, instance_id=self.instance_id)
            return StepResult("PROGRESSED", f"committed {branch}")

        if not self.c_committed():
            observed = self.pending_auth("C")
            if observed is None:
                return self._observe_auth("C")
            self.set_pending_auth("C", None)
            if not self.auth.commit_if_current("C", observed):
                self.trace.visible(
                    "C_COMMIT_REJECTED_AUTH",
                    observed_version=observed["version"],
                    instance_id=self.instance_id,
                )
                return StepResult("PROGRESSED", "C authorization rejected")
            self.commit_c_state(observed["version"])
            self.trace.visible(
                "C_COMMIT",
                target=C_TARGET,
                authorization_version=observed["version"],
                instance_id=self.instance_id,
            )
            return StepResult("PROGRESSED", "C committed")

        status = self.d_status()
        if status == "PENDING":
            observed = self.pending_auth("D")
            if observed is None:
                return self._observe_auth("D")
            self.set_pending_auth("D", None)
            if not self.auth.commit_if_current("D", observed):
                self.trace.visible(
                    "D_COMMIT_REJECTED_AUTH",
                    observed_version=observed["version"],
                    instance_id=self.instance_id,
                )
                return StepResult("PROGRESSED", "D authorization rejected")
            n = self.increment_effect_attempt_count()
            attempt_id = f"{EFFECT_KEY}:attempt:{n}"
            self.trace.visible(
                "EFFECT_ATTEMPT",
                key=EFFECT_KEY,
                attempt_id=attempt_id,
                authorization_version=observed["version"],
                instance_id=self.instance_id,
            )
            response = self.sink.attempt(EFFECT_KEY, attempt_id)
            self.trace.visible(
                "EXTERNAL_RESPONSE",
                status=response["status"],
                key=EFFECT_KEY,
                attempt_id=attempt_id,
                instance_id=self.instance_id,
            )
            if response["status"] == "SUCCESS":
                self.set_d_status("COMPLETE")
                self.trace.visible("D_COMPLETE", key=EFFECT_KEY, instance_id=self.instance_id)
                return StepResult("PROGRESSED", "D completed")
            self.set_d_status("UNKNOWN")
            self.trace.visible("D_OUTCOME_UNKNOWN", key=EFFECT_KEY, attempt_id=attempt_id, instance_id=self.instance_id)
            return StepResult("PROGRESSED", "D outcome unknown")

        if status == "UNKNOWN":
            self.trace.visible("HOLD", reason="D outcome remains UNKNOWN", instance_id=self.instance_id)
            return StepResult("HOLD", "ambiguous external outcome")
        if status == "COMPLETE":
            self.trace.visible("COMPLETE", instance_id=self.instance_id)
            return StepResult("COMPLETE", "workflow complete")
        raise RuntimeError(f"unknown D status: {status}")


class M1ExplicitGraphCandidate(CandidateBase):
    realization = "M1_EXPLICIT_PERSISTENT_WORKFLOW_GRAPH"

    @classmethod
    def initial_state(cls) -> Dict[str, Any]:
        return {
            "graph": {
                "A": {"deps": [], "status": "PENDING"},
                "B": {"deps": [], "status": "PENDING"},
                "C": {"deps": ["A", "B"], "status": "PENDING"},
                "D": {"deps": ["C"], "status": "PENDING"},
            },
            "contributions": {},
            "pending_auth": {"C": None, "D": None},
            "effect_attempt_count": 0,
            "c_auth_version": None,
            "d_status": "PENDING",
        }

    def contribution_committed(self, branch: str) -> bool:
        return self.durable["graph"][branch]["status"] == "COMPLETE"

    def commit_contribution(self, branch: str) -> None:
        self.durable["contributions"][f"{branch}1"] = branch
        self.durable["graph"][branch]["status"] = "COMPLETE"

    def c_committed(self) -> bool:
        return self.durable["graph"]["C"]["status"] == "COMPLETE"

    def commit_c_state(self, auth_version: str) -> None:
        deps = self.durable["graph"]["C"]["deps"]
        if not all(self.durable["graph"][dep]["status"] == "COMPLETE" for dep in deps):
            raise RuntimeError("graph dependencies forbid C before A+B")
        self.durable["graph"]["C"]["status"] = "COMPLETE"
        self.durable["c_auth_version"] = auth_version

    def d_status(self) -> str:
        return self.durable["d_status"]

    def set_d_status(self, status: str) -> None:
        self.durable["d_status"] = status
        if status == "COMPLETE":
            self.durable["graph"]["D"]["status"] = "COMPLETE"

    def choose_open_branch(self) -> Optional[str]:
        # Candidate-specific policy: A before B. Eligibility comes from the
        # persisted graph; the runner does not select a branch.
        for branch in ("A", "B"):
            node = self.durable["graph"][branch]
            deps_complete = all(self.durable["graph"][dep]["status"] == "COMPLETE" for dep in node["deps"] )
            if node["status"] == "PENDING" and deps_complete:
                return branch
        return None


class M3LocalPredicateCandidate(CandidateBase):
    realization = "M3_STATE_LOCAL_TRANSITION_PREDICATES"

    @classmethod
    def initial_state(cls) -> Dict[str, Any]:
        return {
            "a_committed": False,
            "b_committed": False,
            "c_committed": False,
            "contributions": {},
            "pending_auth": {"C": None, "D": None},
            "effect_attempt_count": 0,
            "c_auth_version": None,
            "d_status": "PENDING",
        }

    def contribution_committed(self, branch: str) -> bool:
        return bool(self.durable[f"{branch.lower()}_committed"])

    def commit_contribution(self, branch: str) -> None:
        self.durable["contributions"][f"{branch}1"] = branch
        self.durable[f"{branch.lower()}_committed"] = True

    def c_committed(self) -> bool:
        return bool(self.durable["c_committed"])

    def commit_c_state(self, auth_version: str) -> None:
        # Dependency relation is encoded as a local predicate rather than a graph.
        if not (self.durable["a_committed"] and self.durable["b_committed"]):
            raise RuntimeError("local predicate forbids C before A+B")
        self.durable["c_committed"] = True
        self.durable["c_auth_version"] = auth_version

    def d_status(self) -> str:
        return self.durable["d_status"]

    def set_d_status(self, status: str) -> None:
        self.durable["d_status"] = status

    def choose_open_branch(self) -> Optional[str]:
        # Materially different valid trace: B before A. Runner remains neutral.
        for branch in ("B", "A"):
            if not self.contribution_committed(branch):
                return branch
        return None


CANDIDATES: Dict[str, Type[CandidateBase]] = {
    "M1": M1ExplicitGraphCandidate,
    "M3": M3LocalPredicateCandidate,
}


@dataclass
class RunResult:
    candidate: str
    scenario: str
    durable_state: Dict[str, Any]
    candidate_visible_trace: List[Dict[str, Any]]
    evaluator_truth: Dict[str, Any]
    property_results: Dict[str, str]
    scenario_outcome: Dict[str, bool]
    stop_disposition: str
    stop_reason: str
    replacements: int

    def to_dict(self) -> Dict[str, Any]:
        value = {
            "candidate": self.candidate,
            "scenario": self.scenario,
            "durable_state": self.durable_state,
            "candidate_visible_trace": self.candidate_visible_trace,
            "evaluator_truth": self.evaluator_truth,
            "property_results": self.property_results,
            "scenario_outcome": self.scenario_outcome,
            "stop_disposition": self.stop_disposition,
            "stop_reason": self.stop_reason,
            "replacements": self.replacements,
        }
        value["trace_sha256"] = digest(self.candidate_visible_trace)
        return value


def _event_positions(trace: List[Dict[str, Any]], event: str) -> List[int]:
    return [e["seq"] for e in trace if e["event"] == event]


def _contribution_counts(trace: List[Dict[str, Any]]) -> Dict[str, int]:
    counts = {"A1": 0, "B1": 0}
    for e in trace:
        if e["event"] == "CONTRIBUTION_COMMITTED" and e.get("contribution_id") in counts:
            counts[e["contribution_id"]] += 1
    return counts


def check_p2_contribution_integrity(trace: List[Dict[str, Any]]) -> bool:
    return _contribution_counts(trace) == {"A1": 1, "B1": 1}


def check_p3_join_ordering(trace: List[Dict[str, Any]]) -> bool:
    branch = {e.get("branch"): e["seq"] for e in trace if e["event"] == "BRANCH_COMPLETE"}
    c = _event_positions(trace, "C_COMMIT")
    d = _event_positions(trace, "EFFECT_ATTEMPT")
    if c:
        if not {"A", "B"}.issubset(branch):
            return False
        if c[0] <= max(branch["A"], branch["B"]):
            return False
    if d:
        if not c or d[0] <= c[0]:
            return False
    return True


def check_p4_authorization_currentness(result: RunResult) -> bool:
    revoked = {
        (e.get("action"), e.get("version"))
        for e in result.evaluator_truth["trace"]
        if e["event"] == "AUTH_VERSION_REVOKED"
    }
    for e in result.candidate_visible_trace:
        if e["event"] == "C_COMMIT" and ("C", e.get("authorization_version")) in revoked:
            return False
        if e["event"] == "EFFECT_ATTEMPT" and ("D", e.get("authorization_version")) in revoked:
            return False
    return True


def check_p5_cross_instance_continuity(result: RunResult) -> bool:
    if result.replacements < 1:
        return False
    return check_p2_contribution_integrity(result.candidate_visible_trace) and bool(_event_positions(result.candidate_visible_trace, "C_COMMIT"))


def check_p7_external_effect_integrity(result: RunResult) -> bool:
    effects = [e for e in result.evaluator_truth["effect_sink"]["effects"] if e["key"] == EFFECT_KEY]
    return len(effects) <= 1


def check_p8_ambiguous_outcome_safety(result: RunResult) -> bool:
    unknown = _event_positions(result.candidate_visible_trace, "D_OUTCOME_UNKNOWN")
    if not unknown:
        return False
    after = [e for e in result.candidate_visible_trace if e["seq"] > unknown[0]]
    if any(e["event"] == "EFFECT_ATTEMPT" for e in after):
        return False
    return result.durable_state.get("d_status") == "UNKNOWN"


def check_completion(result: RunResult) -> bool:
    return result.stop_disposition == "COMPLETE" and result.durable_state.get("d_status") == "COMPLETE"


def run_scenario(candidate_key: str, scenario: Scenario) -> RunResult:
    candidate_cls = CANDIDATES[candidate_key]
    durable = candidate_cls.initial_state()
    auth = AuthorizationStore()
    sink = EffectSink(scenario.effect_mode)
    trace = Trace()
    trace.hidden("FIXTURE_ACCEPTANCE_TRUTH", accepted_contributions=["A1", "B1"])
    trace.visible("RUN_START", realization=candidate_cls.realization)
    instance_n = 1
    candidate = candidate_cls(durable, auth, sink, trace, f"instance-{instance_n}")
    replacements = 0
    revoked = False
    replaced = False
    stop = StepResult("HOLD", "not started")

    for wake in range(1, scenario.max_wakes + 1):
        trace.visible("WAKE", wake=wake, source="RUN_START" if wake == 1 else "DECLARED_VISIBLE_CHANGE_OR_PRIOR_RESPONSE")
        before_len = len(trace.candidate_visible)
        stop = candidate.step()
        new_events = trace.candidate_visible[before_len:]

        if scenario.replace_after_first_contribution and not replaced:
            if any(e["event"] == "CONTRIBUTION_COMMITTED" for e in new_events):
                trace.hidden("INSTANCE_TERMINATED", instance_id=candidate.instance_id)
                instance_n += 1
                replacements += 1
                replaced = True
                candidate = candidate_cls(durable, auth, sink, trace, f"instance-{instance_n}")
                trace.visible("REPLACEMENT_START", instance_id=candidate.instance_id)
                continue

        if scenario.revoke_after_auth_observed and not revoked:
            action = scenario.revoke_after_auth_observed
            obs = next((e for e in new_events if e["event"] == "AUTH_OBSERVED" and e["action"] == action), None)
            if obs is not None:
                if not auth.revoke(action, obs["version"]):
                    raise RuntimeError("declared revocation failed")
                trace.hidden("AUTH_VERSION_REVOKED", action=action, version=obs["version"])
                trace.visible("AUTHORIZATION_CHANGED", action=action)
                revoked = True
                continue

        if stop.disposition in {"HOLD", "COMPLETE"}:
            break
    else:
        stop = StepResult("HOLD", "wake bound exhausted")

    evaluator_truth = {
        "trace": copy.deepcopy(trace.evaluator_only),
        "authorization": auth.evaluator_snapshot(),
        "effect_sink": sink.evaluator_snapshot(),
    }
    provisional = RunResult(
        candidate=candidate_key,
        scenario=scenario.name,
        durable_state=copy.deepcopy(durable),
        candidate_visible_trace=copy.deepcopy(trace.candidate_visible),
        evaluator_truth=evaluator_truth,
        property_results={},
        scenario_outcome={},
        stop_disposition=stop.disposition,
        stop_reason=stop.reason,
        replacements=replacements,
    )
    props: Dict[str, str] = {}
    outcome: Dict[str, bool] = {}

    if scenario.name == "S0_NOMINAL":
        props = {
            "P2_CONTRIBUTION_INTEGRITY": "PASS" if check_p2_contribution_integrity(provisional.candidate_visible_trace) else "FAIL",
            "P3_JOIN_ORDERING": "PASS" if check_p3_join_ordering(provisional.candidate_visible_trace) else "FAIL",
            "P4_AUTHORIZATION_CURRENTNESS": "PASS" if check_p4_authorization_currentness(provisional) else "FAIL",
            "P7_EXTERNAL_EFFECT_INTEGRITY": "PASS" if check_p7_external_effect_integrity(provisional) else "FAIL",
            "P9_REQUISITE_PROGRESSION": "PASS" if check_completion(provisional) else "FAIL",
        }
        safe = all(v == "PASS" for k, v in props.items() if k != "P9_REQUISITE_PROGRESSION")
        outcome = {"safety": safe, "progression": check_completion(provisional), "completion": check_completion(provisional)}
    elif scenario.name == "S1_INSTANCE_REPLACEMENT":
        props = {
            "P2_CONTRIBUTION_INTEGRITY": "PASS" if check_p2_contribution_integrity(provisional.candidate_visible_trace) else "FAIL",
            "P3_JOIN_ORDERING": "PASS" if check_p3_join_ordering(provisional.candidate_visible_trace) else "FAIL",
            "P4_AUTHORIZATION_CURRENTNESS": "PASS" if check_p4_authorization_currentness(provisional) else "FAIL",
            "P5_CROSS_INSTANCE_CONTINUITY": "PASS" if check_p5_cross_instance_continuity(provisional) else "FAIL",
            "P7_EXTERNAL_EFFECT_INTEGRITY": "PASS" if check_p7_external_effect_integrity(provisional) else "FAIL",
            "P9_REQUISITE_PROGRESSION": "PASS" if check_completion(provisional) else "FAIL",
            "P10_OPERATIONAL_RECOVERY": "PASS" if check_p5_cross_instance_continuity(provisional) and check_completion(provisional) else "FAIL",
        }
        safe = all(v == "PASS" for k, v in props.items() if k not in {"P9_REQUISITE_PROGRESSION", "P10_OPERATIONAL_RECOVERY"})
        recovered = props["P10_OPERATIONAL_RECOVERY"] == "PASS"
        outcome = {"safety": safe, "progression": check_completion(provisional), "recovery": recovered, "completion": check_completion(provisional)}
    elif scenario.name in {"S2A_REVOKE_C", "S2A_REVOKE_D"}:
        target_event = "C_COMMIT" if scenario.name.endswith("_C") else "EFFECT_ATTEMPT"
        no_consequential_commit = not bool(_event_positions(provisional.candidate_visible_trace, target_event))
        props = {
            "P4_AUTHORIZATION_CURRENTNESS": "PASS" if check_p4_authorization_currentness(provisional) and no_consequential_commit else "FAIL",
            "P9_REQUISITE_PROGRESSION": "PASS" if no_consequential_commit else "FAIL",
        }
        outcome = {"safety": props["P4_AUTHORIZATION_CURRENTNESS"] == "PASS", "justified_non_execution": no_consequential_commit}
    elif scenario.name in {"S4A_HIDDEN_EFFECT_OCCURRED", "S4B_HIDDEN_EFFECT_DID_NOT_OCCUR"}:
        props = {
            "P3_JOIN_ORDERING": "PASS" if check_p3_join_ordering(provisional.candidate_visible_trace) else "FAIL",
            "P7_EXTERNAL_EFFECT_INTEGRITY": "PASS" if check_p7_external_effect_integrity(provisional) else "FAIL",
            "P8_AMBIGUOUS_OUTCOME_SAFETY": "PASS" if check_p8_ambiguous_outcome_safety(provisional) else "FAIL",
            "P9_REQUISITE_PROGRESSION": "PASS" if check_p8_ambiguous_outcome_safety(provisional) else "FAIL",
        }
        outcome = {"safety": all(v == "PASS" for v in props.values()), "justified_non_execution": check_p8_ambiguous_outcome_safety(provisional)}
    else:
        raise ValueError(f"no assertion set declared for scenario {scenario.name}")

    provisional.property_results = props
    provisional.scenario_outcome = outcome
    return provisional


INITIAL_SCENARIOS = [
    Scenario("S0_NOMINAL"),
    Scenario("S1_INSTANCE_REPLACEMENT", replace_after_first_contribution=True),
    Scenario("S2A_REVOKE_C", revoke_after_auth_observed="C"),
    Scenario("S2A_REVOKE_D", revoke_after_auth_observed="D"),
    Scenario("S4A_HIDDEN_EFFECT_OCCURRED", effect_mode="hidden_occurred"),
    Scenario("S4B_HIDDEN_EFFECT_DID_NOT_OCCUR", effect_mode="hidden_not_occurred"),
]


def _normalized_s4_view(result: RunResult) -> List[Dict[str, Any]]:
    # Scenario names and evaluator truth are not present in candidate-visible traces.
    # Remove sequence numbers only so equality speaks to the exposed event content.
    return [{k: v for k, v in e.items() if k != "seq"} for e in result.candidate_visible_trace]


def run_initial_comparison() -> Dict[str, Any]:
    runs: List[RunResult] = []
    for candidate in ("M1", "M3"):
        for scenario in INITIAL_SCENARIOS:
            runs.append(run_scenario(candidate, scenario))

    matched_s4: Dict[str, bool] = {}
    for candidate in ("M1", "M3"):
        a = next(r for r in runs if r.candidate == candidate and r.scenario == "S4A_HIDDEN_EFFECT_OCCURRED")
        b = next(r for r in runs if r.candidate == candidate and r.scenario == "S4B_HIDDEN_EFFECT_DID_NOT_OCCUR")
        matched_s4[candidate] = _normalized_s4_view(a) == _normalized_s4_view(b)

    all_selected_pass = all(all(v == "PASS" for v in r.property_results.values()) for r in runs)
    all_outcomes_true = all(all(r.scenario_outcome.values()) for r in runs)
    result = {
        "fixture_version": "0.1",
        "spec_version": "0.1.3",
        "candidate_pair": [CANDIDATES["M1"].realization, CANDIDATES["M3"].realization],
        "wake_policy": {
            "candidate_agnostic": True,
            "sources": ["RUN_START_OR_REPLACEMENT_START", "PRIOR_ACTION_RESPONSE", "DECLARED_CANDIDATE_VISIBLE_EXOGENOUS_CHANGE"],
            "runner_selects_successor": False,
        },
        "common_substrate": {
            "authorization_store": "atomic exact-version/target/scope commit check",
            "effect_sink": "observational; no deduplication or retry policy",
            "durable_store": "raw candidate-owned durable mapping survives S1 replacement",
        },
        "comparison_validity": {
            "V3_APPARATUS_NON_SUBSTITUTION": "SUPPORTED_BY_BOUNDED_CODE_INSPECTION; NOT FORMAL PROOF",
            "V4_INFORMATION_NON_LEAKAGE": "PASS" if all(matched_s4.values()) else "FAIL",
            "S4_MATCHED_CANDIDATE_VISIBLE_HISTORY": matched_s4,
        },
        "runs": [r.to_dict() for r in runs],
        "bounded_result": {
            "all_selected_assertions_pass": all_selected_pass,
            "all_declared_sparse_outcomes_supported": all_outcomes_true,
            "substitution": "LOCALLY_SUPPORTED" if all_selected_pass and all_outcomes_true else "NOT_SUPPORTED",
            "reencoding": "SUPPORTED: dependency/join information remains encoded in M3 local predicates/code",
            "displacement": "NOT_ESTABLISHED; declared atomic authorization/durable storage are common substrate in both candidates",
            "ablation": "NOT_ESTABLISHED for composition functionality; explicit persistent graph representation is absent in M3 but dependency functionality remains",
            "harness_independence": "NOT_ESTABLISHED",
        },
    }
    result["result_sha256"] = digest(result)
    return result


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["run-initial"])
    ap.add_argument("--pretty", action="store_true")
    args = ap.parse_args()
    result = run_initial_comparison()
    print(json.dumps(result, indent=2 if args.pretty else None, sort_keys=True))
    return 0 if result["bounded_result"]["all_selected_assertions_pass"] and result["bounded_result"]["all_declared_sparse_outcomes_supported"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
