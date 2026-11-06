#!/usr/bin/env python3
"""Append/replay the leased-role/assignment/authority JSONL ledger using only stdlib.

This CLI is an administrative persistence surface, not an authentication boundary.
Production deployment must keep the ledger unwritable by untrusted agent runtimes.
Raw AUTHORITY_GRANTED admission remains forbidden and must use the signed mandate gate.
"""

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.leases import LeaseState, make_decision_event, make_lease_rotation_events, reduce_lease


def load(path):
    state = LeaseState()
    if not path.exists():
        return state
    with path.open("r", encoding="utf-8") as handle:
        for lineno, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                event = json.loads(line)
                state = reduce_lease(state, event)
            except Exception as exc:
                raise SystemExit(f"invalid ledger at line {lineno}: {exc}") from exc
    return state


def append(path, state, event):
    next_state = reduce_lease(state, event)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, sort_keys=True, separators=(",", ":")) + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    return next_state


def append_many(path, state, events):
    """Validate a batch completely before appending it as one durable write."""
    next_state = state
    encoded = []
    for event in events:
        next_state = reduce_lease(next_state, event)
        encoded.append(json.dumps(event, sort_keys=True, separators=(",", ":")) + "\n")
    if not encoded:
        return state
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write("".join(encoded))
        handle.flush()
        os.fsync(handle.fileno())
    return next_state


def build_roster(state, *, sequence=None, scope=None, subject=None):
    """Derive the active roster from lease state; never create authority from roles."""
    at = state.last_sequence + 1 if sequence is None else sequence
    if type(at) is not int or at < 1:
        raise ValueError("sequence must be an integer >= 1")

    rows = {}

    def include(item_subject, item_scope):
        return (subject is None or item_subject == subject) and (scope is None or item_scope == scope)

    def row_for(item_subject):
        return rows.setdefault(item_subject, {
            "subject": item_subject,
            "roles": [],
            "assignments": [],
            "authority_grants": [],
        })

    for lease in state.leases:
        if lease.lease_id in state.released_leases:
            continue
        if not (lease.issued_sequence <= at < lease.expires_sequence):
            continue
        if not include(lease.subject, lease.scope):
            continue
        row = row_for(lease.subject)
        if lease.lease_class == "ROLE":
            row["roles"].append({
                "lease_id": lease.lease_id,
                "role": lease.resource,
                "scope": lease.scope,
                "purpose": lease.purpose,
                "issued_sequence": lease.issued_sequence,
                "expires_sequence": lease.expires_sequence,
                "source_kind": "LEASE_GRANTED",
            })
        else:
            row["assignments"].append({
                "lease_id": lease.lease_id,
                "lease_class": lease.lease_class,
                "resource": lease.resource,
                "scope": lease.scope,
                "purpose": lease.purpose,
                "issued_sequence": lease.issued_sequence,
                "expires_sequence": lease.expires_sequence,
            })

    for lease in state.role_leases:
        if lease.lease_id in state.released_role_leases:
            continue
        if not (lease.issued_sequence <= at < lease.expires_sequence):
            continue
        if not include(lease.subject, lease.scope):
            continue
        row_for(lease.subject)["roles"].append({
            "lease_id": lease.lease_id,
            "role": lease.role,
            "scope": lease.scope,
            "purpose": "legacy-role-lease",
            "issued_sequence": lease.issued_sequence,
            "expires_sequence": lease.expires_sequence,
            "source_kind": "ROLE_LEASE_GRANTED",
        })

    for grant in state.authority_grants:
        if grant.grant_id in state.released_authority_grants:
            continue
        if not (grant.issued_sequence <= at < grant.expires_sequence):
            continue
        if not include(grant.subject, grant.scope):
            continue
        row_for(grant.subject)["authority_grants"].append({
            "grant_id": grant.grant_id,
            "action": grant.action,
            "target": grant.target,
            "scope": grant.scope,
            "required_evidence": list(grant.required_evidence),
            "issued_sequence": grant.issued_sequence,
            "expires_sequence": grant.expires_sequence,
        })

    subjects = []
    for item_subject in sorted(rows):
        row = rows[item_subject]
        row["roles"].sort(key=lambda item: item["lease_id"])
        row["assignments"].sort(key=lambda item: item["lease_id"])
        row["authority_grants"].sort(key=lambda item: item["grant_id"])
        subjects.append(row)

    return {
        "sequence": at,
        "scope": scope,
        "subject_filter": subject,
        "subjects": subjects,
    }


