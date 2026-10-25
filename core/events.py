"""Strict event contract and canonical JSON encoding."""

import json
import math

KINDS = (
    "TASK_ADMITTED", "TASK_READY", "WORK_STARTED", "OUTPUT_READY",
    "VERIFICATION_PASSED", "VERIFICATION_FAILED", "HOLD_ENTERED",
    "RECOVERY_COMPLETED", "CHECKPOINTED",
)
FIELDS = frozenset(("event_id", "sequence", "kind", "payload"))


class AdmissionError(ValueError):
    """An event cannot be appended to the admitted history."""


def _validate_json(value, ancestors):
    if value is None or type(value) in (str, bool, int):
        return
    if type(value) is float and math.isfinite(value):
        return
    if type(value) not in (dict, list):
        raise AdmissionError("payload must contain only finite JSON values")
    if id(value) in ancestors:
        raise AdmissionError("payload must not contain cycles")
    ancestors = ancestors | {id(value)}
    if type(value) is dict:
        if any(type(key) is not str for key in value):
            raise AdmissionError("JSON object keys must be strings")
        values = value.values()
    else:
        values = value
    for child in values:
        _validate_json(child, ancestors)


def canonical_event(event):
    """Validate and return canonical UTF-8 bytes; never retain caller payloads.

    Canonicalization uses sorted keys, compact separators, ASCII escapes, and
    finite numbers under Python's JSON encoding. Numeric types are preserved.
    """
    if type(event) is not dict or set(event) != FIELDS:
        raise AdmissionError("event must contain exactly event_id, sequence, kind, payload")
    if type(event["event_id"]) is not str or not event["event_id"]:
        raise AdmissionError("event_id must be a non-empty string")
    if type(event["sequence"]) is not int or event["sequence"] < 1:
        raise AdmissionError("sequence must be an integer >= 1")
    if type(event["kind"]) is not str or event["kind"] not in KINDS:
        raise AdmissionError("unrecognized event kind")
    if type(event["payload"]) is not dict:
        raise AdmissionError("payload must be a JSON object")
    _validate_json(event["payload"], set())
    return json.dumps(event, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=True, allow_nan=False).encode("utf-8")
