import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "lease_ledger.py"


def event(sequence, kind, payload, event_id="e1"):
    return {"event_id": event_id, "sequence": sequence, "kind": kind, "payload": payload}


def grant():
    return event(1, "AUTHORITY_GRANTED", {
        "grant_id": "grant-1",
        "subject": "agent-a",
        "action": "MERGE",
        "target": "sha-123",
        "scope": "repo-x",
        "expires_sequence": 10,
        "required_evidence": [],
    })


class LeaseLedgerIngressTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, str(SCRIPT), *map(str, args)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_raw_authority_grant_append_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            ledger = tmp / "leases.jsonl"
            event_file = tmp / "event.json"
            event_file.write_text(json.dumps(grant()), encoding="utf-8")

            result = self.run_cli("append", ledger, event_file)

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("raw AUTHORITY_GRANTED admission is forbidden", result.stderr)
            self.assertFalse(ledger.exists())

    def test_non_authority_event_append_remains_available(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            ledger = tmp / "leases.jsonl"
            event_file = tmp / "event.json"
            role = event(1, "ROLE_LEASE_GRANTED", {
                "lease_id": "role-1",
                "subject": "agent-a",
                "role": "AUDITOR",
                "scope": "repo-x",
                "expires_sequence": 10,
            })
            event_file.write_text(json.dumps(role), encoding="utf-8")

            result = self.run_cli("append", ledger, event_file)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(ledger.exists())

    def test_historical_raw_grant_can_still_be_replayed(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            ledger = tmp / "leases.jsonl"
            ledger.write_text(json.dumps(grant()) + "\n", encoding="utf-8")

            result = self.run_cli("state", ledger)

            self.assertEqual(result.returncode, 0, result.stderr)
            state = json.loads(result.stdout)
            self.assertEqual(state["authority_grants"][0]["grant_id"], "grant-1")


if __name__ == "__main__":
    unittest.main()
