#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { replayLeases } from "../core/leases.js";
import { authorizeRegisteredAction } from "../core/action_broker.js";
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

const a = parseArgs(process.argv.slice(2));
if (a._[0] !== "merge") {
  die("usage: authorized_github_merge.js merge --lease-ledger FILE --receipt-log FILE --pr-number N --expected-head-sha SHA --subject ID --event-id ID --request-id ID [--evidence ID] (deployment must set DAO_GITHUB_REPOSITORY and DAO_GITHUB_TOKEN)");
}
for (const key of ["lease-ledger", "receipt-log", "pr-number", "expected-head-sha", "subject", "event-id", "request-id"]) {
  if (!a[key]) die(`--${key} is required`);
}

const lockPath = `${a["lease-ledger"]}.lock`;
const release = acquireLock(lockPath);
try {
  const state = await replayLeases(readJsonl(a["lease-ledger"]));
  const evidenceEntries = readJsonl(a["receipt-log"]);
  verifyEvidenceChain(evidenceEntries);

  const result = await authorizeRegisteredAction({
    state,
    adapterId: "github-merge-v1",
    subject: a.subject,
    requestId: a["request-id"],
    input: {
      pr_number: a["pr-number"],
      expected_head_sha: a["expected-head-sha"],
    },
    evidenceIds: a.evidence,
    decisionEventId: a["event-id"],
    previousEvidenceEntry: evidenceEntries.at(-1) ?? null,
    appendDecision: async (event) => appendJsonl(a["lease-ledger"], event),
    appendEvidenceEntry: async (entry) => appendJsonl(a["receipt-log"], entry),
  });

  console.log(JSON.stringify({
    enforcement: result.enforcement,
    authorization_state: result.enforcement === "ALLOW" ? "AUTHORIZED" : "NOT_AUTHORIZED",
    adapter_id: result.adapter_id,
    target: result.request.target,
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
