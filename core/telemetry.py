from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import tempfile
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping, Sequence

from .telemetry_auth import (
    TelemetryAuthError,
    sign_ed25519,
    signature_statement,
    trusted_public_key,
    verify_ed25519,
)

FORMAT_VERSION = "1.3-mvp.1"
EMPTY_SHA256 = hashlib.sha256(b"").hexdigest()
ROLES = {"user", "assistant", "system", "tool", "operator", "other"}
PRIVACY_CLASSES = {"PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"}


class TelemetryError(RuntimeError):
    pass


class TelemetryIntegrityError(TelemetryError):
    pass


class TelemetryForkError(TelemetryIntegrityError):
    pass


class TelemetryProvenanceError(TelemetryIntegrityError):
    pass


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _validate_text(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise TelemetryError(f"{name} must be a non-empty string")
    try:
        raw = value.encode("utf-8", "strict")
        raw.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise TelemetryError(f"{name} contains invalid Unicode") from exc
    return value


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", "strict")).hexdigest()


def _validate_sha256(value: Any, name: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
        raise TelemetryError(f"{name} must be lowercase SHA-256 hex")
    return value


def _normalize_c14n(value: Any, *, path: str = "$") -> Any:
    if value is None or isinstance(value, (str, bool)):
        if isinstance(value, str):
            _validate_text(value, path)
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, float):
        raise TelemetryError(f"{path}: floats are forbidden; preserve decimal text explicitly")
    if isinstance(value, list):
        return [_normalize_c14n(v, path=f"{path}[{i}]") for i, v in enumerate(value)]
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        normalized_keys: dict[str, str] = {}
        for key, child in value.items():
            if not isinstance(key, str):
                raise TelemetryError(f"{path}: object keys must be strings")
            _validate_text(key, f"{path}.<key>")
            nk = unicodedata.normalize("NFC", key)
            if nk in normalized_keys and normalized_keys[nk] != key:
                raise TelemetryError(f"{path}: NFC-colliding object keys are forbidden")
            normalized_keys[nk] = key
            out[key] = _normalize_c14n(child, path=f"{path}.{key}")
        return out
    raise TelemetryError(f"{path}: unsupported canonical value type")


def canonical_json(value: Any) -> str:
    normalized = _normalize_c14n(value)
    return json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def event_hash(event_without_hash: Mapping[str, Any]) -> str:
    previous_hash = _validate_sha256(event_without_hash.get("previous_hash"), "previous_hash")
    material = bytes.fromhex(previous_hash) + canonical_json(dict(event_without_hash)).encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def _event_without_hash(event: Mapping[str, Any]) -> dict[str, Any]:
    out = dict(event)
    out.pop("event_hash", None)
    return out


def verify_event(event: Mapping[str, Any]) -> None:
    required = {
        "format_version", "event_type", "event_id", "instance_id", "incarnation_id", "sequence",
        "thread_id", "turn_id", "role", "occurred_at", "privacy_class", "content_included",
        "content", "content_sha256", "previous_hash", "event_hash", "provenance"
    }
    if set(event) != required:
        raise TelemetryIntegrityError("telemetry event fields do not match contract")
    if event["format_version"] != FORMAT_VERSION or event["event_type"] != "TURN_RECORDED":
        raise TelemetryIntegrityError("unsupported telemetry event format/type")
    for field in ["event_id", "instance_id", "incarnation_id", "thread_id", "turn_id", "occurred_at"]:
        _validate_text(event[field], field)
    if not isinstance(event["sequence"], int) or isinstance(event["sequence"], bool) or event["sequence"] < 1:
        raise TelemetryIntegrityError("sequence must be integer >= 1")
    if event["role"] not in ROLES:
        raise TelemetryIntegrityError("unrecognized role")
    if event["privacy_class"] not in PRIVACY_CLASSES:
        raise TelemetryIntegrityError("unrecognized privacy_class")
    if not isinstance(event["content_included"], bool):
        raise TelemetryIntegrityError("content_included must be boolean")
    if event["content_included"]:
        if not isinstance(event["content"], str):
            raise TelemetryIntegrityError("included content must be string")
        if _sha256_text(event["content"]) != event["content_sha256"]:
            raise TelemetryIntegrityError("content commitment mismatch")
    elif event["content"] is not None:
        raise TelemetryIntegrityError("content must be null when content_included is false")
    _validate_sha256(event["content_sha256"], "content_sha256")
    _validate_sha256(event["previous_hash"], "previous_hash")
    _validate_sha256(event["event_hash"], "event_hash")
    if not isinstance(event["provenance"], dict):
        raise TelemetryIntegrityError("provenance must be an object")
    expected = event_hash(_event_without_hash(event))
    if expected != event["event_hash"]:
        raise TelemetryIntegrityError("event hash mismatch")


@dataclass(frozen=True)
class ImportResult:
    segment_id: str
    status: str
    imported: int
    duplicates: int
    source_instance_id: str
    source_incarnation_id: str
    head_sequence: int
    head_hash: str


class TelemetryStore:
    def __init__(self, db_path: str | os.PathLike[str]):
        self.path = Path(db_path).expanduser()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=FULL")
        self._init_schema()

    def close(self) -> None:
        self.conn.close()

    def __enter__(self) -> "TelemetryStore":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    def _init_schema(self) -> None:
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS telemetry_events (
                event_id TEXT PRIMARY KEY,
                source_kind TEXT NOT NULL CHECK(source_kind IN ('LOCAL','FOREIGN')),
                instance_id TEXT NOT NULL,
                incarnation_id TEXT NOT NULL,
                sequence INTEGER NOT NULL CHECK(sequence >= 1),
                thread_id TEXT NOT NULL,
                turn_id TEXT NOT NULL,
                role TEXT NOT NULL,
                occurred_at TEXT NOT NULL,
                privacy_class TEXT NOT NULL,
                content_included INTEGER NOT NULL CHECK(content_included IN (0,1)),
                content TEXT,
                content_sha256 TEXT NOT NULL,
                previous_hash TEXT NOT NULL,
                event_hash TEXT NOT NULL,
                provenance_json TEXT NOT NULL,
                imported_segment_id TEXT,
                foreign_auth_status TEXT,
                foreign_signer_kid TEXT,
                inserted_at TEXT NOT NULL,
                UNIQUE(instance_id, incarnation_id, sequence),
                UNIQUE(instance_id, incarnation_id, thread_id, turn_id)
            );
            CREATE INDEX IF NOT EXISTS telemetry_thread_idx
                ON telemetry_events(thread_id, occurred_at, instance_id, incarnation_id, sequence);

            CREATE TABLE IF NOT EXISTS relay_cursors (
                relay_id TEXT NOT NULL,
                instance_id TEXT NOT NULL,
                incarnation_id TEXT NOT NULL,
                last_exported_sequence INTEGER NOT NULL,
                last_exported_hash TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY(relay_id, instance_id, incarnation_id)
            );

            CREATE TABLE IF NOT EXISTS telemetry_imports (
                segment_id TEXT PRIMARY KEY,
                source_instance_id TEXT NOT NULL,
                source_incarnation_id TEXT NOT NULL,
                start_sequence INTEGER NOT NULL,
                end_sequence INTEGER NOT NULL,
                head_hash TEXT NOT NULL,
                imported_at TEXT NOT NULL,
                status TEXT NOT NULL,
                auth_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
                signer_kid TEXT
            );
            """
        )
        # Forward-compatible migration for databases created by telemetry MVP v0.1.
        event_columns = {row[1] for row in self.conn.execute("PRAGMA table_info(telemetry_events)")}
        if "foreign_auth_status" not in event_columns:
            self.conn.execute("ALTER TABLE telemetry_events ADD COLUMN foreign_auth_status TEXT")
        if "foreign_signer_kid" not in event_columns:
            self.conn.execute("ALTER TABLE telemetry_events ADD COLUMN foreign_signer_kid TEXT")
        import_columns = {row[1] for row in self.conn.execute("PRAGMA table_info(telemetry_imports)")}
        if "auth_status" not in import_columns:
            self.conn.execute("ALTER TABLE telemetry_imports ADD COLUMN auth_status TEXT NOT NULL DEFAULT 'UNVERIFIED'")
        if "signer_kid" not in import_columns:
            self.conn.execute("ALTER TABLE telemetry_imports ADD COLUMN signer_kid TEXT")
        self.conn.commit()

    def _head(self, instance_id: str, incarnation_id: str) -> tuple[int, str] | None:
        row = self.conn.execute(
            "SELECT sequence,event_hash FROM telemetry_events WHERE instance_id=? AND incarnation_id=? "
            "ORDER BY sequence DESC LIMIT 1",
            (instance_id, incarnation_id),
        ).fetchone()
        return None if row is None else (int(row["sequence"]), str(row["event_hash"]))

    def record_turn(
        self,
        *,
        instance_id: str,
        incarnation_id: str,
        thread_id: str,
        turn_id: str,
        role: str,
        content: str | None = None,
        content_sha256: str | None = None,
        include_content: bool = True,
        privacy_class: str = "INTERNAL",
        occurred_at: str | None = None,
        provenance: Mapping[str, Any] | None = None,
        event_id: str | None = None,
    ) -> dict[str, Any]:
        for name, value in [
            ("instance_id", instance_id), ("incarnation_id", incarnation_id),
            ("thread_id", thread_id), ("turn_id", turn_id),
        ]:
            _validate_text(value, name)
        if role not in ROLES:
            raise TelemetryError(f"role must be one of {sorted(ROLES)}")
        if privacy_class not in PRIVACY_CLASSES:
            raise TelemetryError(f"privacy_class must be one of {sorted(PRIVACY_CLASSES)}")
        if content is None and content_sha256 is None:
            raise TelemetryError("content or content_sha256 is required")
        if content is not None:
            digest = _sha256_text(content)
            if content_sha256 is not None and content_sha256 != digest:
                raise TelemetryError("declared content_sha256 does not match content")
            content_sha256 = digest
        else:
            content_sha256 = _validate_sha256(content_sha256, "content_sha256")
        stored_content = content if (include_content and content is not None) else None

        head = self._head(instance_id, incarnation_id)
        sequence = 1 if head is None else head[0] + 1
        previous_hash = EMPTY_SHA256 if head is None else head[1]
        ev = {
            "format_version": FORMAT_VERSION,
            "event_type": "TURN_RECORDED",
            "event_id": event_id or str(uuid.uuid4()),
            "instance_id": instance_id,
            "incarnation_id": incarnation_id,
            "sequence": sequence,
            "thread_id": thread_id,
            "turn_id": turn_id,
            "role": role,
            "occurred_at": occurred_at or _utc_now(),
            "privacy_class": privacy_class,
            "content_included": stored_content is not None,
            "content": stored_content,
            "content_sha256": content_sha256,
            "previous_hash": previous_hash,
            "provenance": dict(provenance or {}),
        }
        ev["event_hash"] = event_hash(ev)
        verify_event(ev)
        with self.conn:
            self.conn.execute(
                "INSERT INTO telemetry_events("
                "event_id,source_kind,instance_id,incarnation_id,sequence,thread_id,turn_id,role,occurred_at,"
                "privacy_class,content_included,content,content_sha256,previous_hash,event_hash,provenance_json,"
                "imported_segment_id,foreign_auth_status,foreign_signer_kid,inserted_at"
                ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    ev["event_id"], "LOCAL", ev["instance_id"], ev["incarnation_id"], ev["sequence"],
                    ev["thread_id"], ev["turn_id"], ev["role"], ev["occurred_at"], ev["privacy_class"],
                    int(ev["content_included"]), ev["content"], ev["content_sha256"], ev["previous_hash"],
                    ev["event_hash"], canonical_json(ev["provenance"]), None, None, None, _utc_now(),
                ),
            )
        return ev

    def _row_event(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "format_version": FORMAT_VERSION,
            "event_type": "TURN_RECORDED",
            "event_id": row["event_id"],
            "instance_id": row["instance_id"],
            "incarnation_id": row["incarnation_id"],
            "sequence": int(row["sequence"]),
            "thread_id": row["thread_id"],
            "turn_id": row["turn_id"],
            "role": row["role"],
            "occurred_at": row["occurred_at"],
            "privacy_class": row["privacy_class"],
            "content_included": bool(row["content_included"]),
            "content": row["content"],
            "content_sha256": row["content_sha256"],
            "previous_hash": row["previous_hash"],
            "event_hash": row["event_hash"],
            "provenance": json.loads(row["provenance_json"]),
        }

    def events_for_thread(self, thread_id: str) -> list[dict[str, Any]]:
        _validate_text(thread_id, "thread_id")
        rows = self.conn.execute(
            "SELECT * FROM telemetry_events WHERE thread_id=? "
            "ORDER BY occurred_at, instance_id, incarnation_id, sequence",
            (thread_id,),
        ).fetchall()
        return [
            self._row_event(r) | {
                "source_kind": r["source_kind"],
                "foreign_auth_status": r["foreign_auth_status"],
                "foreign_signer_kid": r["foreign_signer_kid"],
            }
            for r in rows
        ]

    def export_segment(
        self,
        *,
        relay_id: str,
        instance_id: str,
        incarnation_id: str,
        out_dir: str | os.PathLike[str],
        max_events: int = 100,
        include_content_classes: Sequence[str] = ("PUBLIC", "INTERNAL"),
        private_key_path: str | os.PathLike[str] | None = None,
        signer_kid: str | None = None,
    ) -> Path | None:
        _validate_text(relay_id, "relay_id")
        _validate_text(instance_id, "instance_id")
        _validate_text(incarnation_id, "incarnation_id")
        if not isinstance(max_events, int) or max_events < 1:
            raise TelemetryError("max_events must be integer >= 1")
        allowed = set(include_content_classes)
        if not allowed.issubset(PRIVACY_CLASSES):
            raise TelemetryError("invalid include_content_classes")
        cursor = self.conn.execute(
            "SELECT last_exported_sequence,last_exported_hash FROM relay_cursors "
            "WHERE relay_id=? AND instance_id=? AND incarnation_id=?",
            (relay_id, instance_id, incarnation_id),
        ).fetchone()
        last_seq = 0 if cursor is None else int(cursor["last_exported_sequence"])
        cursor_hash = EMPTY_SHA256 if cursor is None else str(cursor["last_exported_hash"])
        rows = self.conn.execute(
            "SELECT * FROM telemetry_events WHERE source_kind='LOCAL' AND instance_id=? AND incarnation_id=? "
            "AND sequence>? ORDER BY sequence LIMIT ?",
            (instance_id, incarnation_id, last_seq, max_events),
        ).fetchall()
        if not rows:
            return None
        first = rows[0]
        if int(first["sequence"]) != last_seq + 1 or first["previous_hash"] != cursor_hash:
            raise TelemetryIntegrityError("export cursor does not match local history")
        events: list[dict[str, Any]] = []
        for row in rows:
            ev = self._row_event(row)
            if ev["privacy_class"] not in allowed:
                ev = dict(ev)
                ev["content_included"] = False
                ev["content"] = None
                # Event hash commits the local representation, so redacting content would invalidate the event.
                # Therefore sensitive local events are not exportable in this MVP.
                raise TelemetryError(
                    f"event {ev['event_id']} privacy_class={ev['privacy_class']} is not relay-exportable without a detached-payload design"
                )
            verify_event(ev)
            events.append(ev)
        header = {
            "format_version": FORMAT_VERSION,
            "record_type": "TELEMETRY_SEGMENT_HEADER",
            "relay_id": relay_id,
            "source_instance_id": instance_id,
            "source_incarnation_id": incarnation_id,
            "start_sequence": events[0]["sequence"],
            "end_sequence": events[-1]["sequence"],
            "event_count": len(events),
            "start_previous_hash": events[0]["previous_hash"],
            "head_hash": events[-1]["event_hash"],
            "created_at": _utc_now(),
        }
        segment_material = canonical_json(header) + "\n" + "\n".join(canonical_json(e) for e in events)
        segment_id = hashlib.sha256(segment_material.encode("utf-8")).hexdigest()
        footer = {
            "format_version": FORMAT_VERSION,
            "record_type": "TELEMETRY_SEGMENT_FOOTER",
            "segment_id": segment_id,
            "head_hash": header["head_hash"],
            "event_count": len(events),
        }
        if private_key_path is not None or signer_kid is not None:
            if private_key_path is None or signer_kid is None:
                raise TelemetryProvenanceError("both private_key_path and signer_kid are required for signed export")
            _validate_text(signer_kid, "signer_kid")
            try:
                signature = sign_ed25519(
                    signature_statement(header=header, segment_id=segment_id, signer_kid=signer_kid),
                    private_key_path,
                )
            except TelemetryAuthError as exc:
                raise TelemetryProvenanceError(str(exc)) from exc
            footer.update({
                "signature_alg": "Ed25519",
                "signer_kid": signer_kid,
                "signature": signature,
            })
        out = Path(out_dir).expanduser()
        out.mkdir(parents=True, exist_ok=True)
        filename = f"telemetry-{instance_id}-{incarnation_id}-{events[0]['sequence']:012d}-{events[-1]['sequence']:012d}-{segment_id[:12]}.jsonl"
        target = out / filename
        fd, temp_name = tempfile.mkstemp(prefix=f".{filename}.", dir=out)
        try:
            with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(canonical_json(header) + "\n")
                for ev in events:
                    fh.write(canonical_json(ev) + "\n")
                fh.write(canonical_json(footer) + "\n")
                fh.flush()
                os.fsync(fh.fileno())
            if target.exists():
                raise TelemetryIntegrityError("immutable telemetry segment already exists")
            os.replace(temp_name, target)
        except Exception:
            try:
                os.unlink(temp_name)
            except FileNotFoundError:
                pass
            raise
        with self.conn:
            self.conn.execute(
                "INSERT INTO relay_cursors(relay_id,instance_id,incarnation_id,last_exported_sequence,last_exported_hash,updated_at) "
                "VALUES(?,?,?,?,?,?) ON CONFLICT(relay_id,instance_id,incarnation_id) DO UPDATE SET "
                "last_exported_sequence=excluded.last_exported_sequence,last_exported_hash=excluded.last_exported_hash,updated_at=excluded.updated_at",
                (relay_id, instance_id, incarnation_id, events[-1]["sequence"], events[-1]["event_hash"], _utc_now()),
            )
        return target

    def import_segment(
        self,
        path: str | os.PathLike[str],
        *,
        local_instance_id: str | None = None,
        trust_store: Mapping[str, Any] | str | os.PathLike[str] | None = None,
        allow_untrusted: bool = False,
    ) -> ImportResult:
        p = Path(path).expanduser()
        lines = [line for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]
        if len(lines) < 3:
            raise TelemetryIntegrityError("segment must contain header, event(s), footer")
        try:
            header = json.loads(lines[0])
            events = [json.loads(line) for line in lines[1:-1]]
            footer = json.loads(lines[-1])
        except json.JSONDecodeError as exc:
            raise TelemetryIntegrityError("segment contains invalid JSON") from exc
        if header.get("format_version") != FORMAT_VERSION or header.get("record_type") != "TELEMETRY_SEGMENT_HEADER":
            raise TelemetryIntegrityError("invalid segment header")
        if footer.get("format_version") != FORMAT_VERSION or footer.get("record_type") != "TELEMETRY_SEGMENT_FOOTER":
            raise TelemetryIntegrityError("invalid segment footer")
        for k in ["relay_id", "source_instance_id", "source_incarnation_id", "created_at"]:
            _validate_text(header.get(k), f"header.{k}")
        if local_instance_id is not None and header["source_instance_id"] == local_instance_id:
            return ImportResult(
                footer.get("segment_id", ""), "OWN_SEGMENT_SKIPPED", 0, 0,
                header["source_instance_id"], header["source_incarnation_id"],
                int(header["end_sequence"]), str(header["head_hash"]),
            )
        if int(header.get("event_count", -1)) != len(events) or int(footer.get("event_count", -1)) != len(events):
            raise TelemetryIntegrityError("segment event count mismatch")
        if not events:
            raise TelemetryIntegrityError("empty segments are forbidden")
        material = canonical_json(header) + "\n" + "\n".join(canonical_json(e) for e in events)
        segment_id = hashlib.sha256(material.encode("utf-8")).hexdigest()
        if footer.get("segment_id") != segment_id:
            raise TelemetryIntegrityError("segment_id mismatch")
        source_instance = header["source_instance_id"]
        source_incarnation = header["source_incarnation_id"]

        signer_kid = footer.get("signer_kid")
        signature_alg = footer.get("signature_alg")
        signature = footer.get("signature")
        signed = signer_kid is not None or signature_alg is not None or signature is not None
        auth_status = "UNVERIFIED"
        if signed:
            if not all(isinstance(x, str) and x for x in [signer_kid, signature_alg, signature]):
                raise TelemetryProvenanceError("incomplete telemetry segment signature")
            if signature_alg != "Ed25519":
                raise TelemetryProvenanceError("unsupported telemetry segment signature algorithm")
            if trust_store is None:
                raise TelemetryProvenanceError("signed telemetry requires a trust store")
            try:
                public_key = trusted_public_key(trust_store, instance_id=source_instance, kid=signer_kid)
                ok = verify_ed25519(
                    signature_statement(header=header, segment_id=segment_id, signer_kid=signer_kid),
                    signature,
                    public_key,
                )
            except TelemetryAuthError as exc:
                raise TelemetryProvenanceError(str(exc)) from exc
            if not ok:
                raise TelemetryProvenanceError("telemetry segment signature verification failed")
            auth_status = "AUTHENTICATED_INSTANCE"
        elif not allow_untrusted:
            raise TelemetryProvenanceError("unsigned telemetry segment is untrusted; explicit allow_untrusted is required")
        else:
            signer_kid = None
            auth_status = "INTEGRITY_ONLY"
        expected_seq = int(header["start_sequence"])
        expected_prev = str(header["start_previous_hash"])
        _validate_sha256(expected_prev, "header.start_previous_hash")
        for ev in events:
            verify_event(ev)
            if ev["instance_id"] != source_instance or ev["incarnation_id"] != source_incarnation:
                raise TelemetryIntegrityError("event source does not match segment header")
            if ev["sequence"] != expected_seq:
                raise TelemetryIntegrityError("segment sequence is not contiguous")
            if ev["previous_hash"] != expected_prev:
                raise TelemetryIntegrityError("segment hash chain is not contiguous")
            expected_seq += 1
            expected_prev = ev["event_hash"]
        if events[0]["sequence"] != int(header["start_sequence"]) or events[-1]["sequence"] != int(header["end_sequence"]):
            raise TelemetryIntegrityError("segment sequence bounds mismatch")
        if events[-1]["event_hash"] != header["head_hash"] or footer["head_hash"] != header["head_hash"]:
            raise TelemetryIntegrityError("segment head hash mismatch")

        prior_import = self.conn.execute("SELECT status FROM telemetry_imports WHERE segment_id=?", (segment_id,)).fetchone()
        if prior_import is not None:
            return ImportResult(segment_id, "DUPLICATE_SEGMENT", 0, len(events), source_instance, source_incarnation, events[-1]["sequence"], events[-1]["event_hash"])

        existing_head = self._head(source_instance, source_incarnation)
        if existing_head is None:
            if events[0]["sequence"] != 1 or events[0]["previous_hash"] != EMPTY_SHA256:
                raise TelemetryIntegrityError("first imported segment must begin at genesis for an unknown foreign incarnation")
        else:
            if events[0]["sequence"] > existing_head[0] + 1:
                raise TelemetryIntegrityError("foreign segment has a sequence gap")
            if events[0]["sequence"] == existing_head[0] + 1 and events[0]["previous_hash"] != existing_head[1]:
                raise TelemetryForkError("foreign segment diverges from stored head")

        imported = duplicates = 0
        with self.conn:
            for ev in events:
                by_id = self.conn.execute("SELECT event_hash FROM telemetry_events WHERE event_id=?", (ev["event_id"],)).fetchone()
                if by_id is not None:
                    if by_id["event_hash"] != ev["event_hash"]:
                        raise TelemetryForkError("event_id collision with different hash")
                    duplicates += 1
                    continue
                by_seq = self.conn.execute(
                    "SELECT event_hash FROM telemetry_events WHERE instance_id=? AND incarnation_id=? AND sequence=?",
                    (source_instance, source_incarnation, ev["sequence"]),
                ).fetchone()
                if by_seq is not None:
                    if by_seq["event_hash"] != ev["event_hash"]:
                        raise TelemetryForkError("sequence collision with different hash")
                    duplicates += 1
                    continue
                self.conn.execute(
                    "INSERT INTO telemetry_events("
                    "event_id,source_kind,instance_id,incarnation_id,sequence,thread_id,turn_id,role,occurred_at,"
                    "privacy_class,content_included,content,content_sha256,previous_hash,event_hash,provenance_json,"
                    "imported_segment_id,foreign_auth_status,foreign_signer_kid,inserted_at"
                    ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        ev["event_id"], "FOREIGN", ev["instance_id"], ev["incarnation_id"], ev["sequence"],
                        ev["thread_id"], ev["turn_id"], ev["role"], ev["occurred_at"], ev["privacy_class"],
                        int(ev["content_included"]), ev["content"], ev["content_sha256"], ev["previous_hash"],
                        ev["event_hash"], canonical_json(ev["provenance"]), segment_id, auth_status, signer_kid, _utc_now(),
                    ),
                )
                imported += 1
            self.conn.execute(
                "INSERT INTO telemetry_imports("
                "segment_id,source_instance_id,source_incarnation_id,start_sequence,end_sequence,head_hash,imported_at,status,auth_status,signer_kid"
                ") VALUES (?,?,?,?,?,?,?,?,?,?)",
                (segment_id, source_instance, source_incarnation, events[0]["sequence"], events[-1]["sequence"], events[-1]["event_hash"], _utc_now(), "VERIFIED_IMPORTED", auth_status, signer_kid),
            )
        status = "AUTHENTICATED_IMPORTED" if auth_status == "AUTHENTICATED_INSTANCE" else "INTEGRITY_ONLY_IMPORTED"
        return ImportResult(segment_id, status, imported, duplicates, source_instance, source_incarnation, events[-1]["sequence"], events[-1]["event_hash"])

    def sync_relay(
        self,
        *,
        relay_id: str,
        instance_id: str,
        incarnation_id: str,
        relay_dir: str | os.PathLike[str],
        max_events: int = 100,
        private_key_path: str | os.PathLike[str] | None = None,
        signer_kid: str | None = None,
        trust_store: Mapping[str, Any] | str | os.PathLike[str] | None = None,
        allow_untrusted: bool = False,
    ) -> dict[str, Any]:
        relay = Path(relay_dir).expanduser()
        relay.mkdir(parents=True, exist_ok=True)
        exported = self.export_segment(
            relay_id=relay_id, instance_id=instance_id, incarnation_id=incarnation_id,
            out_dir=relay, max_events=max_events,
            private_key_path=private_key_path, signer_kid=signer_kid,
        )
        imports = []
        for segment in sorted(relay.glob("telemetry-*.jsonl")):
            try:
                result = self.import_segment(
                    segment, local_instance_id=instance_id, trust_store=trust_store,
                    allow_untrusted=allow_untrusted,
                )
                imports.append(result.__dict__)
            except TelemetryForkError:
                raise
            except TelemetryIntegrityError as exc:
                imports.append({"path": str(segment), "status": "REJECTED", "error": str(exc)})
        return {"exported": None if exported is None else str(exported), "imports": imports}

    def snapshot(self, destination: str | os.PathLike[str]) -> Path:
        dest = Path(destination).expanduser()
        dest.parent.mkdir(parents=True, exist_ok=True)
        target = sqlite3.connect(dest)
        try:
            self.conn.backup(target)
        finally:
            target.close()
        return dest
