#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { authorityGrantEvent, verifyMandate } from "../core/mandates.js";
import { reduceLease, replayLeases } from "../core/leases.js";

function die(message, code = 2) { console.error(message); process.exit(code); }
function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const k = a.slice(2); if (i + 1 >= argv.length) die(`missing value for --${k}`);
    out[k] = argv[++i];
  }
  return out;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); } catch { die(`invalid JSONL ${file}:${i + 1}`); }
  });
}
function appendJsonl(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, "a", 0o600);
  try { fs.writeSync(fd, JSON.stringify(value) + "\n"); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
}
function acquireLock(lockPath) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let fd;
  try { fd = fs.openSync(lockPath, "wx", 0o600); }
  catch (err) { if (err.code === "EEXIST") die(`gate lock already held: ${lockPath}`); throw err; }
  return () => { try { fs.closeSync(fd); } finally { try { fs.unlinkSync(lockPath); } catch {} } };
}
function replayState(records) {
  return {
    mandateIds: new Set(records.map((x) => x.mandate_id).filter(Boolean)),
    nonces: new Set(records.map((x) => x.nonce).filter(Boolean)),
  };
}
function mandateHash(jws) { return createHash("sha256").update(jws, "utf8").digest("hex"); }

const a = args(process.argv.slice(2));
const command = a._[0];
if (command !== "apply") die("usage: mandate_gate.js apply --mandate FILE --trust-store FILE --issuer ID --audience ID --lease-ledger FILE --replay-ledger FILE --verification-log FILE [--now ISO] [--lock FILE]");
for (const k of ["mandate", "trust-store", "issuer", "audience", "lease-ledger", "replay-ledger", "verification-log"]) if (!a[k]) die(`--${k} is required`);
const lockPath = a.lock || `${a["lease-ledger"]}.mandate.lock`;
const release = acquireLock(lockPath);
try {
  const jws = fs.readFileSync(a.mandate, "utf8").trim();
  const trustStore = readJson(a["trust-store"]);
  const replays = readJsonl(a["replay-ledger"]);
  const leaseEvents = readJsonl(a["lease-ledger"]);
  const state = await replayLeases(leaseEvents);
  const now = a.now ? new Date(a.now) : new Date();
  const verification = verifyMandate(jws, {
    trustStore,
    expectedIssuer: a.issuer,
    expectedAudience: a.audience,
    now,
    replayState: replayState(replays),
  });
  const hash = mandateHash(jws);
  const checks = verification.checks || {};
  const mandate = verification.mandate || null;
  const baseRecord = {
    record_version: "0.1",
    message_id: mandate?.mandate_id ?? verification.mandate_id ?? null,
    mandate_id: mandate?.mandate_id ?? verification.mandate_id ?? null,
    payload_hash: hash,
    mandate_hash: hash,
    operator_key_id: verification.kid ?? null,
    signature_algorithm: checks.algorithm_result === "ALLOWED" ? "EdDSA" : null,
    verifier_version: "dao-mandate-gate/0.2",
    verification_timestamp: now.toISOString(),
    verified_at: now.toISOString(),
    expected_issuer: a.issuer,
    expected_audience: a.audience,
    signature_result: checks.signature_result ?? "NOT_CHECKED",
    key_result: checks.key_result ?? "NOT_CHECKED",
    algorithm_result: checks.algorithm_result ?? "NOT_CHECKED",
    issuer_result: checks.issuer_result ?? "NOT_CHECKED",
    freshness_result: checks.freshness_result ?? "NOT_CHECKED",
    audience_result: checks.audience_result ?? "NOT_CHECKED",
    scope_result: checks.scope_result ?? "NOT_CHECKED",
    replay_result: checks.replay_result ?? "NOT_CHECKED",
    payload_integrity_result: checks.payload_integrity_result ?? "NOT_CHECKED",
    canonicalization_result: checks.canonicalization_result ?? "NOT_CHECKED",
    final_authorization_disposition: verification.disposition,
    disposition: verification.disposition,
    reason: verification.reason,
    action_attempted: mandate ? {
      kind: "AUTHORITY_GRANT_ADMISSION",
      subject: mandate.grant.subject,
      action: mandate.grant.action,
      target: mandate.grant.target,
      scope: mandate.grant.scope,
    } : { kind: "AUTHORITY_GRANT_ADMISSION" },
    action_result: verification.ok ? "AUTHORIZED_FOR_ADMISSION" : "NOT_ADMITTED",
  };
  if (!verification.ok) {
    appendJsonl(a["verification-log"], baseRecord);
    console.log(JSON.stringify({ verification: baseRecord }));
    process.exitCode = 2;
  } else {
    const event = authorityGrantEvent(verification, state.lastSequence + 1);
    await reduceLease(state, event);
    appendJsonl(a["verification-log"], baseRecord);
    appendJsonl(a["replay-ledger"], {
      message_id: mandate.mandate_id,
      mandate_id: mandate.mandate_id,
      nonce: mandate.nonce,
      operator_key_id: verification.kid,
      verification_time: now.toISOString(),
      authorization_disposition: verification.disposition,
      mandate_hash: hash,
      consumed_at: now.toISOString(),
      event_id: event.event_id,
    });
    appendJsonl(a["lease-ledger"], event);
    console.log(JSON.stringify({ verification: baseRecord, authority_event: event }));
  }
} finally { release(); }
