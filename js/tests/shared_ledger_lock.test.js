import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MANDATE = fileURLToPath(new URL("../scripts/mandate_gate.js", import.meta.url));
const POLICY = fileURLToPath(new URL("../scripts/policy_gate.js", import.meta.url));

test("mandate and policy gates share the same default lease-ledger lock", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-lock-"));
  const ledger = path.join(dir, "leases.jsonl");
  const lock = `${ledger}.lock`;
  fs.writeFileSync(lock, "held");

  const policy = spawnSync(process.execPath, [
    POLICY, "decide",
    "--lease-ledger", ledger,
    "--event-id", "e1",
    "--request-id", "r1",
    "--subject", "s",
    "--action", "a",
    "--target", "t",
    "--scope", "x",
  ], { encoding: "utf8" });
  assert.equal(policy.status, 2);
  assert.match(policy.stderr, /policy lock already held/);

  const mandate = spawnSync(process.execPath, [
    MANDATE, "apply",
    "--mandate", path.join(dir, "m.jws"),
    "--trust-store", path.join(dir, "trust.json"),
    "--issuer", "operator",
    "--audience", "SOC-THREAD-070",
    "--lease-ledger", ledger,
    "--replay-ledger", path.join(dir, "replay.jsonl"),
    "--verification-log", path.join(dir, "verify.jsonl"),
  ], { encoding: "utf8" });
  assert.equal(mandate.status, 2);
  assert.match(mandate.stderr, /gate lock already held/);
});
