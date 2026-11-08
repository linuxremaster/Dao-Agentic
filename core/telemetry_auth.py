from __future__ import annotations

import base64
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Mapping


class TelemetryAuthError(RuntimeError):
    pass


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(text: str) -> bytes:
    if not isinstance(text, str) or not text or any(c not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" for c in text):
        raise TelemetryAuthError("signature must be unpadded base64url")
    pad = "=" * ((4 - len(text) % 4) % 4)
    try:
        return base64.urlsafe_b64decode(text + pad)
    except Exception as exc:
        raise TelemetryAuthError("invalid base64url signature") from exc


def signature_statement(*, header: Mapping[str, Any], segment_id: str, signer_kid: str) -> bytes:
    statement = {
        "context": "SOCRATES-TELEMETRY-SEGMENT-1",
        "format_version": header["format_version"],
        "relay_id": header["relay_id"],
        "source_instance_id": header["source_instance_id"],
        "source_incarnation_id": header["source_incarnation_id"],
        "start_sequence": header["start_sequence"],
        "end_sequence": header["end_sequence"],
        "event_count": header["event_count"],
        "head_hash": header["head_hash"],
        "segment_id": segment_id,
        "signer_kid": signer_kid,
    }
    return _canonical_json(statement).encode("utf-8")


def _openssl(args: list[str], *, input_bytes: bytes | None = None) -> subprocess.CompletedProcess[bytes]:
    try:
        proc = subprocess.run(
            ["openssl", *args],
            input=input_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    except FileNotFoundError as exc:
        raise TelemetryAuthError("openssl executable is required for Ed25519 telemetry identity") from exc
    return proc


def sign_ed25519(data: bytes, private_key_path: str | os.PathLike[str]) -> str:
    key = Path(private_key_path).expanduser()
    if not key.is_file():
        raise TelemetryAuthError(f"telemetry private key not found: {key}")
    with tempfile.TemporaryDirectory(prefix="socrates-telemetry-sign-") as tmp:
        message = Path(tmp) / "message.bin"
        signature = Path(tmp) / "signature.bin"
        message.write_bytes(data)
        proc = _openssl([
            "pkeyutl", "-sign", "-rawin", "-inkey", str(key),
            "-in", str(message), "-out", str(signature),
        ])
        if proc.returncode != 0:
            raise TelemetryAuthError("Ed25519 signing failed: " + proc.stderr.decode("utf-8", "replace").strip())
        return _b64url_encode(signature.read_bytes())


def verify_ed25519(data: bytes, signature_b64: str, public_key_pem: str) -> bool:
    sig = _b64url_decode(signature_b64)
    if not isinstance(public_key_pem, str) or "BEGIN PUBLIC KEY" not in public_key_pem:
        raise TelemetryAuthError("telemetry public key must be PEM SubjectPublicKeyInfo")
    with tempfile.TemporaryDirectory(prefix="socrates-telemetry-verify-") as tmp:
        root = Path(tmp)
        pub = root / "public.pem"
        sigfile = root / "signature.bin"
        message = root / "message.bin"
        pub.write_text(public_key_pem, encoding="utf-8")
        sigfile.write_bytes(sig)
        message.write_bytes(data)
        proc = _openssl([
            "pkeyutl", "-verify", "-rawin", "-pubin", "-inkey", str(pub),
            "-in", str(message), "-sigfile", str(sigfile),
        ])
        return proc.returncode == 0


def load_trust_store(value: Mapping[str, Any] | str | os.PathLike[str]) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value
    path = Path(value).expanduser()
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise TelemetryAuthError(f"invalid telemetry trust store: {path}") from exc
    if not isinstance(parsed, dict):
        raise TelemetryAuthError("telemetry trust store must be a JSON object")
    return parsed


def trusted_public_key(trust_store: Mapping[str, Any] | str | os.PathLike[str], *, instance_id: str, kid: str) -> str:
    store = load_trust_store(trust_store)
    if store.get("version") != "1.3" or not isinstance(store.get("keys"), list):
        raise TelemetryAuthError("telemetry trust store must have version 1.3 and keys[]")
    matches = [
        item for item in store["keys"]
        if isinstance(item, dict) and item.get("instance_id") == instance_id and item.get("kid") == kid
    ]
    if len(matches) != 1:
        raise TelemetryAuthError("telemetry signer key not found or ambiguous")
    key = matches[0]
    if key.get("alg") != "Ed25519":
        raise TelemetryAuthError("telemetry signer algorithm is not Ed25519")
    if key.get("status") != "ACTIVE":
        raise TelemetryAuthError("telemetry signer key is not active")
    pem = key.get("public_key_pem")
    if not isinstance(pem, str) or not pem.strip():
        raise TelemetryAuthError("telemetry signer public key is missing")
    return pem


def create_identity(*, private_key_path: str | os.PathLike[str], public_key_path: str | os.PathLike[str], instance_id: str, kid: str) -> dict[str, Any]:
    private_path = Path(private_key_path).expanduser()
    public_path = Path(public_key_path).expanduser()
    if private_path.exists() or public_path.exists():
        raise TelemetryAuthError("refusing to overwrite existing telemetry identity key")
    private_path.parent.mkdir(parents=True, exist_ok=True)
    public_path.parent.mkdir(parents=True, exist_ok=True)
    proc = _openssl(["genpkey", "-algorithm", "Ed25519", "-out", str(private_path)])
    if proc.returncode != 0:
        raise TelemetryAuthError("Ed25519 key generation failed: " + proc.stderr.decode("utf-8", "replace").strip())
    try:
        os.chmod(private_path, 0o600)
    except OSError:
        pass
    proc = _openssl(["pkey", "-in", str(private_path), "-pubout", "-out", str(public_path)])
    if proc.returncode != 0:
        try:
            private_path.unlink()
        except OSError:
            pass
        raise TelemetryAuthError("Ed25519 public-key export failed: " + proc.stderr.decode("utf-8", "replace").strip())
    return {
        "instance_id": instance_id,
        "kid": kid,
        "alg": "Ed25519",
        "status": "ACTIVE",
        "public_key_pem": public_path.read_text(encoding="utf-8"),
    }
