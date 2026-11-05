# SOCRATES v1.3 Cross-Relay Turn Telemetry

Status: **BOOTSTRAP COMPONENT / NOT CORE CONFORMANT**

Version: authenticated telemetry successor to MVP v0.1.

This component records local turns in SQLite, exports immutable hash-chained JSONL segments, authenticates segment provenance with an Ed25519 instance identity, verifies/imports foreign segments into a read-only namespace, and reconstructs threads across instances.

Load-bearing invariants:

- `TELEMETRY != AUTHORITY`
- `TELEMETRY != TRUTH`
- `SIGNED TELEMETRY != AUTHORIZED INSTRUCTION`
- `SIGNED PROVENANCE != TRUSTED PROVENANCE` until the instance public key is independently bootstrapped;
- `FOREIGN HISTORY != LOCAL CANONICAL HISTORY`;
- local event writers own only their own `(instance_id, incarnation_id)` sequence;
- imported foreign events are never promoted to local authority;
- duplicate imports are idempotent;
- incompatible event/sequence reuse is a fork and fails closed;
- unknown, ambiguous, revoked, or invalid instance keys fail closed;
- the relay is transport only and is never the telemetry identity trust root;
- SQLite WAL is local only; backups use SQLite's Online Backup API;
- `RESTRICTED`/`CONFIDENTIAL` content is not exported by this bootstrap component. A detached encrypted-payload design is required before those classes cross the relay.

## Local database

Default CLI database:

`~/.local/share/dao-agentic/telemetry.db`

The canonical local history is the SQLite event table. Relay segments are immutable projections of LOCAL events only. Foreign imports retain `FOREIGN`, `foreign_auth_status`, and `foreign_signer_kid` fields.

## 1. Create an instance identity

The private key stays local. Do not place it in the relay directory.

```sh
mkdir -p ~/.config/dao-agentic/telemetry

python scripts/telemetry.py identity-init \
  --instance-id termux-a \
  --kid termux-a-2026-01 \
  --private-key ~/.config/dao-agentic/telemetry/instance-private.pem \
  --public-key ~/.config/dao-agentic/telemetry/instance-public.pem
```

The command prints a `trust_entry`. Exchange only the public-key entry through an independently authenticated bootstrap path. The relay itself MUST NOT establish trust merely because a public-key file appears there.

A trust store has this shape:

```json
{
  "version": "1.3",
  "keys": [
    {
      "instance_id": "termux-a",
      "kid": "termux-a-2026-01",
      "alg": "Ed25519",
      "status": "ACTIVE",
      "public_key_pem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
    }
  ]
}
```

Store it somewhere local such as:

`~/.config/dao-agentic/telemetry/trust.json`

## 2. Record one turn

```sh
python scripts/telemetry.py record \
  --instance-id termux-a \
  --incarnation-id boot-20261104 \
  --thread-id SOC-THREAD-070 \
  --turn-id 184 \
  --role user \
  --content 'Continue please'
```

Use `--no-content --content-sha256 <sha256>` to persist only a commitment.

## 3. Signed cross-relay sync

```sh
python scripts/telemetry.py sync \
  --relay-id dao-agentic-relay \
  --instance-id termux-a \
  --incarnation-id boot-20261104 \
  --relay-dir "$HOME/storage/downloads/Dao-Agentic-Relay/telemetry" \
  --private-key "$HOME/.config/dao-agentic/telemetry/instance-private.pem" \
  --signer-kid termux-a-2026-01 \
  --trust-store "$HOME/.config/dao-agentic/telemetry/trust.json"
```

Normal signed sync rejects unsigned foreign segments. `--allow-untrusted` exists only as an explicit migration path for old integrity-only MVP segments; those imports are labeled `INTEGRITY_ONLY`, never authenticated.

## 4. Automatic JSONL turn hook

The hook remains open, reads one JSON object per line from stdin, appends the turn locally, creates a signed relay segment, and imports authenticated foreign segments after each accepted line.

```sh
python scripts/telemetry.py hook \
  --relay-id dao-agentic-relay \
  --instance-id termux-a \
  --incarnation-id boot-20261104 \
  --relay-dir "$HOME/storage/downloads/Dao-Agentic-Relay/telemetry" \
  --private-key "$HOME/.config/dao-agentic/telemetry/instance-private.pem" \
  --signer-kid termux-a-2026-01 \
  --trust-store "$HOME/.config/dao-agentic/telemetry/trust.json"
```

Feed lines such as:

```json
{"thread_id":"SOC-THREAD-070","turn_id":"185","role":"user","content":"Continue please"}
{"thread_id":"SOC-THREAD-070","turn_id":"186","role":"assistant","content":"..."}
```

The hook is the automatic telemetry boundary, but it still requires an external producer to supply turns. The ChatGPT Android application does not expose a native turn stream directly to this Termux process, so this repository cannot scrape or intercept app turns by itself. A relay/client integration can feed the hook without changing its integrity or authority rules.

## 5. Reconstruct a thread

```sh
python scripts/telemetry.py query --thread-id SOC-THREAD-070
```

Each JSON line includes `source_kind` (`LOCAL` or `FOREIGN`). Authenticated foreign turns also include `foreign_auth_status=AUTHENTICATED_INSTANCE` and the exact `foreign_signer_kid`. The query does not merge authority or epistemic state.

## 6. Consistent backup

```sh
python scripts/telemetry.py snapshot "$HOME/storage/downloads/telemetry-snapshot.db"
```

This uses SQLite's backup API rather than copying a live WAL database directly.

## Failure semantics

- unknown signer key -> HOLD;
- revoked signer key -> HOLD;
- invalid Ed25519 signature -> HOLD;
- signed segment without a trust store -> HOLD;
- unsigned segment -> HOLD unless explicit compatibility mode is selected;
- hash/sequence inconsistency -> HOLD / fork error;
- foreign event is always read-only regardless of signature validity;
- signed telemetry never creates action authority.

## Explicitly deferred

This BOOTSTRAP component does **not** yet provide detached encrypted payloads, independent external witness/checkpoint service, Drive changes-feed transport, a native ChatGPT-app turn exporter, claim/evidence decomposition, policy-signed instance trust changes, hardware-backed telemetry keys, or a signed/witnessed `CONFORMANCE_REPORT`.
