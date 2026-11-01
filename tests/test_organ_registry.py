"""WO-004 Phase A: organ registry v0.1.1 structure and checker negative controls."""

import copy
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "contracts/organs/organ_registry.json"
SOURCE = ROOT / "contracts/organs/source/SOCRATES_ORGAN_REGISTRY_v0.1_PROPOSED.json"
SOURCE_SHA256 = "783c825d22a752fd8312b8dd92a41c1849bdf8301e1ffd2071bff2fe0eacb949"


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / f"scripts/organs/{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


checker = load_module("check_registry")
builder = load_module("build_registry_v011")


def registry():
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def organ(reg, oid):
    return next(o for o in reg["organs"] if o["organ_id"] == oid)


def codes(findings):
    return {code for code, _, _ in findings}


class RegistryTests(unittest.TestCase):
    def test_source_preserved_byte_for_byte(self):
        self.assertEqual(hashlib.sha256(SOURCE.read_bytes()).hexdigest(), SOURCE_SHA256)

    def test_committed_registry_matches_builder(self):
        self.assertEqual(registry(), builder.build())

    def test_v011_has_no_findings(self):
        self.assertEqual(checker.check(registry()), [])

    def test_every_organ_has_every_contract_field(self):
        reg = registry()
        for o in reg["organs"]:
            for field in reg["contract_fields"]:
                self.assertIn(field, o, (o["organ_id"], field))

    def test_unknown_values_are_explicit_not_invented(self):
        reg = registry()
        for field in ("trigger", "required_input_grades", "side_effect_class", "authority_requirement", "stop_condition", "trace_fields"):
            self.assertTrue(all(o[field] == "UNSPECIFIED" for o in reg["organs"]), field)

    def test_o19_proposed_not_adopted_and_nothing_depends_on_it(self):
        reg = registry()
        o19 = organ(reg, "O19_WU_WEI_CERTIFICATION_GUARD")
        self.assertEqual(o19["implementation_status"], "PROPOSED_CONCEPT")
        self.assertEqual(o19["adoption"], "NOT_ADOPTED")
        self.assertEqual(o19["dependencies"], [])
        for o in reg["organs"]:
            self.assertNotIn("O19_WU_WEI_CERTIFICATION_GUARD", o["dependencies"])

    def test_spine_is_substrate_with_evidence(self):
        reg = registry()
        spine = next(s for s in reg["substrates"] if s["substrate_id"] == "S00_DETERMINISTIC_CONTROL_SPINE")
        self.assertEqual(spine["implementation_status"], "REPRODUCED_EXECUTABLE")
        self.assertTrue(spine["evidence_refs"])
        self.assertNotIn("S00_DETERMINISTIC_CONTROL_SPINE", [o["organ_id"] for o in reg["organs"]])
        self.assertIn("S00_DETERMINISTIC_CONTROL_SPINE", organ(reg, "O03_COORDINATION_LIFECYCLE")["dependencies"])

    def test_every_organ_has_reference_evidence(self):
        for o in registry()["organs"]:
            self.assertTrue(o["evidence_refs"], o["organ_id"])

    def test_every_s01_reader_depends_on_s01(self):
        # S01's purpose names effect verification, ARC, trace and telemetry.
        reg = registry()
        for oid in ("O12_EFFECT_VERIFICATION", "O13_ARC", "O14_TRACE_TELEMETRY"):
            self.assertIn("S01_EVENT_SUBSTRATE", organ(reg, oid)["dependencies"], oid)

    def test_o12_no_longer_depends_on_later_o14(self):
        self.assertNotIn("O14_TRACE_TELEMETRY", organ(registry(), "O12_EFFECT_VERIFICATION")["dependencies"])


class NegativeControls(unittest.TestCase):
    """Each control injects one documented defect; the checker must report it."""

    def assert_finds(self, reg, code):
        self.assertIn(code, codes(checker.check(reg)))

    def test_v01_organs_lack_contract_fields(self):
        source = json.loads(SOURCE.read_text(encoding="utf-8"))
        reg = registry()
        reg["organs"] = source["organs"]
        self.assert_finds(reg, "E03")

    def test_v01_o12_ordering_defect_restored(self):
        reg = registry()
        organ(reg, "O12_EFFECT_VERIFICATION")["dependencies"].append("O14_TRACE_TELEMETRY")
        self.assert_finds(reg, "E09")

    def test_dependency_on_o19(self):
        reg = registry()
        organ(reg, "O10_CONSEQUENTIAL_AUTHORIZATION")["dependencies"].append("O19_WU_WEI_CERTIFICATION_GUARD")
        self.assert_finds(reg, "E07")

    def test_spine_listed_as_organ(self):
        reg = registry()
        spine = copy.deepcopy(organ(reg, "O03_COORDINATION_LIFECYCLE"))
        spine.update(organ_id="S00_DETERMINISTIC_CONTROL_SPINE", **{"class": "substrate"})
        reg["organs"].append(spine)
        found = codes(checker.check(reg))
        self.assertIn("E08", found)
        self.assertIn("E02", found)

    def test_cycle(self):
        reg = registry()
        organ(reg, "O01_CONTRACT_AUTHORITY")["dependencies"].append("O03_COORDINATION_LIFECYCLE")
        self.assert_finds(reg, "E06")

    def test_unresolved_dependency(self):
        reg = registry()
        organ(reg, "O02_EVIDENCE_PROVENANCE")["dependencies"].append("O99_MISSING")
        self.assert_finds(reg, "E05")

    def test_unknown_status(self):
        reg = registry()
        organ(reg, "O04_FRICTION_PROBE")["implementation_status"] = "DONE"
        self.assert_finds(reg, "E04")

    def test_reproduced_without_evidence(self):
        reg = registry()
        reg["substrates"][0]["evidence_refs"] = []
        self.assert_finds(reg, "E10")

    def test_runtime_dependency_on_offline_organ(self):
        reg = registry()
        organ(reg, "O09_WU_WEI_TEMPORAL")["dependencies"].append("O05_BFP")
        self.assert_finds(reg, "E09")

    def test_organ_without_evidence(self):
        reg = registry()
        organ(reg, "O07_VERIFICATION_ROUTER")["evidence_refs"] = []
        self.assert_finds(reg, "E12")

    def test_missing_top_level_key(self):
        reg = registry()
        del reg["substrates"]
        self.assert_finds(reg, "E01")

    def test_invalid_access_class(self):
        reg = registry()
        organ(reg, "O11_ACTUATOR")["access_class"] = "ROOT"
        self.assert_finds(reg, "E11")

    def test_runtime_stage_wrong_type(self):
        reg = registry()
        organ(reg, "O09_WU_WEI_TEMPORAL")["runtime_stage"] = "3"
        self.assert_finds(reg, "E09")

    def test_every_documented_class_has_a_control(self):
        # Static guard: each checker code E00-E12 is asserted somewhere in this class.
        documented = {f"E{i:02d}" for i in range(13)}
        body = Path(__file__).read_text(encoding="utf-8").split("class NegativeControls", 1)[1]
        self.assertEqual({c for c in documented if f'"{c}"' not in body}, set())

    def test_non_object_input(self):
        self.assertEqual(codes(checker.check([])), {"E00"})


if __name__ == "__main__":
    unittest.main()
