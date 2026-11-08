import json
import tempfile
import unittest
from pathlib import Path

from core.telemetry import EMPTY_SHA256, TelemetryForkError, TelemetryIntegrityError, TelemetryStore, verify_event


class TelemetryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def store(self, name="a.db"):
        return TelemetryStore(self.root / name)

    def record_pair(self, store):
        a = store.record_turn(
            instance_id="instance-a", incarnation_id="inc-a", thread_id="thread-1", turn_id="t1",
            role="user", content="hello", privacy_class="INTERNAL", occurred_at="2026-11-04T20:00:00.000Z",
            provenance={"carrier": "chat"},
        )
        b = store.record_turn(
            instance_id="instance-a", incarnation_id="inc-a", thread_id="thread-1", turn_id="t2",
            role="assistant", content="world", privacy_class="INTERNAL", occurred_at="2026-11-04T20:00:01.000Z",
            provenance={"carrier": "chat"},
        )
        return a, b

    def test_local_turns_are_contiguous_and_hash_chained(self):
        with self.store() as s:
            a, b = self.record_pair(s)
            self.assertEqual(a["sequence"], 1)
            self.assertEqual(a["previous_hash"], EMPTY_SHA256)
            self.assertEqual(b["sequence"], 2)
            self.assertEqual(b["previous_hash"], a["event_hash"])
            verify_event(a); verify_event(b)

    def test_export_segment_then_foreign_import_preserves_read_only_namespace(self):
        relay = self.root / "relay"
        with self.store("a.db") as a:
            self.record_pair(a)
            segment = a.export_segment(relay_id="relay-1", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay)
            self.assertIsNotNone(segment)
        with self.store("b.db") as b:
            result = b.import_segment(segment, local_instance_id="instance-b", allow_untrusted=True)
            self.assertEqual(result.status, "INTEGRITY_ONLY_IMPORTED")
            self.assertEqual(result.imported, 2)
            rows = b.events_for_thread("thread-1")
            self.assertEqual([x["source_kind"] for x in rows], ["FOREIGN", "FOREIGN"])

    def test_duplicate_segment_is_idempotent(self):
        relay = self.root / "relay"
        with self.store("a.db") as a:
            self.record_pair(a)
            segment = a.export_segment(relay_id="relay-1", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay)
        with self.store("b.db") as b:
            first = b.import_segment(segment, local_instance_id="instance-b", allow_untrusted=True)
            second = b.import_segment(segment, local_instance_id="instance-b", allow_untrusted=True)
            self.assertEqual(first.imported, 2)
            self.assertEqual(second.status, "DUPLICATE_SEGMENT")

    def test_tampered_segment_is_rejected(self):
        relay = self.root / "relay"
        with self.store("a.db") as a:
            self.record_pair(a)
            segment = a.export_segment(relay_id="relay-1", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay)
        lines = segment.read_text().splitlines()
        event = json.loads(lines[1]); event["content"] = "tampered"; lines[1] = json.dumps(event, sort_keys=True, separators=(",", ":"))
        bad = self.root / "bad.jsonl"; bad.write_text("\n".join(lines) + "\n")
        with self.store("b.db") as b:
            with self.assertRaises(TelemetryIntegrityError):
                b.import_segment(bad, local_instance_id="instance-b", allow_untrusted=True)

    def test_fork_at_same_sequence_is_rejected(self):
        relay = self.root / "relay"
        with self.store("a.db") as a:
            self.record_pair(a)
            segment = a.export_segment(relay_id="relay-1", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay, max_events=1)
        with self.store("b.db") as b:
            b.import_segment(segment, local_instance_id="instance-b", allow_untrusted=True)
            # Build a valid but incompatible sequence-2 segment by using a separate source DB with a different sequence-1 history.
        with self.store("fork.db") as f:
            f.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="thread-1", turn_id="fork-1", role="user", content="different genesis")
            f.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="thread-1", turn_id="fork-2", role="assistant", content="different successor")
            forkrelay = self.root / "forkrelay"
            # Export sequence 1, then sequence 2 to get a segment starting at 2.
            f.export_segment(relay_id="relay-x", instance_id="instance-a", incarnation_id="inc-a", out_dir=forkrelay, max_events=1)
            forkseg = f.export_segment(relay_id="relay-x", instance_id="instance-a", incarnation_id="inc-a", out_dir=forkrelay, max_events=1)
        with self.store("b.db") as b:
            with self.assertRaises(TelemetryForkError):
                b.import_segment(forkseg, local_instance_id="instance-b", allow_untrusted=True)

    def test_export_cursor_only_emits_new_events(self):
        relay = self.root / "relay"
        with self.store() as s:
            self.record_pair(s)
            first = s.export_segment(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay, max_events=1)
            second = s.export_segment(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay, max_events=100)
            third = s.export_segment(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=relay, max_events=100)
            self.assertIsNotNone(first); self.assertIsNotNone(second); self.assertIsNone(third)

    def test_restricted_content_fails_closed_at_relay_boundary(self):
        with self.store() as s:
            s.record_turn(instance_id="instance-a", incarnation_id="inc-a", thread_id="t", turn_id="1", role="user", content="secret", privacy_class="RESTRICTED")
            with self.assertRaisesRegex(Exception, "detached-payload"):
                s.export_segment(relay_id="r", instance_id="instance-a", incarnation_id="inc-a", out_dir=self.root / "relay")

    def test_snapshot_uses_sqlite_backup_api(self):
        with self.store() as s:
            self.record_pair(s)
            snap = s.snapshot(self.root / "snapshot.db")
        with TelemetryStore(snap) as copy:
            self.assertEqual(len(copy.events_for_thread("thread-1")), 2)


if __name__ == "__main__":
    unittest.main()
