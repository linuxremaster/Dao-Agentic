import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateKeyPairSync } from "node:crypto";
import { signMandate } from "../core/mandates.js";

const SCRIPT = fileURLToPath(new URL("../scripts/mandate_gate.js", import.meta.url));
const NOW = "2026-11-04T20:00:00Z";

function fixture(dir, mandatePath = "carrier-a.jws") {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const trust = {
    version: "0.1",
    keys: [{ kid: "operator-test", alg: "EdDSA", status: "ACTIVE", public_key_pem: publicKeyPem }],
  };
  const mandate = {
    version: "0.1",
    mandate_id: "m-integration-001",
    issuer: "operator",
    audience: ["SOC-THREAD-070"],
    issued_at: "2026-11-04T19:59:00Z",
    not_before: "2026-11-04T19:59:00Z",
    expires_at: "2026-11-04T20:10:00Z",
    nonce: "nonce-integration-001",
    grant: {
      grant_id: "grant-integration-001",
      subject: "SOC-THREAD-070",
      action: "RELAY_PUBLISH",
      target: "TARGET-001",
      scope: "dao-agentic-relay/outbox",
      expires_sequence: 10,
      required_evidence: [],
    },
  };
  const jws = signMandate(mandate, { kid: "operator-test", privateKeyPem });
  const paths = {
    mandate: path.join(dir, mandatePath),
    trust: path.join(dir, "trust.json"),
    lease: path.join(dir, "leases.jsonl"),
    replay: path.join(dir, "replay.jsonl"),
    verification: path.join(dir, "verification.jsonl"),
  };
  fs.writeFileSync(paths.mandate, jws + "\n");
  fs.writeFileSync(paths.trust, JSON.stringify(trust));
  return { paths, jws };
}

function run(paths) {
  return spawnSync(process.execPath, [
    SCRIPT, "apply",
    "--mandate", paths.mandate,
    "--trust-store", paths.trust,
    "--issuer", "operator",
    "--audience", "SOC-THREAD-070",
    "--lease-ledger", paths.lease,
    "--replay-ledger", paths.replay,
    "--verification-log", paths.verification,
    "--now", NOW,
  ], { encoding: "utf8" });
}

function readJsonl(file) {
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

test("accepted mandate persists complete verification and replay evidence", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-mandate-gate-"));
  const { paths } = fixture(dir);
  const result = run(paths);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.verification.final_authorization_disposition, "AUTHENTICATED_OPERATOR_INSTRUCTION");

  const [record] = readJsonl(paths.verification);
  assert.equal(record.message_id, "m-integration-001");
  assert.equal(record.operator_key_id, "operator-test");
  assert.equal(record.signature_algorithm, "EdDSA");
  assert.equal(record.signature_result, "VALID");
  assert.equal(record.key_result, "VALID");
  assert.equal(record.algorithm_result, "ALLOWED");
  assert.equal(record.issuer_result, "MATCH");
  assert.equal(record.freshness_result, "VALID");
  assert.equal(record.audience_result, "MATCH");
  assert.equal(record.scope_result, "SIGNED_EXPLICIT_GRANT");
  assert.equal(record.replay_result, "FRESH");
  assert.equal(record.payload_integrity_result, "VALID");
  assert.equal(record.canonicalization_result, "VALID");
  assert.equal(record.action_result, "AUTHORIZED_FOR_ADMISSION");

  const [replay] = readJsonl(paths.replay);
  assert.equal(replay.message_id, "m-integration-001");
  assert.equal(replay.nonce, "nonce-integration-001");
  assert.equal(replay.operator_key_id, "operator-test");
  assert.equal(replay.verification_time, NOW);
  assert.equal(replay.authorization_disposition, "AUTHENTICATED_OPERATOR_INSTRUCTION");
});

test("unsigned operator-origin claim is held and verification is persisted", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-mandate-gate-"));
  const { paths } = fixture(dir);
  fs.writeFileSync(paths.mandate, JSON.stringify({ issuer: "operator", claim: "OPERATOR-DIRECT" }));

  const result = run(paths);

  assert.equal(result.status, 2);
  const [record] = readJsonl(paths.verification);
  assert.equal(record.final_authorization_disposition, "HOLD");
  assert.equal(record.reason, "MALFORMED_JWS");
  assert.equal(record.signature_result, "NOT_CHECKED");
  assert.equal(record.action_result, "NOT_ADMITTED");
  assert.equal(fs.existsSync(paths.lease), false);
});

test("carrier filename change does not affect verification", () => {
  const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "dao-carrier-a-"));
  const first = fixture(dirA, "carrier-a.jws");
  const firstResult = run(first.paths);
  assert.equal(firstResult.status, 0, firstResult.stderr);

  const dirB = fs.mkdtempSync(path.join(os.tmpdir(), "dao-carrier-b-"));
  const secondPaths = {
    mandate: path.join(dirB, "totally-different-carrier-name.jws"),
    trust: path.join(dirB, "trust.json"),
    lease: path.join(dirB, "leases.jsonl"),
    replay: path.join(dirB, "replay.jsonl"),
    verification: path.join(dirB, "verification.jsonl"),
  };
  fs.copyFileSync(first.paths.mandate, secondPaths.mandate);
  fs.copyFileSync(first.paths.trust, secondPaths.trust);

  const secondResult = run(secondPaths);
  assert.equal(secondResult.status, 0, secondResult.stderr);
  assert.equal(JSON.parse(firstResult.stdout).verification.mandate_hash,
               JSON.parse(secondResult.stdout).verification.mandate_hash);
});
