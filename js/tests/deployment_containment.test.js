import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifyEvidenceChain } from "../core/evidence_log.js";

const PUBLISH = fileURLToPath(new URL("../scripts/authorized_relay_publish.js", import.meta.url));
const GUARD = fileURLToPath(new URL("../scripts/deployment_guard.js", import.meta.url));
const EVIDENCE = fileURLToPath(new URL("../scripts/evidence_log.js", import.meta.url));

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

function writeLedger(file, target) {
  fs.writeFileSync(file, JSON.stringify({
    event_id: "grant-1",
    sequence: 1,
    kind: "AUTHORITY_GRANTED",
    payload: {
      grant_id: "grant-1",
      subject: "SOC-THREAD-070",
      action: "RELAY_PUBLISH",
      target,
      scope: "dao-agentic-relay/outbox",
      expires_sequence: 10,
      required_evidence: [],
    },
  }) + "\n");
}

function publish(dir, targetOverride = null) {
  const source = path.join(dir, "message.md");
  const ledger = path.join(dir, "leases.jsonl");
  const receipts = path.join(dir, "receipts.jsonl");
  const outbox = path.join(dir, "outbox");
  const messageId = "MSG-001";
  const body = Buffer.from(`message_id: ${messageId}\nkind: TEST\nbody: exact bytes\n`, "utf8");
  fs.writeFileSync(source, body);
  const target = `${messageId}@sha256:${sha256(body)}`;
  writeLedger(ledger, targetOverride ?? target);

  const result = spawnSync(process.execPath, [
    PUBLISH, "publish",
    "--lease-ledger", ledger,
    "--receipt-log", receipts,
    "--source", source,
    "--message-id", messageId,
    "--subject", "SOC-THREAD-070",
    "--event-id", "decision-1",
    "--request-id", "request-1",
  ], { encoding: "utf8", env: { ...process.env, DAO_RELAY_OUTBOX: outbox } });

  return { result, source, ledger, receipts, outbox, target, messageId };
}

test("authorized relay publish binds exact content and persists tamper-evident result", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-publish-"));
  const fx = publish(dir);

  assert.equal(fx.result.status, 0, fx.result.stderr);
  const output = JSON.parse(fx.result.stdout);
  assert.equal(output.enforcement, "ALLOW");
  assert.equal(output.authorization_state, "AUTHORIZED");
  assert.equal(output.target, fx.target);
  assert.equal(output.action_result.status, "PUBLISHED");

  const destination = path.join(fx.outbox, path.basename(fx.source));
  assert.deepEqual(fs.readFileSync(destination), fs.readFileSync(fx.source));

  const receipts = fs.readFileSync(fx.receipts, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  const verified = verifyEvidenceChain(receipts);
  assert.equal(verified.ok, true);
  assert.equal(receipts.length, 2);
  assert.equal(receipts[0].record.phase, "AUTHORIZED_PENDING");
  assert.equal(receipts[1].record.phase, "COMPLETED");
  assert.equal(receipts[1].record.result.status, "SUCCESS");

  const verifyCli = spawnSync(process.execPath, [EVIDENCE, "verify", fx.receipts], { encoding: "utf8" });
  assert.equal(verifyCli.status, 0, verifyCli.stderr);
  assert.equal(JSON.parse(verifyCli.stdout).last_hash, verified.last_hash);
});

test("policy denial produces receipt and performs no publish side effect", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-deny-"));
  const fx = publish(dir, "MSG-001@sha256:" + "0".repeat(64));

  assert.equal(fx.result.status, 3, fx.result.stderr);
  const output = JSON.parse(fx.result.stdout);
  assert.equal(output.enforcement, "DENY");
  assert.equal(output.authorization_state, "NOT_AUTHORIZED");
  assert.equal(fs.existsSync(path.join(fx.outbox, path.basename(fx.source))), false);

  const receipts = fs.readFileSync(fx.receipts, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].record.phase, "DENIED");
  assert.equal(verifyEvidenceChain(receipts).ok, true);
});

test("tampered prior action receipt blocks later execution", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-tamper-"));
  const fx = publish(dir);
  assert.equal(fx.result.status, 0, fx.result.stderr);

  const receipts = fs.readFileSync(fx.receipts, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  receipts[0].record.target = "tampered";
  fs.writeFileSync(fx.receipts, receipts.map(JSON.stringify).join("\n") + "\n");

  const secondSource = path.join(dir, "message-2.md");
  fs.writeFileSync(secondSource, "message_id: MSG-002\nbody: second\n");
  const result = spawnSync(process.execPath, [
    PUBLISH, "publish",
    "--lease-ledger", fx.ledger,
    "--receipt-log", fx.receipts,
    "--source", secondSource,
    "--message-id", "MSG-002",
    "--subject", "SOC-THREAD-070",
    "--event-id", "decision-2",
    "--request-id", "request-2",
  ], { encoding: "utf8", env: { ...process.env, DAO_RELAY_OUTBOX: fx.outbox } });

  assert.equal(result.status, 4);
  assert.match(result.stderr, /hash mismatch/);
  assert.equal(fs.existsSync(path.join(fx.outbox, "message-2.md")), false);
});

test("deployment guard holds when operator private key is inside runtime tree", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-guard-"));
  const state = path.join(dir, "state");
  fs.mkdirSync(state, { mode: 0o755 });
  const trust = path.join(dir, "trust.json");
  fs.writeFileSync(trust, "{}");
  fs.chmodSync(trust, 0o644);
  fs.writeFileSync(path.join(dir, "operator-private.pem"), "not-read-by-guard");

  const held = spawnSync(process.execPath, [
    GUARD, "check", "--repo-root", dir, "--state-dir", state, "--trust-store", trust,
  ], { encoding: "utf8" });
  assert.equal(held.status, 3);
  const heldOutput = JSON.parse(held.stdout);
  assert.equal(heldOutput.disposition, "HOLD");
  assert.equal(heldOutput.findings[0].code, "PRIVATE_KEY_INSIDE_RUNTIME_TREE");

  fs.unlinkSync(path.join(dir, "operator-private.pem"));
  const pass = spawnSync(process.execPath, [
    GUARD, "check", "--repo-root", dir, "--state-dir", state, "--trust-store", trust,
  ], { encoding: "utf8" });
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).disposition, "PASS_WITH_DEPLOYMENT_BOUNDARY");
});
