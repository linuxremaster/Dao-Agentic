"""Leased roles and action-scoped authority with deterministic replay.

Roles are descriptive only. They are never consulted by the authority evaluator.
Authority exists only as an explicit grant bound to subject + action + target + scope,
with mandatory expiry and optional evidence requirements. All state changes are events.
"""

from dataclasses import dataclass, field
from hashlib import sha256
import json


class LeaseError(ValueError):
    """A lease event or authority request is structurally or semantically invalid."""


EVENT_KINDS = (
    "ROLE_LEASE_GRANTED",
    "ROLE_LEASE_RELEASED",
    "AUTHORITY_GRANTED",
    "AUTHORITY_RELEASED",
    "AUTHORITY_DECIDED",
)
EVENT_FIELDS = frozenset(("event_id", "sequence", "kind", "payload"))
REQUEST_FIELDS = frozenset(("request_id", "subject", "action", "target", "scope", "evidence_ids"))
FORBIDDEN_WILDCARDS = frozenset(("*", "ANY", "ALL"))


def _nonempty(value, name):
    if type(value) is not str or not value.strip():
        raise LeaseError(f"{name} must be a non-empty string")
    if value in FORBIDDEN_WILDCARDS:
        raise LeaseError(f"{name} must be explicit; wildcards are forbidden")
    return value


def _string_list(value, name):
    if type(value) is not list or any(type(item) is not str or not item for item in value):
        raise LeaseError(f"{name} must be a list of non-empty strings")
    if len(value) != len(set(value)):
        raise LeaseError(f"{name} must not contain duplicates")
    return tuple(value)


