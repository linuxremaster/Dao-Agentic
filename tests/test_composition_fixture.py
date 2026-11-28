import copy
import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "tools" / "composition_fixture.py"
spec = importlib.util.spec_from_file_location("composition_fixture", TOOL)
cf = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = cf
spec.loader.exec_module(cf)


class CompositionFixtureTests(unittest.TestCase):
    def run_case(self, candidate, scenario):
        return cf.run_scenario(candidate, scenario)

    def test_nominal_m1_and_m3_complete_with_different_valid_branch_orders(self):
        a = self.run_case("M1", cf.Scenario("S0_NOMINAL"))
        b = self.run_case("M3", cf.Scenario("S0_NOMINAL"))
        self.assertTrue(all(v == "PASS" for v in a.property_results.values()))
        self.assertTrue(all(v == "PASS" for v in b.property_results.values()))
        order_a = [e["branch"] for e in a.candidate_visible_trace if e["event"] == "CONTRIBUTION_COMMITTED"]
        order_b = [e["branch"] for e in b.candidate_visible_trace if e["event"] == "CONTRIBUTION_COMMITTED"]
        self.assertEqual(order_a, ["A", "B"])
        self.assertEqual(order_b, ["B", "A"])
        self.assertNotEqual(order_a, order_b)
        self.assertTrue(a.scenario_outcome["completion"])
        self.assertTrue(b.scenario_outcome["completion"])

    def test_s1_replacement_uses_only_durable_candidate_state(self):
        for candidate in ("M1", "M3"):
            r = self.run_case(candidate, cf.Scenario("S1_INSTANCE_REPLACEMENT", replace_after_first_contribution=True))
            self.assertEqual(r.replacements, 1)
            self.assertEqual(r.property_results["P5_CROSS_INSTANCE_CONTINUITY"], "PASS")
            self.assertEqual(r.property_results["P10_OPERATIONAL_RECOVERY"], "PASS")
            self.assertTrue(r.scenario_outcome["recovery"])
            self.assertTrue(r.scenario_outcome["completion"])

    def test_s2a_revocation_blocks_stale_c_commit(self):
        for candidate in ("M1", "M3"):
            r = self.run_case(candidate, cf.Scenario("S2A_REVOKE_C", revoke_after_auth_observed="C"))
            self.assertEqual(r.property_results["P4_AUTHORIZATION_CURRENTNESS"], "PASS")
            self.assertTrue(r.scenario_outcome["justified_non_execution"])
            self.assertFalse(any(e["event"] == "C_COMMIT" for e in r.candidate_visible_trace))

    def test_s2a_revocation_blocks_stale_d_effect_attempt(self):
        for candidate in ("M1", "M3"):
            r = self.run_case(candidate, cf.Scenario("S2A_REVOKE_D", revoke_after_auth_observed="D"))
            self.assertEqual(r.property_results["P4_AUTHORIZATION_CURRENTNESS"], "PASS")
            self.assertTrue(r.scenario_outcome["justified_non_execution"])
            self.assertFalse(any(e["event"] == "EFFECT_ATTEMPT" for e in r.candidate_visible_trace))

    def test_s4_pair_is_candidate_visible_identical_but_evaluator_truth_differs(self):
        for candidate in ("M1", "M3"):
            a = self.run_case(candidate, cf.Scenario("S4A_HIDDEN_EFFECT_OCCURRED", effect_mode="hidden_occurred"))
            b = self.run_case(candidate, cf.Scenario("S4B_HIDDEN_EFFECT_DID_NOT_OCCUR", effect_mode="hidden_not_occurred"))
            norm = lambda r: [{k:v for k,v in e.items() if k != "seq"} for e in r.candidate_visible_trace]
            self.assertEqual(norm(a), norm(b))
            self.assertEqual(len(a.evaluator_truth["effect_sink"]["effects"]), 1)
            self.assertEqual(len(b.evaluator_truth["effect_sink"]["effects"]), 0)
            self.assertEqual(a.property_results["P8_AMBIGUOUS_OUTCOME_SAFETY"], "PASS")
            self.assertEqual(b.property_results["P8_AMBIGUOUS_OUTCOME_SAFETY"], "PASS")
            self.assertEqual(a.durable_state["d_status"], "UNKNOWN")
            self.assertEqual(b.durable_state["d_status"], "UNKNOWN")

    def test_sparse_outcomes_do_not_imply_unclaimed_axes(self):
        r = self.run_case("M1", cf.Scenario("S2A_REVOKE_C", revoke_after_auth_observed="C"))
        self.assertEqual(set(r.scenario_outcome), {"safety", "justified_non_execution"})
        self.assertNotIn("completion", r.scenario_outcome)
        self.assertNotIn("recovery", r.scenario_outcome)

    def test_candidate_agnostic_wake_events_do_not_name_successor_nodes(self):
        result = cf.run_initial_comparison()
        self.assertTrue(result["wake_policy"]["candidate_agnostic"])
        self.assertFalse(result["wake_policy"]["runner_selects_successor"])
        for run in result["runs"]:
            for event in run["candidate_visible_trace"]:
                if event["event"] == "WAKE":
                    self.assertNotIn(event.get("source"), {"A", "B", "C", "D"})

    # Synthetic known-defect / acceptable trace controls for assertion logic.
    def test_p2_detects_duplicate_a_and_lost_b(self):
        bad = [
            {"seq":1,"event":"CONTRIBUTION_COMMITTED","contribution_id":"A1","branch":"A"},
            {"seq":2,"event":"CONTRIBUTION_COMMITTED","contribution_id":"A1","branch":"A"},
        ]
        good = [
            {"seq":1,"event":"CONTRIBUTION_COMMITTED","contribution_id":"B1","branch":"B"},
            {"seq":2,"event":"CONTRIBUTION_COMMITTED","contribution_id":"A1","branch":"A"},
        ]
        self.assertFalse(cf.check_p2_contribution_integrity(bad))
        self.assertTrue(cf.check_p2_contribution_integrity(good))

    def test_p3_detects_c_before_b_and_accepts_valid_alternative_order(self):
        bad = [
            {"seq":1,"event":"BRANCH_COMPLETE","branch":"A"},
            {"seq":2,"event":"C_COMMIT"},
            {"seq":3,"event":"BRANCH_COMPLETE","branch":"B"},
        ]
        good = [
            {"seq":1,"event":"BRANCH_COMPLETE","branch":"B"},
            {"seq":2,"event":"BRANCH_COMPLETE","branch":"A"},
            {"seq":3,"event":"C_COMMIT"},
            {"seq":4,"event":"EFFECT_ATTEMPT"},
        ]
        self.assertFalse(cf.check_p3_join_ordering(bad))
        self.assertTrue(cf.check_p3_join_ordering(good))

    def test_p7_detects_duplicate_effect(self):
        r = self.run_case("M1", cf.Scenario("S0_NOMINAL"))
        self.assertTrue(cf.check_p7_external_effect_integrity(r))
        broken = copy.deepcopy(r)
        broken.evaluator_truth["effect_sink"]["effects"].append({"key":cf.EFFECT_KEY,"attempt_id":"dup"})
        self.assertFalse(cf.check_p7_external_effect_integrity(broken))

    def test_p8_detects_retry_after_unknown(self):
        r = self.run_case("M1", cf.Scenario("S4A_HIDDEN_EFFECT_OCCURRED", effect_mode="hidden_occurred"))
        self.assertTrue(cf.check_p8_ambiguous_outcome_safety(r))
        broken = copy.deepcopy(r)
        seq = max(e["seq"] for e in broken.candidate_visible_trace) + 1
        broken.candidate_visible_trace.append({"seq":seq,"event":"EFFECT_ATTEMPT","key":cf.EFFECT_KEY,"attempt_id":"retry"})
        self.assertFalse(cf.check_p8_ambiguous_outcome_safety(broken))

    def test_initial_comparison_supports_substitution_and_reencoding_only(self):
        result = cf.run_initial_comparison()
        self.assertTrue(result["bounded_result"]["all_selected_assertions_pass"])
        self.assertTrue(result["bounded_result"]["all_declared_sparse_outcomes_supported"])
        self.assertEqual(result["bounded_result"]["substitution"], "LOCALLY_SUPPORTED")
        self.assertIn("SUPPORTED", result["bounded_result"]["reencoding"])
        self.assertIn("NOT_ESTABLISHED", result["bounded_result"]["ablation"])
        self.assertEqual(result["bounded_result"]["harness_independence"], "NOT_ESTABLISHED")


if __name__ == "__main__":
    unittest.main()
