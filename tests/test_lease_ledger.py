import json
import tempfile
import unittest
from pathlib import Path

from core.leases import has_active_lease, make_decision_event
from scripts.lease_ledger import append, append_many, build_roster, load


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

    def test_roster_derives_active_roles_assignments_and_authority(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "leases.jsonl"
            state = load(path)
            events = [
                {
                    "event_id": "role", "sequence": 1, "kind": "LEASE_GRANTED",
                    "payload": {
                        "lease_id": "role-1", "subject": "agent-a", "lease_class": "ROLE",
                        "resource": "DEVELOPER", "scope": "owner/repo", "purpose": "development",
                        "expires_sequence": 10,
                    },
                },
                {
                    "event_id": "task", "sequence": 2, "kind": "LEASE_GRANTED",
                    "payload": {
                        "lease_id": "task-1", "subject": "agent-a", "lease_class": "TASK",
                        "resource": "issue-42", "scope": "owner/repo", "purpose": "implement",
                        "expires_sequence": 10,
                    },
                },
                {
                    "event_id": "grant", "sequence": 3, "kind": "AUTHORITY_GRANTED",
                    "payload": {
                        "grant_id": "grant-1", "subject": "agent-a", "action": "MERGE",
                        "target": "sha-123", "scope": "owner/repo", "expires_sequence": 8,
                        "required_evidence": ["independent-pass"],
                    },
                },
            ]
            state = append_many(path, state, events)
            roster = build_roster(state, sequence=4)
            self.assertEqual(roster["sequence"], 4)
            self.assertEqual([row["subject"] for row in roster["subjects"]], ["agent-a"])
            row = roster["subjects"][0]
            self.assertEqual(row["roles"][0]["role"], "DEVELOPER")
            self.assertEqual(row["assignments"][0]["resource"], "issue-42")
            self.assertEqual(row["authority_grants"][0]["target"], "sha-123")
            self.assertEqual(row["authority_grants"][0]["required_evidence"], ["independent-pass"])

    def test_rotation_batch_prevalidates_before_mutating_ledger(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "leases.jsonl"
            original = {
                "event_id": "role", "sequence": 1, "kind": "LEASE_GRANTED",
                "payload": {
                    "lease_id": "role-1", "subject": "agent-a", "lease_class": "ROLE",
                    "resource": "DEVELOPER", "scope": "owner/repo", "purpose": "development",
                    "expires_sequence": 20,
                },
            }
            state = append(path, load(path), original)
            before = path.read_text(encoding="utf-8")
            release = {
                "event_id": "release", "sequence": 2, "kind": "LEASE_RELEASED",
                "payload": {"lease_id": "role-1"},
            }
            invalid_replacement = {
                "event_id": "replacement", "sequence": 3, "kind": "LEASE_GRANTED",
                "payload": {
                    "lease_id": "role-2", "subject": "agent-b", "lease_class": "ROLE",
                    "resource": "*", "scope": "owner/repo", "purpose": "development",
                    "expires_sequence": 30,
                },
            }
            with self.assertRaises(Exception):
                append_many(path, state, [release, invalid_replacement])
            self.assertEqual(path.read_text(encoding="utf-8"), before)

    def test_roster_after_rotation_shows_only_new_role_holder(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "leases.jsonl"
            first = {
                "event_id": "role", "sequence": 1, "kind": "LEASE_GRANTED",
                "payload": {
                    "lease_id": "role-1", "subject": "agent-a", "lease_class": "ROLE",
                    "resource": "DEVELOPER", "scope": "owner/repo", "purpose": "development",
                    "expires_sequence": 20,
                },
            }
            state = append(path, load(path), first)
            from core.leases import make_lease_rotation_events
            release, replacement = make_lease_rotation_events(
                state, "role-1",
                release_event_id="release",
                grant_event_id="replacement",
                new_lease_id="role-2",
                new_subject="agent-b",
                expires_sequence=30,
            )
            state = append_many(path, state, [release, replacement])
            roster = build_roster(state, sequence=4)
            self.assertEqual([row["subject"] for row in roster["subjects"]], ["agent-b"])
            self.assertEqual(roster["subjects"][0]["roles"][0]["role"], "DEVELOPER")
            self.assertEqual(roster["subjects"][0]["authority_grants"], [])

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
