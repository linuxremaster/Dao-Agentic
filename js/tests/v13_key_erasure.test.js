import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateErasure, evaluateRestore } from "../core/key_erasure.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtures = JSON.parse(await readFile(path.join(root, "contracts/v1.3/fixtures.json"), "utf8")).fixtures;
const fixture = (id) => fixtures.find((x) => x.id === id);

test("ERA-01: any recoverable authorized path keeps erasure incomplete", () => {
  const f = fixture("ERA-01");
  const r = evaluateErasure({ paths: f.input.paths });
  assert.equal(r.overall_erasure_state, f.expected.overall_erasure_state);
  assert.deepEqual([...r.recoverable_path_ids], ["backup-wrapper"]);
});

test("ERA-02: all known authorized paths closed permits bounded verified erasure", () => {
  const f = fixture("ERA-02");
  const r = evaluateErasure({ paths: f.input.paths, unresolvedPaths: f.input.unresolved_paths });
  assert.equal(r.overall_erasure_state, f.expected.overall_erasure_state);
  assert.equal(r.claim_scope, "POLICY_KNOWN_AUTHORIZED_RECOVERY_PATHS");
});

test("ERA-03: tombstone is applied before restored key wrappers become usable", () => {
  const f = fixture("ERA-03");
  const r = evaluateRestore({
    backupContainsOldWrapper: f.input.backup_contains_old_wrapper,
    authoritativeTombstone: f.input.authoritative_tombstone,
    restoreOrder: f.input.restore_order,
  });
  assert.equal(r.restored_key_recoverable, f.expected.restored_key_recoverable);
});

test("ERA-04: prior compromise limits the erasure claim", () => {
  const f = fixture("ERA-04");
  const r = evaluateErasure({
    paths: [{ id: "all-authorized", recoverable: !f.input.all_authorized_paths_closed }],
    priorPlaintextOrKeyCompromise: f.input.prior_plaintext_or_key_compromise,
  });
  assert.equal(r.overall_erasure_state, f.expected.overall_erasure_state);
});

test("unresolved recovery paths prevent verified erasure", () => {
  const r = evaluateErasure({ paths: [{ id: "live", recoverable: false }], unresolvedPaths: 1 });
  assert.equal(r.overall_erasure_state, "ERASURE_INCOMPLETE");
});

test("restore order that exposes objects before tombstone fails closed", () => {
  const r = evaluateRestore({ backupContainsOldWrapper: true, authoritativeTombstone: true, restoreOrder: ["objects", "tombstone"] });
  assert.equal(r.restored_key_recoverable, true);
  assert.equal(r.restore_state, "KEY_RESURRECTION_RISK");
});
