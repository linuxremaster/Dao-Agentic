import test from "node:test";
import assert from "node:assert/strict";
import { authorizeRegisteredAction } from "../core/action_broker.js";
import { replayLeases } from "../core/leases.js";
import { verifyEvidenceChain } from "../core/evidence_log.js";
import { getTrustedAdapter, listTrustedAdapters } from "../adapters/registry.js";

const SHA = "95b903ad9f7f734d946bf718c73b00c2795b4544";
const EVIDENCE = "github-actions:conformance:41920459657:success";

function grant(target = `PR-23@${SHA}`) {
  return {
    event_id: "grant-event",
    sequence: 1,
    kind: "AUTHORITY_GRANTED",
    payload: {
      grant_id: "grant-1",
      subject: "SOC-THREAD-070",
      action: "MERGE",
      target,
      scope: "linuxremaster/Dao-Agentic",
      expires_sequence: 10,
      required_evidence: [EVIDENCE],
    },
  };
}

async function withGithubEnvironment(fn) {
  const saved = {
    repo: process.env.DAO_GITHUB_REPOSITORY,
    token: process.env.DAO_GITHUB_TOKEN,
    method: process.env.DAO_GITHUB_MERGE_METHOD,
    base: process.env.DAO_GITHUB_API_BASE,
    allow: process.env.DAO_ALLOW_TEST_PROVIDER_ENDPOINT,
    fetch: globalThis.fetch,
  };
  process.env.DAO_GITHUB_REPOSITORY = "linuxremaster/Dao-Agentic";
  process.env.DAO_GITHUB_TOKEN = "test-token-never-logged";
  process.env.DAO_GITHUB_MERGE_METHOD = "merge";
  delete process.env.DAO_GITHUB_API_BASE;
  delete process.env.DAO_ALLOW_TEST_PROVIDER_ENDPOINT;
  try { return await fn(); }
  finally {
    for (const [key, value] of [["DAO_GITHUB_REPOSITORY", saved.repo], ["DAO_GITHUB_TOKEN", saved.token],
      ["DAO_GITHUB_MERGE_METHOD", saved.method], ["DAO_GITHUB_API_BASE", saved.base],
      ["DAO_ALLOW_TEST_PROVIDER_ENDPOINT", saved.allow]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    globalThis.fetch = saved.fetch;
  }
}

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

async function runBroker(state, { expectedHead = SHA } = {}) {
  const decisions = [];
  const receipts = [];
  const result = await authorizeRegisteredAction({
    state,
    adapterId: "github-merge-v1",
    subject: "SOC-THREAD-070",
    requestId: "request-1",
    input: { pr_number: 23, expected_head_sha: expectedHead },
    evidenceIds: [EVIDENCE],
    decisionEventId: "decision-1",
    appendDecision: async (event) => decisions.push(event),
    appendEvidenceEntry: async (entry) => receipts.push(entry),
    previousEvidenceEntry: null,
    now: () => new Date("2026-11-04T22:00:00Z"),
  });
  return { result, decisions, receipts };
}

test("trusted adapter registry rejects arbitrary adapter ids", () => {
  assert.deepEqual(listTrustedAdapters(), ["github-merge-v1", "relay-publish-v1"]);
  assert.equal(getTrustedAdapter("github-merge-v1").action, "MERGE");
  assert.throws(() => getTrustedAdapter("shell-command-v1"), /unregistered action adapter/);
});

test("policy denial performs zero GitHub provider calls", async () => {
  await withGithubEnvironment(async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls += 1; throw new Error("provider must not be called"); };
    const state = await replayLeases([grant("PR-999@" + SHA)]);
    const { result, receipts } = await runBroker(state);

    assert.equal(result.enforcement, "DENY");
    assert.equal(calls, 0);
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].record.phase, "DENIED");
    assert.equal(verifyEvidenceChain(receipts).ok, true);
  });
});

test("authorized GitHub merge checks exact head, merges pinned SHA, and records result", async () => {
  await withGithubEnvironment(async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if ((options.method || "GET") === "GET") {
        return response({
          state: "open",
          head: { sha: SHA },
          base: { repo: { full_name: "linuxremaster/Dao-Agentic" } },
        });
      }
      assert.equal(options.method, "PUT");
      assert.deepEqual(JSON.parse(options.body), { sha: SHA, merge_method: "merge" });
      return response({ merged: true, sha: "a".repeat(40), message: "Pull Request successfully merged" });
    };

    const state = await replayLeases([grant()]);
    const { result, decisions, receipts } = await runBroker(state);

    assert.equal(result.enforcement, "ALLOW");
    assert.equal(result.adapter_id, "github-merge-v1");
    assert.equal(result.request.action, "MERGE");
    assert.equal(result.request.target, `PR-23@${SHA}`);
    assert.equal(result.request.scope, "linuxremaster/Dao-Agentic");
    assert.equal(result.action_result.status, "MERGED");
    assert.equal(result.action_result.provider_merge_sha, "a".repeat(40));
    assert.equal(decisions.length, 1);
    assert.equal(receipts.length, 2);
    assert.equal(receipts[0].record.phase, "AUTHORIZED_PENDING");
    assert.equal(receipts[1].record.phase, "COMPLETED");
    assert.equal(receipts[1].record.result.status, "SUCCESS");
    assert.equal(verifyEvidenceChain(receipts).ok, true);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/repos\/linuxremaster\/Dao-Agentic\/pulls\/23$/);
    assert.match(calls[1].url, /\/repos\/linuxremaster\/Dao-Agentic\/pulls\/23\/merge$/);
    assert.doesNotMatch(JSON.stringify(receipts), /test-token-never-logged/);
  });
});

test("provider-side head change fails closed after authorization and records error", async () => {
  await withGithubEnvironment(async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return response({
        state: "open",
        head: { sha: "b".repeat(40) },
        base: { repo: { full_name: "linuxremaster/Dao-Agentic" } },
      });
    };

    const state = await replayLeases([grant()]);
    const decisions = [];
    const receipts = [];
    await assert.rejects(() => authorizeRegisteredAction({
      state,
      adapterId: "github-merge-v1",
      subject: "SOC-THREAD-070",
      requestId: "request-1",
      input: { pr_number: 23, expected_head_sha: SHA },
      evidenceIds: [EVIDENCE],
      decisionEventId: "decision-1",
      appendDecision: async (event) => decisions.push(event),
      appendEvidenceEntry: async (entry) => receipts.push(entry),
      previousEvidenceEntry: null,
      now: () => new Date("2026-11-04T22:00:00Z"),
    }), /pull request head changed before merge/);

    assert.equal(calls, 1);
    assert.equal(decisions[0].payload.allowed, true);
    assert.equal(receipts.length, 2);
    assert.equal(receipts[0].record.phase, "AUTHORIZED_PENDING");
    assert.equal(receipts[1].record.phase, "COMPLETED");
    assert.equal(receipts[1].record.result.status, "ERROR");
    assert.equal(verifyEvidenceChain(receipts).ok, true);
  });
});
