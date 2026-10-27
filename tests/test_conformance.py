import json
import unittest
from pathlib import Path

from core import AdmissionError, State, reduce, replay
from core.events import canonical_event

ROOT = Path(__file__).resolve().parents[1]
CASES = json.loads((ROOT / "contracts/conformance/cases.json").read_text(encoding="utf-8"))
NUMERIC = json.loads((ROOT / "contracts/conformance/numeric-boundaries.json").read_text(encoding="utf-8"))


class ConformanceFixtureTests(unittest.TestCase):
    def test_language_neutral_cases_match_verified_python_reference(self):
        for case in CASES["cases"]:
            with self.subTest(case=case["name"]):
                expected = case["expected"]
                if expected["result"] == "reject":
                    with self.assertRaisesRegex(AdmissionError, f"^{expected['error']}$"):
                        replay(case["events"])
                    continue
                state = replay(case["events"])
                self.assertEqual(state.status, expected["status"])
                self.assertEqual(state.last_sequence, expected["last_sequence"])
                self.assertEqual(sorted(state.event_ids), expected["event_ids"])
                self.assertEqual(state.history_hash, expected["history_hash"])

    def test_numeric_boundary_fixtures_preserve_python_observation(self):
        for probe in NUMERIC["probes"]:
            with self.subTest(probe=probe["name"]):
                event = json.loads(probe["raw_event_json"])
                if probe["python_result"] == "reject":
                    with self.assertRaisesRegex(AdmissionError, f"^{probe['python_error']}$"):
                        canonical_event(event)
                    continue
                encoded = canonical_event(event).decode("utf-8")
                self.assertEqual(encoded, probe["python_canonical_utf8"])
                reduced = probe.get("python_reduce")
                if reduced and reduced["result"] == "ok":
                    state = reduce(State(), event)
                    self.assertEqual(state.status, reduced["status"])
                    self.assertEqual(state.history_hash, reduced["history_hash"])


if __name__ == "__main__":
    unittest.main()