def stable_event_bytes(event):
    """Return deterministic bytes for history hashing; this grants no authority."""
    return json.dumps(event, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


@dataclass(frozen=True)
class RoleLease:
    lease_id: str
    subject: str
    role: str
    scope: str
    issued_sequence: int
    expires_sequence: int


@dataclass(frozen=True)
class AuthorityGrant:
    grant_id: str
    subject: str
    action: str
    target: str
    scope: str
    issued_sequence: int
    expires_sequence: int
    required_evidence: tuple[str, ...] = ()


@dataclass(frozen=True)
class AuthorityDecision:
    allowed: bool
    reason: str
    grant_id: str | None


@dataclass(frozen=True)
class LeaseState:
    last_sequence: int = 0
    event_ids: frozenset[str] = frozenset()
    role_leases: tuple[RoleLease, ...] = ()
    authority_grants: tuple[AuthorityGrant, ...] = ()
    released_role_leases: frozenset[str] = frozenset()
    released_authority_grants: frozenset[str] = frozenset()
    decisions: tuple[dict, ...] = ()
    history_hash: str = field(default_factory=lambda: sha256(b"").hexdigest())


def _validate_event_envelope(event, state):
    if type(event) is not dict or set(event) != EVENT_FIELDS:
        raise LeaseError("event must contain exactly event_id, sequence, kind, payload")
    _nonempty(event["event_id"], "event_id")
    if event["event_id"] in state.event_ids:
        raise LeaseError("duplicate event_id")
    if type(event["sequence"]) is not int or event["sequence"] != state.last_sequence + 1:
        raise LeaseError("sequence must be contiguous and increasing")
    if event["kind"] not in EVENT_KINDS:
        raise LeaseError("unrecognized lease event kind")
    if type(event["payload"]) is not dict:
        raise LeaseError("payload must be an object")


def _exact_payload(payload, fields):
    if set(payload) != frozenset(fields):
        raise LeaseError("payload fields do not match event kind")


def _validate_expiry(expires_sequence, issued_sequence):
    if type(expires_sequence) is not int or expires_sequence <= issued_sequence:
        raise LeaseError("expires_sequence must be an integer greater than the grant sequence")


def validate_request(request):
    if type(request) is not dict or set(request) != REQUEST_FIELDS:
        raise LeaseError("request must contain exactly request_id, subject, action, target, scope, evidence_ids")
    for name in ("request_id", "subject", "action", "target", "scope"):
        _nonempty(request[name], name)
    evidence = _string_list(request["evidence_ids"], "evidence_ids")
    return request | {"evidence_ids": list(evidence)}


def active_roles(state, subject, scope, sequence=None):
    """Return active descriptive role leases. These never grant authority."""
    _nonempty(subject, "subject")
    _nonempty(scope, "scope")
    at = state.last_sequence + 1 if sequence is None else sequence
    if type(at) is not int or at < 1:
        raise LeaseError("sequence must be an integer >= 1")
    return tuple(
        lease for lease in state.role_leases
        if lease.subject == subject and lease.scope == scope
        and lease.lease_id not in state.released_role_leases
        and lease.issued_sequence <= at < lease.expires_sequence
    )


def decide_authority(state, request, sequence=None):
    """Evaluate exact action authority. Role/title/status are intentionally absent."""
    request = validate_request(request)
    at = state.last_sequence + 1 if sequence is None else sequence
    if type(at) is not int or at < 1:
        raise LeaseError("sequence must be an integer >= 1")
    evidence = set(request["evidence_ids"])
    candidates = []
    for grant in state.authority_grants:
        if grant.grant_id in state.released_authority_grants:
            continue
        if not (grant.issued_sequence <= at < grant.expires_sequence):
            continue
        if (grant.subject, grant.action, grant.target, grant.scope) != (
            request["subject"], request["action"], request["target"], request["scope"]
        ):
            continue
        if not set(grant.required_evidence).issubset(evidence):
            continue
        candidates.append(grant)
    if not candidates:
        return AuthorityDecision(False, "NO_VALID_GRANT", None)
    grant = sorted(candidates, key=lambda item: item.grant_id)[0]
    return AuthorityDecision(True, "VALID_SCOPED_GRANT", grant.grant_id)


def make_decision_event(state, request, event_id):
    request = validate_request(request)
    _nonempty(event_id, "event_id")
    sequence = state.last_sequence + 1
    decision = decide_authority(state, request, sequence)
    return {
        "event_id": event_id,
        "sequence": sequence,
        "kind": "AUTHORITY_DECIDED",
        "payload": {
            **request,
            "allowed": decision.allowed,
            "reason": decision.reason,
            "grant_id": decision.grant_id,
        },
    }


def reduce_lease(state, event):
    """Apply one lease event. Forged authority decisions are rejected."""
    _validate_event_envelope(event, state)
    kind = event["kind"]
    payload = event["payload"]
    roles = list(state.role_leases)
    grants = list(state.authority_grants)
    released_roles = set(state.released_role_leases)
    released_grants = set(state.released_authority_grants)
    decisions = list(state.decisions)

    if kind == "ROLE_LEASE_GRANTED":
        _exact_payload(payload, ("lease_id", "subject", "role", "scope", "expires_sequence"))
        lease_id = _nonempty(payload["lease_id"], "lease_id")
        if any(item.lease_id == lease_id for item in roles):
            raise LeaseError("duplicate lease_id")
        _validate_expiry(payload["expires_sequence"], event["sequence"])
        roles.append(RoleLease(
            lease_id=lease_id,
            subject=_nonempty(payload["subject"], "subject"),
            role=_nonempty(payload["role"], "role"),
            scope=_nonempty(payload["scope"], "scope"),
            issued_sequence=event["sequence"],
            expires_sequence=payload["expires_sequence"],
        ))

    elif kind == "ROLE_LEASE_RELEASED":
        _exact_payload(payload, ("lease_id",))
        lease_id = _nonempty(payload["lease_id"], "lease_id")
        if not any(item.lease_id == lease_id for item in roles):
            raise LeaseError("unknown lease_id")
        if lease_id in released_roles:
            raise LeaseError("role lease already released")
        released_roles.add(lease_id)

    elif kind == "AUTHORITY_GRANTED":
        _exact_payload(payload, (
            "grant_id", "subject", "action", "target", "scope",
            "expires_sequence", "required_evidence",
        ))
        grant_id = _nonempty(payload["grant_id"], "grant_id")
        if any(item.grant_id == grant_id for item in grants):
            raise LeaseError("duplicate grant_id")
        _validate_expiry(payload["expires_sequence"], event["sequence"])
        grants.append(AuthorityGrant(
            grant_id=grant_id,
            subject=_nonempty(payload["subject"], "subject"),
            action=_nonempty(payload["action"], "action"),
            target=_nonempty(payload["target"], "target"),
            scope=_nonempty(payload["scope"], "scope"),
            issued_sequence=event["sequence"],
            expires_sequence=payload["expires_sequence"],
            required_evidence=_string_list(payload["required_evidence"], "required_evidence"),
        ))

    elif kind == "AUTHORITY_RELEASED":
        _exact_payload(payload, ("grant_id",))
        grant_id = _nonempty(payload["grant_id"], "grant_id")
        if not any(item.grant_id == grant_id for item in grants):
            raise LeaseError("unknown grant_id")
        if grant_id in released_grants:
            raise LeaseError("authority grant already released")
        released_grants.add(grant_id)

    else:
        _exact_payload(payload, (
            "request_id", "subject", "action", "target", "scope", "evidence_ids",
            "allowed", "reason", "grant_id",
        ))
        request = {key: payload[key] for key in REQUEST_FIELDS}
        request = validate_request(request)
        expected = decide_authority(state, request, event["sequence"])
        if type(payload["allowed"]) is not bool:
            raise LeaseError("allowed must be boolean")
        if payload["grant_id"] is not None and (type(payload["grant_id"]) is not str or not payload["grant_id"]):
            raise LeaseError("grant_id must be null or non-empty string")
        if (payload["allowed"], payload["reason"], payload["grant_id"]) != (
            expected.allowed, expected.reason, expected.grant_id
        ):
            raise LeaseError("authority decision does not match current grants")
        decisions.append(dict(payload))

    encoded = stable_event_bytes(event)
    return LeaseState(
        last_sequence=event["sequence"],
        event_ids=state.event_ids | {event["event_id"]},
        role_leases=tuple(roles),
        authority_grants=tuple(grants),
        released_role_leases=frozenset(released_roles),
        released_authority_grants=frozenset(released_grants),
        decisions=tuple(decisions),
        history_hash=sha256(bytes.fromhex(state.history_hash) + encoded).hexdigest(),
    )


def replay_leases(events):
    state = LeaseState()
    for event in events:
        state = reduce_lease(state, event)
    return state
