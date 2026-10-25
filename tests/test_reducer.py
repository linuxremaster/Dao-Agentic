import copy
import unittest

from core import AdmissionError, State, reduce, replay
from core.events import KINDS
from core.predicates import TRANSITIONS

LIFECYCLE = ["TASK_ADMITTED", "TASK_READY", "WORK_STARTED", "OUTPUT_READY",
             "VERIFICATION_PASSED", "CHECKPOINTED"]


def events(kinds=LIFECYCLE):
    return [dict(event_id=f"event-{i}", sequence=i, kind=kind, payload={})
            for i, kind in enumerate(kinds, 1)]


class ReducerTests(unittest.TestCase):
    def test_valid_lifecycle_reaches_done(self):
        state = replay(events())
        self.assertEqual(state.status, "DONE")
        self.assertEqual(state.last_sequence, 6)
        self.assertEqual(len(state.event_ids), 6)

    def test_replay_is_deterministic(self):
        history = events()
        self.assertEqual(replay(history), replay(copy.deepcopy(history)))
        self.assertEqual(reduce(replay(history[:-1]), history[-1]), replay(history))

    def test_canonical_payload_order(self):
        left, right = events(), events()
        left[0]["payload"] = {"z": [1, {"b": 2, "a": 3}], "a": True}
        right[0]["payload"] = {"a": True, "z": [1, {"a": 3, "b": 2}]}
        right[0] = dict(reversed(list(right[0].items())))
        self.assertEqual(replay(left).history_hash, replay(right).history_hash)

    def test_duplicate_ids_rejected(self):
        history = events()
        history[1]["event_id"] = history[0]["event_id"]
        with self.assertRaises(AdmissionError):
            replay(history)

    def test_sequence_gap_and_reordering_rejected(self):
        for sequence in (0, 1, 3):
            with self.subTest(sequence=sequence):
                event = events()[1]
                event["sequence"] = sequence
                with self.assertRaises(AdmissionError):
                    reduce(replay(events()[:1]), event)

    def test_unspecified_transitions_rejected(self):
        paths = [[], LIFECYCLE[:1], LIFECYCLE[:2], LIFECYCLE[:3],
                 LIFECYCLE[:4], LIFECYCLE[:5], LIFECYCLE,
                 LIFECYCLE[:3] + ["HOLD_ENTERED"]]
        for path in paths:
            state = replay(events(path))
            for kind in KINDS:
                if (state.status, kind) not in TRANSITIONS:
                    with self.subTest(status=state.status, kind=kind):
                        event = dict(event_id="next", sequence=len(path)+1,
                                     kind=kind, payload={})
                        with self.assertRaises(AdmissionError):
                            reduce(state, event)

    def test_missing_fields_rejected(self):
        for field in events()[0]:
            with self.subTest(field=field):
                event = events()[0]
                del event[field]
                with self.assertRaises(AdmissionError):
                    reduce(State(), event)

    def test_extra_fields_rejected(self):
        event = events()[0] | {"extra": None}
        with self.assertRaises(AdmissionError):
            reduce(State(), event)

    def test_hold_recovery_returns_ready(self):
        for suffix in (["HOLD_ENTERED"], ["OUTPUT_READY", "HOLD_ENTERED"],
                       ["OUTPUT_READY", "VERIFICATION_FAILED"]):
            with self.subTest(suffix=suffix):
                history = events(LIFECYCLE[:3] + suffix)
                self.assertEqual(replay(history).status, "HOLD")
                history.append(dict(event_id="recover", sequence=len(history)+1,
                                    kind="RECOVERY_COMPLETED", payload={}))
                self.assertEqual(replay(history).status, "READY")

    def test_contract_values_rejected(self):
        invalid = {"event_id": ["", None, 1], "sequence": [True, 1.0, -1],
                   "kind": ["UNKNOWN", None, []], "payload": [[], None, "text"]}
        for field, values in invalid.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    with self.assertRaises(AdmissionError):
                        reduce(State(), events()[0] | {field: value})

    def test_non_json_payload_rejected(self):
        cycle = []
        cycle.append(cycle)
        for value in (float("nan"), float("inf"), (1, 2), {1}, {1: "bad"}, cycle):
            with self.subTest(value=type(value).__name__):
                with self.assertRaises(AdmissionError):
                    reduce(State(), events()[0] | {"payload": {"value": value}})

    def test_inputs_unchanged_and_payload_not_retained(self):
        history = events()
        original = copy.deepcopy(history)
        initial = State()
        state = reduce(initial, history[0])
        self.assertEqual(initial, State())
        self.assertEqual(history, original)
        before = state.history_hash
        history[0]["payload"]["changed"] = True
        self.assertEqual(state.history_hash, before)
        self.assertNotEqual(replay(history).history_hash, replay(original).history_hash)
        with self.assertRaises(AdmissionError):
            reduce(state, history[0])
        self.assertEqual(state, replay(original[:1]))


if __name__ == "__main__":
    unittest.main()
