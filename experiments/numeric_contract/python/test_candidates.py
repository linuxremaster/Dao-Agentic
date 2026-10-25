import json
import unittest
from hashlib import sha256

from .candidates import Hold, material, observe, parse, replay
from .compare import collect
from .emit import ROOT, history

HERE = ROOT / "experiments/numeric_contract"


class CandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evidence = collect()
        cls.rows = {row["name"]: row for row in cls.evidence["observations"]}

    def test_actual_cross_runtime_bytes_and_digests_for_all_accepted_fixtures(self):
        for row in self.rows.values():
            for candidate in "NJD":
                with self.subTest(fixture=row["name"], candidate=candidate):
                    left, right = row["python"][candidate], row["javascript"][candidate]
                    if candidate in row["hold_candidates"]:
                        self.assertEqual(left["result"], "HOLD")
                        self.assertEqual(right["result"], "HOLD")
                    else:
                        self.assertEqual(left["result"], "ok")
                        self.assertEqual(right["result"], "ok")
                        self.assertEqual(bytes.fromhex(left["canonical_hex"]), bytes.fromhex(right["canonical_hex"]))
                        self.assertEqual(left["event_sha256"], right["event_sha256"])
                        self.assertEqual(sha256(bytes.fromhex(left["canonical_hex"])).hexdigest(), left["event_sha256"])
                        self.assertEqual(left["payload_sha256"], right["payload_sha256"])

    def test_saved_evidence_matches_fresh_emissions(self):
        saved = json.loads((HERE / "evidence.json").read_text(encoding="utf-8"))
        # Version metadata is provenance, not a portability requirement.
        self.assertEqual(saved["observations"], self.evidence["observations"])
        self.assertEqual(saved["replays"], self.evidence["replays"])

    def test_baseline_mismatches_are_preserved(self):
        for name in ("sequence_lexical_float", "payload_lexical_one", "payload_negative_zero",
                     "payload_exponent", "payload_unsafe_integer", "payload_high_precision", "payload_unicode",
                     "unicode_key_order_minimal"):
            row = self.rows[name]
            left, right = row["python"]["baseline"], row["javascript"]["baseline"]
            if left["result"] == right["result"] == "ok":
                self.assertNotEqual(bytes.fromhex(left["canonical_hex"]), bytes.fromhex(right["canonical_hex"]))
                self.assertNotEqual(left["event_sha256"], right["event_sha256"])
            else:
                self.assertNotEqual(left["result"], right["result"])
            self.assertEqual(row["byte_and_digest_identity"]["baseline"], "HOLD")

    def test_n_preserves_numeric_tokens_in_explicit_tags(self):
        for name, token in (("payload_lexical_one", "1.0"), ("payload_negative_zero", "-0.0"),
                            ("payload_unsafe_integer", "9007199254740993"),
                            ("payload_high_precision", "1.0000000000000000000001")):
            wire = json.loads(self.rows[name]["python"]["N"]["canonical_text"])
            self.assertEqual(wire["payload"]["value"]["$numeric"]["text"], token)

    def test_j_normalizes_value_not_lexical_identity(self):
        for left, right in (("payload_lexical_one", "payload_integer_one"), ("payload_negative_zero", "payload_zero"),
                            ("raw_lexical_a", "raw_lexical_b")):
            for runtime in ("python", "javascript"):
                a, b = self.rows[left][runtime]["J"], self.rows[right][runtime]["J"]
                self.assertEqual(bytes.fromhex(a["canonical_hex"]), bytes.fromhex(b["canonical_hex"]))
                self.assertEqual(a["event_sha256"], b["event_sha256"])

    def test_j_exact_strings_bypass_native_numeric_loss(self):
        for name in ("explicit_integer", "explicit_decimal", "explicit_nested"):
            row = self.rows[name]
            self.assertEqual(row["python"]["J"]["result"], "ok")
            self.assertEqual(row["python"]["J"]["canonical_hex"], row["javascript"]["J"]["canonical_hex"])
        text = self.rows["explicit_decimal"]["python"]["J"]["canonical_text"]
        self.assertIn('"text":"1.0000000000000000000001"', text)

    def test_d_binds_exact_payload_bytes_but_not_outer_spelling(self):
        row = self.rows["raw_lexical_a"]
        raw = row["raw_event_json"]
        encoded, _, digest = material("D", raw)
        self.assertEqual(digest, sha256(b'{ "value" : 1e0 }').hexdigest())
        self.assertEqual(json.loads(encoded)["payload_sha256"], digest)
        self.assertNotIn("payload", json.loads(encoded))
        self.assertEqual(material("D", " \n" + raw + " \t")[0], encoded)
        for name in ("raw_lexical_b", "payload_integer_one"):
            other = self.rows[name]["python"]["D"]
            self.assertNotEqual(other["payload_sha256"], digest)
            self.assertNotEqual(bytes.fromhex(other["canonical_hex"]), encoded)
        changed_control = raw.replace('"n1"', '"n2"')
        changed, _, same_payload = material("D", changed_control)
        self.assertEqual(digest, same_payload)
        self.assertNotEqual(changed, encoded)

    def test_replay_matches_actual_cross_runtime_hashes_and_state(self):
        for candidate in "NJD":
            actual = replay(candidate, history())
            self.assertEqual(actual["status"], "DONE")
            self.assertEqual(actual["last_sequence"], 6)
            self.assertEqual(actual, replay(candidate, list(history())))
            self.assertEqual(actual, self.evidence["replays"]["javascript"][candidate])
            changed = history('{"value":1.25}')
            self.assertNotEqual(actual["history_hash"], replay(candidate, changed)["history_hash"])

    def test_replay_rejects_gaps_duplicates_and_invalid_transitions(self):
        for candidate in "NJD":
            source = history()
            for bad in ([source[0], source[2]], [source[0], source[1].replace('"h2"', '"h1"')], [source[1]]):
                with self.subTest(candidate=candidate, history=bad):
                    with self.assertRaises(ValueError):
                        replay(candidate, bad)

    def test_lossless_parser_and_explicit_unsupported_inputs(self):
        raw = self.rows["payload_high_precision"]["raw_event_json"]
        event, payload = parse(raw)
        self.assertEqual(event["payload"]["value"].text, "1.0000000000000000000001")
        self.assertEqual(payload, '{"value":1.0000000000000000000001}')
        for text in ('{"a":1,}', '{"a":01}', '[1,]', '{"a":Infinity}', '{"a":1} trailing', '"\\ud800"'):
            with self.subTest(text=text):
                with self.assertRaises(Hold):
                    parse(text)
        for candidate in "NJD":
            self.assertEqual(observe(candidate, '[' * 66 + '0' + ']' * 66)["result"], "HOLD")


if __name__ == "__main__":
    unittest.main()
