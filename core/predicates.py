"""Hard admission predicates: every unspecified transition is rejected."""

from .events import AdmissionError

TRANSITIONS = {
    ("NEW", "TASK_ADMITTED"): "ADMITTED",
    ("ADMITTED", "TASK_READY"): "READY",
    ("READY", "WORK_STARTED"): "RUNNING",
    ("RUNNING", "OUTPUT_READY"): "VERIFYING",
    ("RUNNING", "HOLD_ENTERED"): "HOLD",
    ("VERIFYING", "VERIFICATION_PASSED"): "VERIFIED",
    ("VERIFYING", "VERIFICATION_FAILED"): "HOLD",
    ("VERIFYING", "HOLD_ENTERED"): "HOLD",
    ("HOLD", "RECOVERY_COMPLETED"): "READY",
    ("VERIFIED", "CHECKPOINTED"): "DONE",
}


def admit(state, event):
    """Return the next status or reject without modifying state."""
    if event["event_id"] in state.event_ids:
        raise AdmissionError("duplicate event_id")
    if event["sequence"] != state.last_sequence + 1:
        raise AdmissionError("sequence must be contiguous and increasing")
    try:
        return TRANSITIONS[state.status, event["kind"]]
    except KeyError:
        raise AdmissionError("unspecified lifecycle transition") from None
