"""Pure materialization of an externally retained append-only event history."""

from dataclasses import dataclass
from hashlib import sha256

from .events import canonical_event
from .predicates import admit


@dataclass(frozen=True)
class State:
    status: str = "NEW"
    last_sequence: int = 0
    event_ids: frozenset[str] = frozenset()
    history_hash: str = sha256(b"").hexdigest()


def reduce(state, event):
    """Admit one event and return a new state; rejection leaves input untouched."""
    encoded = canonical_event(event)
    status = admit(state, event)
    return State(
        status=status,
        last_sequence=event["sequence"],
        event_ids=state.event_ids | {event["event_id"]},
        history_hash=sha256(bytes.fromhex(state.history_hash) + encoded).hexdigest(),
    )


def replay(events):
    """Recover materialized state from the complete ordered admitted history."""
    state = State()
    for event in events:
        state = reduce(state, event)
    return state
