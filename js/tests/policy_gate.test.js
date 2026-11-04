import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/policy_gate.js", import.meta.url));

function grant() {
  return {
    event_id: "grant-event",
    sequence: 1,
    kind: "AUTHORITY_GRANTED",
    payload: {
      grant_id: "grant-1",
      subject: "agent-a",
      action: "MERGE",
      target: "sha-123",
      scope: "repo-x",
      expires_sequence: 10,
      required_evidence: ["audit-pass"],
    },
  };
}

function runGate(ledger, overrides = {}) {
  const args = {
    "event-id": "decision-1",
    "request-id": "request-1",
    subject: "agent-a",
    action: "MERGE",
    target: "sha-123",
    scope: "repo-x",
    ...overrides,
  };
  const argv = [SCRIPT, "decide", "--lease-ledger", ledger];
  for (const [key, value] of Object.entries(args)) argv.push(`--${key}`, value);
  if (overrides.evidence === undefined) argv.push("--evidence", "audit-pass");
  return spawnSync(process.execPath, argv, { encoding: "utf8" });
}

test("policy gate allows only an exact live grant and records decision", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-policy-"));
  const ledger = path.join(dir, "leases.jsonl");
  fs.writeFileSync(ledger, JSON.stringify(grant()) + "\n");

  const result = runGate(ledger);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.enforcement, "ALLOW");
  assert.equal(output.decision.grant_id, "grant-1");
  const records = fs.readFileSync(ledger, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(records.at(-1).kind, "AUTHORITY_DECIDED");
  assert.equal(records.at(-1).payload.allowed, true);
});

test("policy gate fails closed with exit 3 when scope does not match", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-policy-"));
  const ledger = path.join(dir, "leases.jsonl");
  fs.writeFileSync(ledger, JSON.stringify(grant()) + "\n");

  const result = runGate(ledger, { scope: "repo-y" });

  assert.equal(result.status, 3, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.enforcement, "DENY");
  assert.equal(output.decision.allowed, false);
  assert.equal(output.decision.reason, "NO_VALID_GRANT");
});
