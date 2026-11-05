import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePolicyCandidate, evaluatePolicyException } from "../core/policy_artifacts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtureSet = JSON.parse(await readFile(path.join(root, "contracts/v1.3/fixtures.json"), "utf8"));
const f = new Map(fixtureSet.fixtures.map((x) => [x.id, x]));
const now = new Date("2026-11-05T00:00:00Z");
function candidate(overrides={}) { return {
  content_digest:"sha256:child", parent_policy_digest:"sha256:parent", policy_trust_epoch_id:"pte-1",
  effective_from:"2026-11-04T00:00:00Z", effective_until_or_null:"2026-11-06T00:00:00Z", ...overrides,
}; }

test("POL-01 authorized signed child policy with direct lineage activates", () => {
  const exp=f.get("POL-01").expected;
  const r=evaluatePolicyCandidate({candidate:candidate(),trustedHeadDigest:"sha256:parent",trustedEpochId:"pte-1",signatureValid:true,approvalAuthorized:true,witnessBound:true,now});
  assert.equal(r.policy_state,exp.policy_state); assert.equal(r.decision,exp.decision);
});

test("POL-02 unsigned/unauthorized mutation holds", () => {
  const exp=f.get("POL-02").expected;
  const r=evaluatePolicyCandidate({candidate:candidate(),trustedHeadDigest:"sha256:parent",trustedEpochId:"pte-1",signatureValid:false,approvalAuthorized:false,witnessBound:true,now});
  assert.equal(r.policy_state,exp.policy_state); assert.equal(r.decision,exp.decision);
});

test("POL-03 rollback behind trusted head is rejected", () => {
  const exp=f.get("POL-03").expected;
  const r=evaluatePolicyCandidate({candidate:candidate({content_digest:"sha256:old",parent_policy_digest:"sha256:older"}),trustedHeadDigest:"sha256:new",trustedEpochId:"pte-1",signatureValid:true,approvalAuthorized:true,witnessBound:true,historicalDigests:["sha256:old","sha256:older"],now});
  assert.equal(r.policy_state,exp.policy_state); assert.equal(r.reason,exp.reason); assert.equal(r.decision,exp.decision);
});

test("POL-04 non-waivable control cannot be excepted", () => {
  const exp=f.get("POL-04").expected;
  const r=evaluatePolicyException({targetControl:f.get("POL-04").input.exception.target_control,approvalAuthorized:true,now});
  assert.equal(r.decision,exp.decision); assert.equal(r.control_remains_required,exp.control_remains_required);
});

test("POL-05 unauthorized exception approval is rejected", () => {
  const exp=f.get("POL-05").expected;
  const r=evaluatePolicyException({targetControl:f.get("POL-05").input.exception.target_control,approvalAuthorized:false,now});
  assert.equal(r.decision,exp.decision);
});
