#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.telemetry import TelemetryError, TelemetryForkError, TelemetryProvenanceError, TelemetryStore
from core.telemetry_auth import TelemetryAuthError, create_identity


def emit(value):
    print(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")), flush=True)


def _add_signing_args(p, *, trust=False):
    p.add_argument("--private-key", default=os.environ.get("SOCRATES_TELEMETRY_PRIVATE_KEY"))
    p.add_argument("--signer-kid", default=os.environ.get("SOCRATES_TELEMETRY_SIGNER_KID"))
    if trust:
        p.add_argument("--trust-store", default=os.environ.get("SOCRATES_TELEMETRY_TRUST_STORE"))
        p.add_argument("--allow-untrusted", action="store_true")


def parser():
    p = argparse.ArgumentParser(description="SOCRATES v1.3 cross-relay turn telemetry")
    p.add_argument("--db", default=os.environ.get("SOCRATES_TELEMETRY_DB", "~/.local/share/dao-agentic/telemetry.db"))
    sub = p.add_subparsers(dest="cmd", required=True)

    ident = sub.add_parser("identity-init", help="create an Ed25519 telemetry instance identity")
    ident.add_argument("--instance-id", required=True)
    ident.add_argument("--kid", required=True)
    ident.add_argument("--private-key", required=True)
    ident.add_argument("--public-key", required=True)

    r = sub.add_parser("record", help="append one local TURN_RECORDED event")
    for name in ["instance-id", "incarnation-id", "thread-id", "turn-id", "role"]:
        r.add_argument(f"--{name}", required=True)
    r.add_argument("--content")
    r.add_argument("--content-file")
    r.add_argument("--content-sha256")
    r.add_argument("--no-content", action="store_true", help="store commitment only")
    r.add_argument("--privacy-class", default="INTERNAL")
    r.add_argument("--occurred-at")
    r.add_argument("--provenance-json", default="{}")

    e = sub.add_parser("export", help="export next immutable local telemetry segment")
    for name in ["relay-id", "instance-id", "incarnation-id", "out-dir"]:
        e.add_argument(f"--{name}", required=True)
    e.add_argument("--max-events", type=int, default=100)
    _add_signing_args(e)

    i = sub.add_parser("import", help="verify and import one foreign telemetry segment")
    i.add_argument("segment")
    i.add_argument("--local-instance-id")
    i.add_argument("--trust-store", default=os.environ.get("SOCRATES_TELEMETRY_TRUST_STORE"))
    i.add_argument("--allow-untrusted", action="store_true")

    s = sub.add_parser("sync", help="export local pending turns then import relay segments")
    for name in ["relay-id", "instance-id", "incarnation-id", "relay-dir"]:
        s.add_argument(f"--{name}", required=True)
    s.add_argument("--max-events", type=int, default=100)
    _add_signing_args(s, trust=True)

    h = sub.add_parser("hook", help="read JSONL turns from stdin; record + signed-sync each accepted turn")
    for name in ["relay-id", "instance-id", "incarnation-id", "relay-dir"]:
        h.add_argument(f"--{name}", required=True)
    h.add_argument("--max-events", type=int, default=100)
    _add_signing_args(h, trust=True)

    q = sub.add_parser("query", help="reconstruct a thread across local + foreign histories")
    q.add_argument("--thread-id", required=True)

    b = sub.add_parser("snapshot", help="SQLite Online Backup API snapshot")
    b.add_argument("destination")
    return p


def _record_from_payload(store: TelemetryStore, payload: dict, *, instance_id: str, incarnation_id: str):
    if not isinstance(payload, dict):
        raise TelemetryError("turn hook input must be a JSON object")
    for key in ["thread_id", "turn_id", "role"]:
        if key not in payload:
            raise TelemetryError(f"turn hook input missing {key}")
    provenance = payload.get("provenance", {})
    if not isinstance(provenance, dict):
        raise TelemetryError("turn hook provenance must be an object")
    provenance = {"capture": "jsonl-hook", **provenance}
    return store.record_turn(
        instance_id=instance_id,
        incarnation_id=incarnation_id,
        thread_id=payload["thread_id"],
        turn_id=payload["turn_id"],
        role=payload["role"],
        content=payload.get("content"),
        content_sha256=payload.get("content_sha256"),
        include_content=bool(payload.get("include_content", True)),
        privacy_class=payload.get("privacy_class", "INTERNAL"),
        occurred_at=payload.get("occurred_at"),
        provenance=provenance,
        event_id=payload.get("event_id"),
    )


def main() -> int:
    args = parser().parse_args()
    try:
        if args.cmd == "identity-init":
            entry = create_identity(
                private_key_path=args.private_key,
                public_key_path=args.public_key,
                instance_id=args.instance_id,
                kid=args.kid,
            )
            emit({"status": "IDENTITY_CREATED", "trust_entry": entry})
            return 0

        with TelemetryStore(args.db) as store:
            if args.cmd == "record":
                if args.content and args.content_file:
                    raise TelemetryError("use only one of --content or --content-file")
                content = args.content
                if args.content_file:
                    content = Path(args.content_file).read_text(encoding="utf-8")
                provenance = json.loads(args.provenance_json)
                ev = store.record_turn(
                    instance_id=args.instance_id, incarnation_id=args.incarnation_id,
                    thread_id=args.thread_id, turn_id=args.turn_id, role=args.role,
                    content=content, content_sha256=args.content_sha256,
                    include_content=not args.no_content, privacy_class=args.privacy_class,
                    occurred_at=args.occurred_at, provenance=provenance,
                )
                emit(ev)
            elif args.cmd == "export":
                path = store.export_segment(
                    relay_id=args.relay_id, instance_id=args.instance_id,
                    incarnation_id=args.incarnation_id, out_dir=args.out_dir,
                    max_events=args.max_events,
                    private_key_path=args.private_key, signer_kid=args.signer_kid,
                )
                emit({"exported": None if path is None else str(path)})
            elif args.cmd == "import":
                emit(store.import_segment(
                    args.segment, local_instance_id=args.local_instance_id,
                    trust_store=args.trust_store, allow_untrusted=args.allow_untrusted,
                ).__dict__)
            elif args.cmd == "sync":
                emit(store.sync_relay(
                    relay_id=args.relay_id, instance_id=args.instance_id,
                    incarnation_id=args.incarnation_id, relay_dir=args.relay_dir,
                    max_events=args.max_events,
                    private_key_path=args.private_key, signer_kid=args.signer_kid,
                    trust_store=args.trust_store, allow_untrusted=args.allow_untrusted,
                ))
            elif args.cmd == "hook":
                if not args.private_key or not args.signer_kid or not args.trust_store:
                    raise TelemetryProvenanceError("hook requires private key, signer kid, and trust store")
                for line_number, line in enumerate(sys.stdin, 1):
                    if not line.strip():
                        continue
                    try:
                        payload = json.loads(line)
                        ev = _record_from_payload(
                            store, payload, instance_id=args.instance_id,
                            incarnation_id=args.incarnation_id,
                        )
                        sync = store.sync_relay(
                            relay_id=args.relay_id, instance_id=args.instance_id,
                            incarnation_id=args.incarnation_id, relay_dir=args.relay_dir,
                            max_events=args.max_events,
                            private_key_path=args.private_key, signer_kid=args.signer_kid,
                            trust_store=args.trust_store,
                        )
                        emit({"status": "RECORDED_AND_SYNCED", "line": line_number, "event": ev, "sync": sync})
                    except Exception as exc:
                        emit({"status": "HOLD", "line": line_number, "error": str(exc), "error_type": type(exc).__name__})
            elif args.cmd == "query":
                for ev in store.events_for_thread(args.thread_id):
                    emit(ev)
            elif args.cmd == "snapshot":
                emit({"snapshot": str(store.snapshot(args.destination))})
        return 0
    except (TelemetryError, TelemetryAuthError, json.JSONDecodeError) as exc:
        emit({"status": "HOLD", "error": str(exc), "error_type": type(exc).__name__})
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
