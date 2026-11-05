#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { replayLeases } from "../core/leases.js";
import { authorizeRegisteredAction } from "../core/action_broker.js";
import { verifyEvidenceChain } from "../core/evidence_log.js";

function die(message, code = 2) { console.error(message); process.exit(code); }

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const key = arg.slice(2);
    if (i + 1 >= argv.length) die(`missing value for --${key}`);
    out[key] = argv[++i];
  }
  return out;
}

function explicit(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function stringList(value, name) {
  if (!Array.isArray(value) || value.some((x) => typeof x !== "string" || x.length === 0)) {
    throw new TypeError(`${name} must be a list of non-empty strings`);
  }
  return [...new Set(value)];
}

function exactRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("request must be an object");
  const allowed = new Set(["adapter_id", "subject", "request_id", "input", "evidence_ids", "decision_event_id"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new TypeError(`unexpected request field: ${key}`);
  const input = value.input;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("input must be an object");
  return Object.freeze({
    adapter_id: explicit(value.adapter_id, "adapter_id"),
    subject: explicit(value.subject, "subject"),
    request_id: explicit(value.request_id, "request_id"),
    input: Object.freeze({ ...input }),
    evidence_ids: Object.freeze(stringList(value.evidence_ids ?? [], "evidence_ids")),
    decision_event_id: explicit(value.decision_event_id, "decision_event_id"),
  });
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); } catch { throw new Error(`invalid JSONL ${file}:${i + 1}`); }
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
    if (err.code === "EEXIST") throw new Error(`gateway lock already held: ${lockPath}`);
    throw err;
  }
  return () => {
    try { fs.closeSync(fd); }
    finally { try { fs.unlinkSync(lockPath); } catch {} }
  };
}

function resultEnvelope(result) {
  return {
    ok: true,
    enforcement: result.enforcement,
    authorization_state: result.enforcement === "ALLOW" ? "AUTHORIZED" : "NOT_AUTHORIZED",
    adapter_id: result.adapter_id,
    target: result.request.target,
    decision: result.decision.payload,
    action_result: result.action_result ?? null,
    receipt_hash: result.evidence_entry.entry_hash,
  };
}

const a = parseArgs(process.argv.slice(2));
if (a._[0] !== "serve") {
  die("usage: action_gateway.js serve --socket FILE --lease-ledger FILE --receipt-log FILE");
}
for (const key of ["socket", "lease-ledger", "receipt-log"]) if (!a[key]) die(`--${key} is required`);

const socketPath = path.resolve(a.socket);
if (socketPath !== a.socket) die("--socket must be an absolute path");
if (fs.existsSync(socketPath)) die(`gateway socket path already exists: ${socketPath}`);
fs.mkdirSync(path.dirname(socketPath), { recursive: true });

const leaseLedger = path.resolve(a["lease-ledger"]);
const receiptLog = path.resolve(a["receipt-log"]);
const releaseLock = acquireLock(`${leaseLedger}.gateway.lock`);
let queue = Promise.resolve();
let shuttingDown = false;

async function handle(raw) {
  const request = exactRequest(raw);
  const state = await replayLeases(readJsonl(leaseLedger));
  const evidenceEntries = readJsonl(receiptLog);
  verifyEvidenceChain(evidenceEntries);
  const result = await authorizeRegisteredAction({
    state,
    adapterId: request.adapter_id,
    subject: request.subject,
    requestId: request.request_id,
    input: request.input,
    evidenceIds: request.evidence_ids,
    decisionEventId: request.decision_event_id,
    previousEvidenceEntry: evidenceEntries.at(-1) ?? null,
    appendDecision: async (event) => appendJsonl(leaseLedger, event),
    appendEvidenceEntry: async (entry) => appendJsonl(receiptLog, entry),
  });
  return resultEnvelope(result);
}

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  let buffer = "";
  let handled = false;

  const reply = (value) => {
    if (socket.destroyed) return;
    socket.end(JSON.stringify(value) + "\n");
  };

  socket.on("data", (chunk) => {
    if (handled) return;
    buffer += chunk;
    if (buffer.length > 1024 * 1024) {
      handled = true;
      reply({ ok: false, enforcement: "ERROR", error: "request exceeded limit" });
      return;
    }
    const newline = buffer.indexOf("\n");
    if (newline < 0) return;
    handled = true;
    let request;
    try { request = JSON.parse(buffer.slice(0, newline)); }
    catch {
      reply({ ok: false, enforcement: "ERROR", error: "invalid request JSON" });
      return;
    }
    const run = queue.then(() => handle(request));
    queue = run.catch(() => {});
    run.then(reply, (err) => reply({ ok: false, enforcement: "ERROR", error: String(err?.message || err) }));
  });
});

function cleanup() {
  try { fs.unlinkSync(socketPath); } catch {}
  releaseLock();
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(() => { cleanup(); process.exit(0); });
  setTimeout(() => { cleanup(); process.exit(1); }, 2000).unref();
}

server.on("error", (err) => {
  cleanup();
  die(String(err?.message || err), 4);
});
server.listen(socketPath, () => {
  fs.chmodSync(socketPath, 0o600);
  console.log(JSON.stringify({ status: "READY", socket: socketPath }));
});
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
