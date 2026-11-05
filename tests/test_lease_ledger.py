import json
import tempfile
import unittest
from pathlib import Path

from core.leases import has_active_lease, make_decision_event
from scripts.lease_ledger import append, load


class LedgerTests(unittest.TestCase):
    def test_persist_replay_and_decision(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "leases.jsonl"
            grant = {
                "event_id": "g1", "sequence": 1, "kind": "AUTHORITY_GRANTED",
                "payload": {
                    "grant_id": "merge-1", "subject": "agent-a", "action": "MERGE",
                    "target": "abc123", "scope": "owner/repo", "expires_sequence": 5,
                    "required_evidence": ["audit-pass"],
                },
            }
            state = append(path, load(path), grant)
            request = {
                "request_id": "r1", "subject": "agent-a", "action": "MERGE",
                "target": "abc123", "scope": "owner/repo", "evidence_ids": ["audit-pass"],
            }
            decision = make_decision_event(state, request, "d1")
            state = append(path, state, decision)
            replayed = load(path)
            self.assertEqual(state, replayed)
            self.assertTrue(replayed.decisions[-1]["allowed"])
            lines = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
            self.assertEqual([e["kind"] for e in lines], ["AUTHORITY_GRANTED", "AUTHORITY_DECIDED"])

    def test_generic_lease_persists_and_replays(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "leases.jsonl"
            event = {
                "event_id": "l1", "sequence": 1, "kind": "LEASE_GRANTED",
                "payload": {
                    "lease_id": "task-lease", "subject": "agent-a", "lease_class": "TASK",
                    "resource": "task-17", "scope": "owner/repo", "purpose": "audit",
                    "expires_sequence": 10,
                },
            }
            state = append(path, load(path), event)
            replayed = load(path)
            self.assertEqual(state, replayed)
            self.assertTrue(has_active_lease(replayed, "agent-a", "TASK", "task-17", "owner/repo"))

    def test_invalid_event_is_not_appended(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "leases.jsonl"
            bad = {
                "event_id": "g1", "sequence": 1, "kind": "AUTHORITY_GRANTED",
                "payload": {
                    "grant_id": "merge-1", "subject": "agent-a", "action": "MERGE",
                    "target": "*", "scope": "owner/repo", "expires_sequence": 5,
                    "required_evidence": [],
                },
            }
            with self.assertRaises(Exception):
                append(path, load(path), bad)
            self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
