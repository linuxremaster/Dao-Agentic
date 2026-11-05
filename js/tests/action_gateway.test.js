import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifyEvidenceChain } from "../core/evidence_log.js";

const GATEWAY = fileURLToPath(new URL("../scripts/action_gateway.js", import.meta.url));
const PUBLISH = fileURLToPath(new URL("../scripts/authorized_relay_publish.js", import.meta.url));

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

function writeLedger(file, target) {
  fs.writeFileSync(file, JSON.stringify({
    event_id: "grant-1",
    sequence: 1,
    kind: "AUTHORITY_GRANTED",
    payload: {
      grant_id: "grant-1",
      subject: "SOC-THREAD-TEST",
      action: "RELAY_PUBLISH",
      target,
      scope: "dao-agentic-relay/outbox",
      expires_sequence: 20,
      required_evidence: [],
    },
  }) + "\n");
}

function fixture(targetOverride = null) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-gateway-"));
  const source = path.join(dir, "message.md");
  const ledger = path.join(dir, "leases.jsonl");
  const receipts = path.join(dir, "receipts.jsonl");
  const outbox = path.join(dir, "outbox");
  const socket = path.join(dir, "gateway.sock");
  const messageId = "MSG-001";
  const body = Buffer.from(`message_id: ${messageId}\nkind: TEST\nbody: exact bytes\n`, "utf8");
  fs.writeFileSync(source, body);
  const target = `${messageId}@sha256:${sha256(body)}`;
  writeLedger(ledger, targetOverride ?? target);
  return { dir, source, ledger, receipts, outbox, socket, messageId, target };
}

function startGateway(fx) {
  const child = spawn(process.execPath, [
    GATEWAY, "serve",
    "--socket", fx.socket,
    "--lease-ledger", fx.ledger,
    "--receipt-log", fx.receipts,
  ], {
    encoding: "utf8",
    env: { ...process.env, DAO_RELAY_OUTBOX: fx.outbox },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return child;
}

async function waitReady(child) {
  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`gateway startup timed out: ${stderr}`)), 5000);
    child.stderr.setEncoding("utf8");
    child.stdout.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      try {
        const record = JSON.parse(stdout.slice(0, newline));
        if (record.status === "READY") {
          clearTimeout(timer);
          resolve(record);
        }
      } catch {}
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`gateway exited before ready (${code}): ${stderr}`));
    });
  });
}

function clientEnv() {
  const env = { ...process.env };
  delete env.DAO_RELAY_OUTBOX;
  delete env.DAO_GITHUB_TOKEN;
  return env;
}

function publish(fx, eventId = "decision-1", requestId = "request-1") {
  return spawnSync(process.execPath, [
    PUBLISH, "publish",
    "--gateway-socket", fx.socket,
    "--source", fx.source,
    "--message-id", fx.messageId,
    "--subject", "SOC-THREAD-TEST",
    "--event-id", eventId,
    "--request-id", requestId,
  ], { encoding: "utf8", env: clientEnv() });
}

async function withGateway(t, fx) {
  const child = startGateway(fx);
  t.after(() => { if (!child.killed) child.kill("SIGTERM"); });
  await waitReady(child);
  return child;
}

test("credential-free client routes relay mutation through gateway", async (t) => {
  const fx = fixture();
  await withGateway(t, fx);
  const result = publish(fx);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.enforcement, "ALLOW");
  assert.equal(output.authorization_state, "AUTHORIZED");
  assert.equal(output.target, fx.target);
  assert.equal(output.action_result.status, "PUBLISHED");
  assert.deepEqual(fs.readFileSync(path.join(fx.outbox, path.basename(fx.source))), fs.readFileSync(fx.source));

  const receipts = fs.readFileSync(fx.receipts, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(receipts.length, 2);
  assert.equal(verifyEvidenceChain(receipts).ok, true);
});

test("gateway denial performs no relay side effect", async (t) => {
  const fx = fixture("MSG-001@sha256:" + "0".repeat(64));
  await withGateway(t, fx);
  const result = publish(fx);

  assert.equal(result.status, 3, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.enforcement, "DENY");
  assert.equal(fs.existsSync(path.join(fx.outbox, path.basename(fx.source))), false);

  const receipts = fs.readFileSync(fx.receipts, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].record.phase, "DENIED");
  assert.equal(verifyEvidenceChain(receipts).ok, true);
});

test("tampered gateway receipt chain blocks a later mutation", async (t) => {
  const fx = fixture();
  await withGateway(t, fx);
  const first = publish(fx);
  assert.equal(first.status, 0, first.stderr);

  const receipts = fs.readFileSync(fx.receipts, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  receipts[0].record.target = "tampered";
  fs.writeFileSync(fx.receipts, receipts.map(JSON.stringify).join("\n") + "\n");

  const second = publish(fx, "decision-2", "request-2");
  assert.equal(second.status, 4);
  assert.match(second.stderr, /hash mismatch/);
});
