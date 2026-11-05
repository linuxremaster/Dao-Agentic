import test from "node:test";
import assert from "node:assert/strict";
import { activeLeases, activeRoles, decideAuthority, hasActiveLease, initialLeaseState, LeaseError, makeDecisionEvent, makeLeaseRotationEvents, reduceLease, replayLeases } from "../core/leases.js";

const ev = (sequence, kind, payload, event_id = `e${sequence}`) => ({ event_id, sequence, kind, payload });
const role = (sequence = 1, expires = 10) => ev(sequence, "ROLE_LEASE_GRANTED", {
  lease_id: "role-1", subject: "agent-a", role: "AUDITOR", scope: "repo-x", expires_sequence: expires,
});
const lease = (sequence = 1, expires = 10, overrides = {}) => ev(sequence, "LEASE_GRANTED", {
  lease_id: "lease-1", subject: "agent-a", lease_class: "TASK", resource: "task-17", scope: "repo-x",
  purpose: "perform-assigned-task", expires_sequence: expires, ...overrides,
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

test("universal ROLE lease is visible but never grants authority", async () => {
  const state = await replayLeases([lease(1, 10, { lease_class: "ROLE", resource: "AUDITOR", purpose: "routing" })]);
  assert.deepEqual(activeRoles(state, "agent-a", "repo-x").map((x) => x.role), ["AUDITOR"]);
  assert.equal(hasActiveLease(state, "agent-a", "ROLE", "AUDITOR", "repo-x"), true);
  assert.equal(decideAuthority(state, request()).allowed, false);
});

test("generic task, tool and wake leases expire and release", async () => {
  let state = await replayLeases([
    lease(1, 8, { lease_id: "task-lease", lease_class: "TASK", resource: "task-17" }),
    lease(2, 8, { lease_id: "tool-lease", lease_class: "TOOL_ACCESS", resource: "github-read", purpose: "inspect-repository" }),
    lease(3, 8, { lease_id: "wake-lease", lease_class: "WAKE_RIGHT", resource: "scheduled-wake", purpose: "periodic-check" }),
  ]);
  assert.equal(hasActiveLease(state, "agent-a", "TASK", "task-17", "repo-x", 7), true);
  assert.equal(hasActiveLease(state, "agent-a", "TOOL_ACCESS", "github-read", "repo-x", 7), true);
  assert.equal(activeLeases(state, "agent-a", "WAKE_RIGHT", "repo-x", null, 7).length, 1);
  assert.equal(hasActiveLease(state, "agent-a", "TASK", "task-17", "repo-x", 8), false);
  state = await reduceLease(state, ev(4, "LEASE_RELEASED", { lease_id: "tool-lease" }));
  assert.equal(hasActiveLease(state, "agent-a", "TOOL_ACCESS", "github-read", "repo-x", 7), false);
});

test("generic capability lease never satisfies authority", async () => {
  const state = await replayLeases([lease(1, 10, { lease_class: "CAPABILITY", resource: "MERGE", purpose: "candidate-capability" })]);
  assert.equal(hasActiveLease(state, "agent-a", "CAPABILITY", "MERGE", "repo-x"), true);
  assert.equal(decideAuthority(state, request()).allowed, false);
});

test("rotation releases old before new and preserves lease meaning", async () => {
  const first = lease(1, 20, { lease_class: "TASK", resource: "task-17", purpose: "audit" });
  const state = await replayLeases([first]);
  const [release, replacement] = makeLeaseRotationEvents(state, "lease-1", {
    releaseEventId: "rotate-release", grantEventId: "rotate-grant", newLeaseId: "lease-2",
    newSubject: "agent-b", expiresSequence: 30,
  });
  assert.deepEqual([release.sequence, replacement.sequence], [2, 3]);
  assert.equal(replacement.payload.lease_class, "TASK");
  assert.equal(replacement.payload.resource, "task-17");
  assert.equal(replacement.payload.scope, "repo-x");
  const rotated = await replayLeases([first, release, replacement]);
  assert.equal(hasActiveLease(rotated, "agent-a", "TASK", "task-17", "repo-x", 4), false);
  assert.equal(hasActiveLease(rotated, "agent-b", "TASK", "task-17", "repo-x", 4), true);
});

test("legacy role rotates without authority inheritance", async () => {
  const first = role(1, 20);
  const state = await replayLeases([first]);
  const [release, replacement] = makeLeaseRotationEvents(state, "role-1", {
    releaseEventId: "role-release", grantEventId: "role-grant", newLeaseId: "role-2",
    newSubject: "agent-b", expiresSequence: 30,
  });
  const rotated = await replayLeases([first, release, replacement]);
  assert.deepEqual(activeRoles(rotated, "agent-a", "repo-x", 4), []);
  assert.deepEqual(activeRoles(rotated, "agent-b", "repo-x", 4).map((x) => x.role), ["AUDITOR"]);
  assert.equal(decideAuthority(rotated, request({ subject: "agent-b" })).allowed, false);
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
  for (const field of ["subject", "lease_class", "resource", "scope", "purpose"]) {
    const bad = lease(); bad.payload[field] = "*";
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
