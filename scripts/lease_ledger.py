#!/usr/bin/env python3
"""Append/replay the leased-role/authority JSONL ledger using only stdlib."""

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.leases import LeaseState, make_decision_event, reduce_lease


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


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    add = sub.add_parser("append")
    add.add_argument("ledger", type=Path)
    add.add_argument("event", type=Path)
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
    elif args.command == "decide":
        request = {
            "request_id": args.request_id, "subject": args.subject, "action": args.action,
            "target": args.target, "scope": args.scope, "evidence_ids": args.evidence,
        }
        event = make_decision_event(state, request, args.event_id)
        state = append(args.ledger, state, event)
        print(json.dumps(event["payload"], sort_keys=True))
    else:
        print(json.dumps({
            "last_sequence": state.last_sequence,
            "history_hash": state.history_hash,
            "role_leases": [vars(x) for x in state.role_leases],
            "authority_grants": [{**vars(x), "required_evidence": list(x.required_evidence)} for x in state.authority_grants],
            "released_role_leases": sorted(state.released_role_leases),
            "released_authority_grants": sorted(state.released_authority_grants),
            "decisions": list(state.decisions),
        }, sort_keys=True))


if __name__ == "__main__":
    main()
