#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { replayLeases } from "../core/leases.js";
import { authorizeAndExecute } from "../core/action_broker.js";
import { verifyEvidenceChain } from "../core/evidence_log.js";

function die(message, code = 2) { console.error(message); process.exit(code); }

function parseArgs(argv) {
  const out = { _: [], evidence: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const key = arg.slice(2);
    if (i + 1 >= argv.length) die(`missing value for --${key}`);
    const value = argv[++i];
    if (key === "evidence") out.evidence.push(value);
    else out[key] = value;
  }
  return out;
}

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
  catch (err) {
    if (err.code === "EEXIST") die(`ledger lock already held: ${lockPath}`);
    throw err;
  }
  return () => {
    try { fs.closeSync(fd); }
    finally { try { fs.unlinkSync(lockPath); } catch {} }
  };
}

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

const a = parseArgs(process.argv.slice(2));
if (a._[0] !== "publish") {
  die("usage: authorized_relay_publish.js publish --lease-ledger FILE --receipt-log FILE --source FILE --message-id ID --subject ID --event-id ID --request-id ID [--evidence ID] (DAO_RELAY_OUTBOX must be set by deployment)");
}
for (const key of ["lease-ledger", "receipt-log", "source", "message-id", "subject", "event-id", "request-id"]) {
  if (!a[key]) die(`--${key} is required`);
}

const outbox = process.env.DAO_RELAY_OUTBOX;
if (!outbox || !path.isAbsolute(outbox)) die("DAO_RELAY_OUTBOX must be an absolute deployment-controlled path");

const source = fs.readFileSync(a.source);
const digest = sha256(source);
const sourceText = source.toString("utf8");
const declaredMessage = sourceText.split(/\r?\n/).find((line) => line.startsWith("message_id:"));
if (!declaredMessage || declaredMessage.slice("message_id:".length).trim() !== a["message-id"]) {
  die("source message_id does not match --message-id");
}

const target = `${a["message-id"]}@sha256:${digest}`;
const scope = "dao-agentic-relay/outbox";
const request = {
  request_id: a["request-id"],
  subject: a.subject,
  action: "RELAY_PUBLISH",
  target,
  scope,
  evidence_ids: [...new Set([...a.evidence, `content-sha256:${digest}`])],
};

const lockPath = `${a["lease-ledger"]}.lock`;
const release = acquireLock(lockPath);
try {
  const leaseRecords = readJsonl(a["lease-ledger"]);
  const state = await replayLeases(leaseRecords);
  const evidenceEntries = readJsonl(a["receipt-log"]);
  verifyEvidenceChain(evidenceEntries);
  const previousEvidenceEntry = evidenceEntries.at(-1) ?? null;

  const result = await authorizeAndExecute({
    state,
    request,
    decisionEventId: a["event-id"],
    executorId: "authorized-relay-publish/0.1",
    previousEvidenceEntry,
    appendDecision: async (event) => appendJsonl(a["lease-ledger"], event),
    appendEvidenceEntry: async (entry) => appendJsonl(a["receipt-log"], entry),
    execute: async () => {
      fs.mkdirSync(outbox, { recursive: true });
      const destination = path.join(outbox, path.basename(a.source));
      fs.copyFileSync(a.source, destination, fs.constants.COPYFILE_EXCL);
      const written = fs.readFileSync(destination);
      const writtenHash = sha256(written);
      if (writtenHash !== digest) {
        try { fs.unlinkSync(destination); } catch {}
        throw new Error("published bytes failed integrity verification");
      }
      return {
        status: "PUBLISHED",
        message_id: a["message-id"],
        target,
        destination: path.basename(destination),
        sha256: digest,
        bytes: written.length,
      };
    },
  });

  console.log(JSON.stringify({
    enforcement: result.enforcement,
    authorization_state: result.enforcement === "ALLOW" ? "AUTHORIZED" : "NOT_AUTHORIZED",
    target,
    decision: result.decision.payload,
    action_result: result.action_result ?? null,
    receipt_hash: result.evidence_entry.entry_hash,
  }));
  if (result.enforcement !== "ALLOW") process.exitCode = 3;
} catch (err) {
  console.error(JSON.stringify({ enforcement: "ERROR", error: String(err?.message || err) }));
  process.exitCode = 4;
} finally {
  release();
}
