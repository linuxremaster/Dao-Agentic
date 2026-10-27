"""Node/Python test-runner boundary: fixture loading and baseline observations."""

import json
from hashlib import sha256
from pathlib import Path

from core import State, reduce
from core.events import canonical_event
from .candidates import observe, replay

ROOT = Path(__file__).resolve().parents[3]
FIXTURES = ROOT / "experiments/numeric_contract/fixtures/probes.json"
LIFECYCLE = ["TASK_ADMITTED", "TASK_READY", "WORK_STARTED", "OUTPUT_READY",
             "VERIFICATION_PASSED", "CHECKPOINTED"]


def history(payload='{"value":1.5}'):
    return [f'{{"event_id":"h{i}","sequence":{i},"kind":"{kind}","payload":{payload}}}'
            for i, kind in enumerate(LIFECYCLE, 1)]


def baseline(raw):
    # P remains the unmodified production Python implementation.
    try:
        event = json.loads(raw)
        encoded = canonical_event(event)
        observation = {"result": "ok", "canonical_hex": encoded.hex(),
                       "canonical_text": encoded.decode("utf-8"),
                       "event_sha256": sha256(encoded).hexdigest()}
        try:
            state = reduce(State(), event)
            observation["reduction"] = {"status": state.status, "history_hash": state.history_hash}
        except ValueError as error:
            observation["reduction"] = {"result": "reject", "reason": str(error)}
        return observation
    except ValueError as error:
        return {"result": "reject", "reason": str(error)}


def emit():
    fixtures = json.loads(FIXTURES.read_text(encoding="utf-8"))["probes"]
    return {"observations": [{"name": fixture["name"], "baseline": baseline(fixture["raw_event_json"]),
                              **{candidate: observe(candidate, fixture["raw_event_json"])
                                 for candidate in "NJD"}} for fixture in fixtures],
            "replays": {candidate: replay(candidate, history()) for candidate in "NJD"}}


if __name__ == "__main__":
    print(json.dumps(emit(), ensure_ascii=True, sort_keys=True))
