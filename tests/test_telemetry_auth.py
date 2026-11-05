import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from core.telemetry import TelemetryProvenanceError, TelemetryStore
from core.telemetry_auth import create_identity


class TelemetryAuthTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def identity(self, name):
        private = self.root / f"{name}-private.pem"
        public = self.root / f"{name}-public.pem"
        entry = create_identity(
            private_key_path=private,
            public_key_path=public,
            instance_id=f"instance-{name}",
            kid=f"{name}-kid-1",
        )
        return private, public, entry

    def trust(self, *entries, name="trust.json"):
        value = {"version": "1.3", "keys": list(entries)}
        path = self.root / name
        path.write_text(json.dumps(value), encoding="utf-8")
        return path, value

    def test_signed_segment_authenticates_foreign_instance(self):
        private, _, entry = self.identity("a")
        trust_path, _ = self.trust(entry)
        relay = self.root / "relay"
        with TelemetryStore(self.root / "a.db") as a:
            a.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="thread", turn_id="1", role="user", content="hello")
            segment = a.export_segment(
                relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay,
                private_key_path=private, signer_kid="a-kid-1",
            )
        with TelemetryStore(self.root / "b.db") as b:
            result = b.import_segment(segment, local_instance_id="instance-b", trust_store=trust_path)
            self.assertEqual(result.status, "AUTHENTICATED_IMPORTED")
            [event] = b.events_for_thread("thread")
            self.assertEqual(event["source_kind"], "FOREIGN")
            self.assertEqual(event["foreign_auth_status"], "AUTHENTICATED_INSTANCE")
            self.assertEqual(event["foreign_signer_kid"], "a-kid-1")

    def test_unknown_signer_key_holds(self):
        private, _, _ = self.identity("a")
        _, _, other = self.identity("b")
        trust_path, _ = self.trust(other)
        relay = self.root / "relay"
        with TelemetryStore(self.root / "a.db") as a:
            a.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="t", turn_id="1", role="user", content="x")
            segment = a.export_segment(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay, private_key_path=private, signer_kid="a-kid-1")
        with TelemetryStore(self.root / "b.db") as b:
            with self.assertRaises(TelemetryProvenanceError):
                b.import_segment(segment, local_instance_id="instance-b", trust_store=trust_path)

    def test_revoked_signer_key_holds(self):
        private, _, entry = self.identity("a")
        revoked = dict(entry); revoked["status"] = "REVOKED"
        trust_path, _ = self.trust(revoked)
        relay = self.root / "relay"
        with TelemetryStore(self.root / "a.db") as a:
            a.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="t", turn_id="1", role="user", content="x")
            segment = a.export_segment(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay, private_key_path=private, signer_kid="a-kid-1")
        with TelemetryStore(self.root / "b.db") as b:
            with self.assertRaises(TelemetryProvenanceError):
                b.import_segment(segment, local_instance_id="instance-b", trust_store=trust_path)

    def test_tampered_signature_holds(self):
        private, _, entry = self.identity("a")
        trust_path, _ = self.trust(entry)
        relay = self.root / "relay"
        with TelemetryStore(self.root / "a.db") as a:
            a.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="t", turn_id="1", role="user", content="x")
            segment = a.export_segment(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay, private_key_path=private, signer_kid="a-kid-1")
        lines = segment.read_text(encoding="utf-8").splitlines()
        footer = json.loads(lines[-1])
        footer["signature"] = ("A" if footer["signature"][0] != "A" else "B") + footer["signature"][1:]
        lines[-1] = json.dumps(footer, sort_keys=True, separators=(",", ":"))
        bad = self.root / "bad-signature.jsonl"
        bad.write_text("\n".join(lines) + "\n", encoding="utf-8")
        with TelemetryStore(self.root / "b.db") as b:
            with self.assertRaises(TelemetryProvenanceError):
                b.import_segment(bad, local_instance_id="instance-b", trust_store=trust_path)

    def test_unsigned_segment_requires_explicit_compatibility_flag(self):
        relay = self.root / "relay"
        with TelemetryStore(self.root / "a.db") as a:
            a.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="t", turn_id="1", role="user", content="legacy")
            segment = a.export_segment(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay)
        with TelemetryStore(self.root / "b.db") as b:
            with self.assertRaises(TelemetryProvenanceError):
                b.import_segment(segment, local_instance_id="instance-b")
            result = b.import_segment(segment, local_instance_id="instance-b", allow_untrusted=True)
            self.assertEqual(result.status, "INTEGRITY_ONLY_IMPORTED")

    def test_two_instances_roundtrip_with_authenticated_provenance(self):
        a_private, _, a_entry = self.identity("a")
        b_private, _, b_entry = self.identity("b")
        trust_path, _ = self.trust(a_entry, b_entry)
        relay = self.root / "relay"
        with TelemetryStore(self.root / "a.db") as a:
            a.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="thread", turn_id="a1", role="user", content="A")
            a.sync_relay(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", relay_dir=relay, private_key_path=a_private, signer_kid="a-kid-1", trust_store=trust_path)
        with TelemetryStore(self.root / "b.db") as b:
            b.sync_relay(relay_id="r", instance_id="instance-b", incarnation_id="inc-b", relay_dir=relay, private_key_path=b_private, signer_kid="b-kid-1", trust_store=trust_path)
            b.record_turn(instance_id="instance-b", incarnation_id="inc-b", thread_id="thread", turn_id="b1", role="assistant", content="B")
            b.sync_relay(relay_id="r", instance_id="instance-b", incarnation_id="inc-b", relay_dir=relay, private_key_path=b_private, signer_kid="b-kid-1", trust_store=trust_path)
        with TelemetryStore(self.root / "a.db") as a:
            a.sync_relay(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", relay_dir=relay, private_key_path=a_private, signer_kid="a-kid-1", trust_store=trust_path)
            rows = a.events_for_thread("thread")
            self.assertEqual(len(rows), 2)
            foreign = next(x for x in rows if x["source_kind"] == "FOREIGN")
            self.assertEqual(foreign["foreign_auth_status"], "AUTHENTICATED_INSTANCE")

    def test_jsonl_hook_records_and_signed_syncs_each_turn(self):
        private, _, entry = self.identity("a")
        trust_path, _ = self.trust(entry)
        relay = self.root / "relay"
        db = self.root / "hook.db"
        script = Path(__file__).resolve().parents[1] / "scripts" / "telemetry.py"
        payloads = [
            {"thread_id": "thread", "turn_id": "1", "role": "user", "content": "hello"},
            {"thread_id": "thread", "turn_id": "2", "role": "assistant", "content": "world"},
        ]
        proc = subprocess.run([
            sys.executable, str(script), "--db", str(db), "hook",
            "--relay-id", "r", "--instance-id", "instance-a", "--incarnation-id", "inc-a",
            "--relay-dir", str(relay), "--private-key", str(private), "--signer-kid", "a-kid-1",
            "--trust-store", str(trust_path),
        ], input="".join(json.dumps(x) + "\n" for x in payloads), text=True, capture_output=True, check=False)
        self.assertEqual(proc.returncode, 0, proc.stderr + proc.stdout)
        output = [json.loads(line) for line in proc.stdout.splitlines() if line.strip()]
        self.assertEqual([x["status"] for x in output], ["RECORDED_AND_SYNCED", "RECORDED_AND_SYNCED"])
        with TelemetryStore(db) as store:
            self.assertEqual(len(store.events_for_thread("thread")), 2)
        segments = list(relay.glob("telemetry-*.jsonl"))
        self.assertEqual(len(segments), 2)
        for segment in segments:
            footer = json.loads(segment.read_text(encoding="utf-8").splitlines()[-1])
            self.assertEqual(footer["signature_alg"], "Ed25519")
            self.assertEqual(footer["signer_kid"], "a-kid-1")


if __name__ == "__main__":
    unittest.main()
