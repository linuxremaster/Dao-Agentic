"""Leased roles, assignments, and action-scoped authority with deterministic replay.

Roles and generic leases are descriptive/control state only. They are never consulted by
the authority evaluator unless a subsystem explicitly asks for that lease class.
Authority exists only as an explicit grant bound to subject + action + target + scope,
with mandatory expiry and optional evidence requirements. All state changes are events.
"""

from dataclasses import dataclass, field
from hashlib import sha256
import json


class LeaseError(ValueError):
    """A lease event or authority request is structurally or semantically invalid."""


EVENT_KINDS = (
    "LEASE_GRANTED",
    "LEASE_RELEASED",
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
class ScopedLease:
    lease_id: str
    subject: str
    lease_class: str
    resource: str
    scope: str
    purpose: str
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
    leases: tuple[ScopedLease, ...] = ()
    role_leases: tuple[RoleLease, ...] = ()
    authority_grants: tuple[AuthorityGrant, ...] = ()
    released_leases: frozenset[str] = frozenset()
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


def _all_lease_ids(state):
    return {item.lease_id for item in state.leases} | {item.lease_id for item in state.role_leases}


def validate_request(request):
    if type(request) is not dict or set(request) != REQUEST_FIELDS:
        raise LeaseError("request must contain exactly request_id, subject, action, target, scope, evidence_ids")
    for name in ("request_id", "subject", "action", "target", "scope"):
        _nonempty(request[name], name)
    evidence = _string_list(request["evidence_ids"], "evidence_ids")
    return request | {"evidence_ids": list(evidence)}


def active_leases(state, subject, lease_class, scope, resource=None, sequence=None):
    """Return active generic leases for an explicit subject/class/scope.

    Generic leases never imply action authority. Consumers must explicitly choose the
    lease class they require and still use the authority path for consequential actions.
    """
    _nonempty(subject, "subject")
    _nonempty(lease_class, "lease_class")
    _nonempty(scope, "scope")
    if resource is not None:
        _nonempty(resource, "resource")
    at = state.last_sequence + 1 if sequence is None else sequence
    if type(at) is not int or at < 1:
        raise LeaseError("sequence must be an integer >= 1")
    return tuple(
        lease for lease in state.leases
        if lease.subject == subject and lease.lease_class == lease_class and lease.scope == scope
        and (resource is None or lease.resource == resource)
        and lease.lease_id not in state.released_leases
        and lease.issued_sequence <= at < lease.expires_sequence
    )


def has_active_lease(state, subject, lease_class, resource, scope, sequence=None):
    """Return True only for an exact active generic lease match."""
    return bool(active_leases(state, subject, lease_class, scope, resource=resource, sequence=sequence))


def active_roles(state, subject, scope, sequence=None):
    """Return active descriptive role leases. These never grant authority.

    Legacy ROLE_LEASE_GRANTED events remain replayable. New role assignments may use
    the universal LEASE_GRANTED event with lease_class=ROLE and resource=<role>.
    """
    _nonempty(subject, "subject")
    _nonempty(scope, "scope")
    at = state.last_sequence + 1 if sequence is None else sequence
    if type(at) is not int or at < 1:
        raise LeaseError("sequence must be an integer >= 1")
    legacy = [
        lease for lease in state.role_leases
        if lease.subject == subject and lease.scope == scope
        and lease.lease_id not in state.released_role_leases
        and lease.issued_sequence <= at < lease.expires_sequence
    ]
    universal = [
        RoleLease(
            lease_id=lease.lease_id,
            subject=lease.subject,
            role=lease.resource,
            scope=lease.scope,
            issued_sequence=lease.issued_sequence,
            expires_sequence=lease.expires_sequence,
        )
        for lease in active_leases(state, subject, "ROLE", scope, sequence=at)
    ]
    return tuple(sorted((*legacy, *universal), key=lambda item: item.lease_id))


def _active_generic_lease_by_id(state, lease_id, sequence):
    _nonempty(lease_id, "lease_id")
    for lease in state.leases:
        if lease.lease_id != lease_id:
            continue
        if lease.lease_id in state.released_leases:
            return None
        if lease.issued_sequence <= sequence < lease.expires_sequence:
            return lease
        return None
    return None


def _active_legacy_role_by_id(state, lease_id, sequence):
    _nonempty(lease_id, "lease_id")
    for lease in state.role_leases:
        if lease.lease_id != lease_id:
            continue
        if lease.lease_id in state.released_role_leases:
            return None
        if lease.issued_sequence <= sequence < lease.expires_sequence:
            return lease
        return None
    return None


def make_lease_rotation_events(
    state,
    old_lease_id,
    *,
    release_event_id,
    grant_event_id,
    new_lease_id,
    new_subject,
    expires_sequence,
    purpose=None,
):
    """Create release-then-grant events for a non-authority lease rotation.

    Rotation preserves lease class, resource and scope. Changing what a lease means is
    a fresh lease, not a rotation. Authority grants are intentionally excluded and must
    rotate through the authenticated authority-admission path.
    """
    _nonempty(old_lease_id, "old_lease_id")
    _nonempty(release_event_id, "release_event_id")
    _nonempty(grant_event_id, "grant_event_id")
    _nonempty(new_lease_id, "new_lease_id")
    _nonempty(new_subject, "new_subject")
    if release_event_id == grant_event_id:
        raise LeaseError("rotation event ids must be distinct")
    if new_lease_id == old_lease_id or new_lease_id in _all_lease_ids(state):
        raise LeaseError("new_lease_id must be unused and different from old_lease_id")

    release_sequence = state.last_sequence + 1
    grant_sequence = state.last_sequence + 2
    _validate_expiry(expires_sequence, grant_sequence)

    current = _active_generic_lease_by_id(state, old_lease_id, release_sequence)
    if current is not None:
        next_purpose = current.purpose if purpose is None else _nonempty(purpose, "purpose")
        release = {
            "event_id": release_event_id,
            "sequence": release_sequence,
            "kind": "LEASE_RELEASED",
            "payload": {"lease_id": old_lease_id},
        }
        grant = {
            "event_id": grant_event_id,
            "sequence": grant_sequence,
            "kind": "LEASE_GRANTED",
            "payload": {
                "lease_id": new_lease_id,
                "subject": new_subject,
                "lease_class": current.lease_class,
                "resource": current.resource,
                "scope": current.scope,
                "purpose": next_purpose,
                "expires_sequence": expires_sequence,
            },
        }
        return release, grant

    legacy = _active_legacy_role_by_id(state, old_lease_id, release_sequence)
    if legacy is not None:
        next_purpose = "role-rotation" if purpose is None else _nonempty(purpose, "purpose")
        release = {
            "event_id": release_event_id,
            "sequence": release_sequence,
            "kind": "ROLE_LEASE_RELEASED",
            "payload": {"lease_id": old_lease_id},
        }
        grant = {
            "event_id": grant_event_id,
            "sequence": grant_sequence,
            "kind": "LEASE_GRANTED",
            "payload": {
                "lease_id": new_lease_id,
                "subject": new_subject,
                "lease_class": "ROLE",
                "resource": legacy.role,
                "scope": legacy.scope,
                "purpose": next_purpose,
                "expires_sequence": expires_sequence,
            },
        }
        return release, grant

    raise LeaseError("old lease is unknown, released, or expired")


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
    leases = list(state.leases)
    roles = list(state.role_leases)
    grants = list(state.authority_grants)
    released_leases = set(state.released_leases)
    released_roles = set(state.released_role_leases)
    released_grants = set(state.released_authority_grants)
    decisions = list(state.decisions)

    if kind == "LEASE_GRANTED":
        _exact_payload(payload, (
            "lease_id", "subject", "lease_class", "resource", "scope", "purpose", "expires_sequence",
        ))
        lease_id = _nonempty(payload["lease_id"], "lease_id")
        if lease_id in _all_lease_ids(state):
            raise LeaseError("duplicate lease_id")
        _validate_expiry(payload["expires_sequence"], event["sequence"])
        leases.append(ScopedLease(
            lease_id=lease_id,
            subject=_nonempty(payload["subject"], "subject"),
            lease_class=_nonempty(payload["lease_class"], "lease_class"),
            resource=_nonempty(payload["resource"], "resource"),
            scope=_nonempty(payload["scope"], "scope"),
            purpose=_nonempty(payload["purpose"], "purpose"),
            issued_sequence=event["sequence"],
            expires_sequence=payload["expires_sequence"],
        ))

    elif kind == "LEASE_RELEASED":
        _exact_payload(payload, ("lease_id",))
        lease_id = _nonempty(payload["lease_id"], "lease_id")
        if not any(item.lease_id == lease_id for item in leases):
            raise LeaseError("unknown lease_id")
        if lease_id in released_leases:
            raise LeaseError("lease already released")
        released_leases.add(lease_id)

    elif kind == "ROLE_LEASE_GRANTED":
        _exact_payload(payload, ("lease_id", "subject", "role", "scope", "expires_sequence"))
        lease_id = _nonempty(payload["lease_id"], "lease_id")
        if lease_id in _all_lease_ids(state):
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
        leases=tuple(leases),
        role_leases=tuple(roles),
        authority_grants=tuple(grants),
        released_leases=frozenset(released_leases),
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