def _lease_event(state, args):
    return {
        "event_id": args.event_id,
        "sequence": state.last_sequence + 1,
        "kind": "LEASE_GRANTED",
        "payload": {
            "lease_id": args.lease_id,
            "subject": args.subject,
            "lease_class": args.lease_class,
            "resource": args.resource,
            "scope": args.scope,
            "purpose": args.purpose,
            "expires_sequence": args.expires_sequence,
        },
    }


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    add = sub.add_parser("append")
    add.add_argument("ledger", type=Path)
    add.add_argument("event", type=Path)

    lease = sub.add_parser("lease")
    lease.add_argument("ledger", type=Path)
    lease.add_argument("--event-id", required=True)
    lease.add_argument("--lease-id", required=True)
    lease.add_argument("--subject", required=True)
    lease.add_argument("--lease-class", required=True)
    lease.add_argument("--resource", required=True)
    lease.add_argument("--scope", required=True)
    lease.add_argument("--purpose", required=True)
    lease.add_argument("--expires-sequence", required=True, type=int)

    release = sub.add_parser("release")
    release.add_argument("ledger", type=Path)
    release.add_argument("--event-id", required=True)
    release.add_argument("--lease-id", required=True)

    rotate = sub.add_parser("rotate")
    rotate.add_argument("ledger", type=Path)
    rotate.add_argument("--lease-id", required=True, help="active lease being replaced")
    rotate.add_argument("--release-event-id", required=True)
    rotate.add_argument("--grant-event-id", required=True)
    rotate.add_argument("--new-lease-id", required=True)
    rotate.add_argument("--new-subject", required=True)
    rotate.add_argument("--expires-sequence", required=True, type=int)
    rotate.add_argument("--purpose")

    decide = sub.add_parser("decide")
    decide.add_argument("ledger", type=Path)
    decide.add_argument("--event-id", required=True)
    decide.add_argument("--request-id", required=True)
    decide.add_argument("--subject", required=True)
    decide.add_argument("--action", required=True)
    decide.add_argument("--target", required=True)
    decide.add_argument("--scope", required=True)
    decide.add_argument("--evidence", action="append", default=[])
    state_cmd = sub.add_parser("state")
    state_cmd.add_argument("ledger", type=Path)

    roster = sub.add_parser("roster")
    roster.add_argument("ledger", type=Path)
    roster.add_argument("--sequence", type=int)
    roster.add_argument("--scope")
    roster.add_argument("--subject")
    args = parser.parse_args()

    state = load(args.ledger)
    if args.command == "append":
        event = json.loads(args.event.read_text(encoding="utf-8"))
        if event.get("kind") == "AUTHORITY_GRANTED":
            raise SystemExit(
                "raw AUTHORITY_GRANTED admission is forbidden; "
                "use js/scripts/mandate_gate.js with an authenticated operator mandate"
            )
        state = append(args.ledger, state, event)
        print(json.dumps({"accepted": True, "sequence": state.last_sequence, "history_hash": state.history_hash}, sort_keys=True))
    elif args.command == "lease":
        event = _lease_event(state, args)
        state = append(args.ledger, state, event)
        print(json.dumps({"accepted": True, "lease_event": event, "history_hash": state.history_hash}, sort_keys=True))
    elif args.command == "release":
        event = {
            "event_id": args.event_id,
            "sequence": state.last_sequence + 1,
            "kind": "LEASE_RELEASED",
            "payload": {"lease_id": args.lease_id},
        }
        state = append(args.ledger, state, event)
        print(json.dumps({"accepted": True, "release_event": event, "history_hash": state.history_hash}, sort_keys=True))
    elif args.command == "rotate":
        release_event, grant_event = make_lease_rotation_events(
            state,
            args.lease_id,
            release_event_id=args.release_event_id,
            grant_event_id=args.grant_event_id,
            new_lease_id=args.new_lease_id,
            new_subject=args.new_subject,
            expires_sequence=args.expires_sequence,
            purpose=args.purpose,
        )
        state = append_many(args.ledger, state, [release_event, grant_event])
        print(json.dumps({
            "accepted": True,
            "release_event": release_event,
            "grant_event": grant_event,
            "history_hash": state.history_hash,
        }, sort_keys=True))
    elif args.command == "decide":
        request = {
            "request_id": args.request_id, "subject": args.subject, "action": args.action,
            "target": args.target, "scope": args.scope, "evidence_ids": args.evidence,
        }
        event = make_decision_event(state, request, args.event_id)
        state = append(args.ledger, state, event)
        print(json.dumps(event["payload"], sort_keys=True))
    elif args.command == "roster":
        print(json.dumps(build_roster(
            state,
            sequence=args.sequence,
            scope=args.scope,
            subject=args.subject,
        ), sort_keys=True))
    else:
        print(json.dumps({
            "last_sequence": state.last_sequence,
            "history_hash": state.history_hash,
            "leases": [vars(x) for x in state.leases],
            "role_leases": [vars(x) for x in state.role_leases],
            "authority_grants": [{**vars(x), "required_evidence": list(x.required_evidence)} for x in state.authority_grants],
            "released_leases": sorted(state.released_leases),
            "released_role_leases": sorted(state.released_role_leases),
            "released_authority_grants": sorted(state.released_authority_grants),
            "decisions": list(state.decisions),
        }, sort_keys=True))


if __name__ == "__main__":
    main()
