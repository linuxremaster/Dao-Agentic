"""Pure materialization of an externally retained append-only event history."""

from dataclasses import dataclass, field
from hashlib import sha256

from .events import AdmissionError, canonical_event
from .predicates import admit


_EMPTY_HASH = sha256(b"").hexdigest()
_STATE_SENTINEL = object()


@dataclass(frozen=True)
class State:
    status: str = "NEW"
    last_sequence: int = 0
    event_ids: frozenset[str] = frozenset()
    history_hash: str = _EMPTY_HASH
    _provenance: object = field(default=None, init=False, repr=False, compare=False)


def _is_clean_initial_state(state):
    return (
        isinstance(state, State)
        and state._provenance is None
        and state.status == "NEW"
        and state.last_sequence == 0
        and state.event_ids == frozenset()
        and state.history_hash == _EMPTY_HASH
    )


def _is_reducer_state(state):
    return isinstance(state, State) and state._provenance is _STATE_SENTINEL


def _trusted_state(*, status, last_sequence, event_ids, history_hash):
    state = State(
        status=status,
        last_sequence=last_sequence,
        event_ids=event_ids,
        history_hash=history_hash,
    )
    object.__setattr__(state, "_provenance", _STATE_SENTINEL)
    return state


def reduce(state, event):
    """Admit one event and return a new state; rejection leaves input untouched."""
    if not (_is_clean_initial_state(state) or _is_reducer_state(state)):
        raise AdmissionError("state must be initial or reducer-produced")
    encoded = canonical_event(event)
    status = admit(state, event)
    return _trusted_state(
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
