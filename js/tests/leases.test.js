import test from "node:test";
import assert from "node:assert/strict";
import { activeRoles, decideAuthority, initialLeaseState, LeaseError, makeDecisionEvent, reduceLease, replayLeases } from "../core/leases.js";

const ev = (sequence, kind, payload, event_id = `e${sequence}`) => ({ event_id, sequence, kind, payload });
const role = (sequence = 1, expires = 10) => ev(sequence, "ROLE_LEASE_GRANTED", {
  lease_id: "role-1", subject: "agent-a", role: "AUDITOR", scope: "repo-x", expires_sequence: expires,
});
const grant = (sequence = 1, expires = 10, evidence = []) => ev(sequence, "AUTHORITY_GRANTED", {
  grant_id: "grant-1", subject: "agent-a", action: "MERGE", target: "sha-123", scope: "repo-x",
  expires_sequence: expires, required_evidence: evidence,
});
const request = (overrides = {}) => ({
  request_id: "req-1", subject: "agent-a", action: "MERGE", target: "sha-123", scope: "repo-x", evidence_ids: [], ...overrides,
});

test("role is descriptive and never grants authority", async () => {
  const state = await replayLeases([role()]);
  assert.deepEqual(activeRoles(state, "agent-a", "repo-x").map((x) => x.role), ["AUDITOR"]);
  assert.equal(decideAuthority(state, request()).allowed, false);
});

test("valid exact grant allows; mismatches deny", async () => {
  const state = await replayLeases([grant()]);
  assert.equal(decideAuthority(state, request()).allowed, true);
  for (const [key, value] of [["subject", "other"], ["action", "DELETE"], ["target", "sha-x"], ["scope", "repo-y"]]) {
    assert.equal(decideAuthority(state, request({ [key]: value })).allowed, false);
  }
});

test("evidence, expiry and release are enforced", async () => {
  let state = await replayLeases([grant(1, 5, ["audit-pass"])]);
  assert.equal(decideAuthority(state, request()).allowed, false);
  assert.equal(decideAuthority(state, request({ evidence_ids: ["audit-pass"] })).allowed, true);
  state = await reduceLease(state, ev(2, "AUTHORITY_RELEASED", { grant_id: "grant-1" }));
  assert.equal(decideAuthority(state, request({ evidence_ids: ["audit-pass"] })).allowed, false);
  await assert.rejects(() => replayLeases([grant(1, 1)]), LeaseError);
});

test("authority-shaped fields and wildcards are rejected", async () => {
  const state = await replayLeases([grant()]);
  for (const key of ["role", "title", "claimed_authority", "authorized_by"]) {
    assert.throws(() => decideAuthority(state, { ...request(), [key]: "ROOT" }), LeaseError);
  }
  for (const field of ["subject", "action", "target", "scope"]) {
    const bad = grant(); bad.payload[field] = "*";
    await assert.rejects(() => replayLeases([bad]), LeaseError);
  }
});

test("forged decision is rejected; generated decision is accepted", async () => {
  await assert.rejects(() => reduceLease(initialLeaseState(), ev(1, "AUTHORITY_DECIDED", {
    ...request(), allowed: true, reason: "VALID_SCOPED_GRANT", grant_id: "fake",
  })), LeaseError);
  const state = await replayLeases([grant()]);
  const decision = makeDecisionEvent(state, request(), "decision-1");
  const next = await reduceLease(state, decision);
  assert.equal(next.decisions.at(-1).allowed, true);
  assert.equal(next.decisions.at(-1).grant_id, "grant-1");
});

test("role expiry and release work", async () => {
  let state = await replayLeases([role(1, 4)]);
  assert.equal(activeRoles(state, "agent-a", "repo-x", 3).length, 1);
  assert.equal(activeRoles(state, "agent-a", "repo-x", 4).length, 0);
  state = await reduceLease(state, ev(2, "ROLE_LEASE_RELEASED", { lease_id: "role-1" }));
  assert.equal(activeRoles(state, "agent-a", "repo-x", 3).length, 0);
});
