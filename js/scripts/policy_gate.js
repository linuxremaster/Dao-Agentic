#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { makeDecisionEvent, reduceLease, replayLeases } from "../core/leases.js";

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
  try {
    fs.writeSync(fd, JSON.stringify(value) + "\n");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function acquireLock(lockPath) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let fd;
  try { fd = fs.openSync(lockPath, "wx", 0o600); }
  catch (err) {
    if (err.code === "EEXIST") die(`policy lock already held: ${lockPath}`);
    throw err;
  }
  return () => {
    try { fs.closeSync(fd); }
    finally { try { fs.unlinkSync(lockPath); } catch {} }
  };
}

const a = parseArgs(process.argv.slice(2));
if (a._[0] !== "decide") {
  die("usage: policy_gate.js decide --lease-ledger FILE --event-id ID --request-id ID --subject ID --action ID --target ID --scope ID [--evidence ID] [--lock FILE]");
}
for (const key of ["lease-ledger", "event-id", "request-id", "subject", "action", "target", "scope"]) {
  if (!a[key]) die(`--${key} is required`);
}

const lockPath = a.lock || `${a["lease-ledger"]}.policy.lock`;
const release = acquireLock(lockPath);
try {
  const records = readJsonl(a["lease-ledger"]);
  const state = await replayLeases(records);
  const request = {
    request_id: a["request-id"],
    subject: a.subject,
    action: a.action,
    target: a.target,
    scope: a.scope,
    evidence_ids: a.evidence,
  };
  const event = makeDecisionEvent(state, request, a["event-id"]);
  await reduceLease(state, event);
  appendJsonl(a["lease-ledger"], event);

  const enforcement = event.payload.allowed ? "ALLOW" : "DENY";
  console.log(JSON.stringify({ enforcement, decision: event.payload }));
  if (!event.payload.allowed) process.exitCode = 3;
} finally {
  release();
}
