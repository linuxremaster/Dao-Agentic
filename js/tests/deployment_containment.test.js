import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const GUARD = fileURLToPath(new URL("../scripts/deployment_guard.js", import.meta.url));

function baseFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-guard-"));
  const state = path.join(dir, "state");
  fs.mkdirSync(state, { mode: 0o755 });
  const trust = path.join(dir, "trust.json");
  fs.writeFileSync(trust, "{}");
  fs.chmodSync(trust, 0o644);
  return { dir, state, trust };
}

function guard(fx, extra = [], env = process.env) {
  return spawnSync(process.execPath, [
    GUARD, "check",
    "--repo-root", fx.dir,
    "--state-dir", fx.state,
    "--trust-store", fx.trust,
    ...extra,
  ], { encoding: "utf8", env });
}

test("deployment guard holds when operator private key is inside runtime tree", () => {
  const fx = baseFixture();
  fs.writeFileSync(path.join(fx.dir, "operator-private.pem"), "not-read-by-guard");

  const held = guard(fx);
  assert.equal(held.status, 3);
  const heldOutput = JSON.parse(held.stdout);
  assert.equal(heldOutput.disposition, "HOLD");
  assert.equal(heldOutput.findings[0].code, "PRIVATE_KEY_INSIDE_RUNTIME_TREE");

  fs.unlinkSync(path.join(fx.dir, "operator-private.pem"));
  const pass = guard(fx);
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).disposition, "PASS_WITH_DEPLOYMENT_BOUNDARY");
});

test("agent runtime holds when a known mutation capability is exposed", () => {
  const fx = baseFixture();
  const env = { ...process.env, DAO_GITHUB_TOKEN: "must-not-be-here" };
  const held = guard(fx, ["--runtime-role", "agent"], env);

  assert.equal(held.status, 3);
  const output = JSON.parse(held.stdout);
  assert.equal(output.disposition, "HOLD");
  assert.equal(output.runtime_role, "agent");
  assert.ok(output.findings.some((x) => x.code === "MUTATION_CAPABILITY_EXPOSED_TO_AGENT" && x.environment_variable === "DAO_GITHUB_TOKEN"));
});

test("agent runtime supports deployment-specific forbidden credentials and writable paths", () => {
  const fx = baseFixture();
  const protectedPath = path.join(fx.dir, "protected-output");
  fs.mkdirSync(protectedPath, { mode: 0o700 });
  const env = { ...process.env, CUSTOM_MUTATION_TOKEN: "secret" };
  delete env.DAO_GITHUB_TOKEN;
  delete env.DAO_RELAY_OUTBOX;

  const held = guard(fx, [
    "--runtime-role", "agent",
    "--forbidden-env", "CUSTOM_MUTATION_TOKEN",
    "--forbidden-write-path", protectedPath,
  ], env);
  assert.equal(held.status, 3);
  const output = JSON.parse(held.stdout);
  assert.ok(output.findings.some((x) => x.code === "MUTATION_CAPABILITY_EXPOSED_TO_AGENT" && x.environment_variable === "CUSTOM_MUTATION_TOKEN"));
  assert.ok(output.findings.some((x) => x.code === "MUTATION_PATH_WRITABLE_BY_AGENT" && x.path === protectedPath));
});
