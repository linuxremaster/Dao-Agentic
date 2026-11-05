import test from "node:test";
import assert from "node:assert/strict";
import { authorizeRegisteredAction, reconcileRegisteredAction } from "../core/action_broker.js";
import { replayLeases } from "../core/leases.js";
import { planUnknownOutcome, ActionOutcomeUnknownError } from "../core/action_transactions.js";
import { verifyEvidenceChain } from "../core/evidence_log.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA = "95b903ad9f7f734d946bf718c73b00c2795b4544";
const EVIDENCE = "fixture:v13:action";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtureSet = JSON.parse(await readFile(path.join(root, "contracts/v1.3/fixtures.json"), "utf8"));
const fixtureById = new Map(fixtureSet.fixtures.map((f) => [f.id, f]));
function expected(id) {
  const fixture = fixtureById.get(id);
  assert.ok(fixture, `missing v1.3 fixture ${id}`);
  return fixture.expected;
}

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}
function grant(target = `PR-23@${SHA}`) {
  return { event_id: "grant-event", sequence: 1, kind: "AUTHORITY_GRANTED", payload: {
    grant_id: "grant-1", subject: "SOC-THREAD-070", action: "MERGE", target,
    scope: "linuxremaster/Dao-Agentic", expires_sequence: 20, required_evidence: [EVIDENCE],
  } };
}
async function withGithubEnvironment(fn) {
  const saved = {
    repo: process.env.DAO_GITHUB_REPOSITORY, token: process.env.DAO_GITHUB_TOKEN,
    method: process.env.DAO_GITHUB_MERGE_METHOD, base: process.env.DAO_GITHUB_API_BASE,
    allow: process.env.DAO_ALLOW_TEST_PROVIDER_ENDPOINT, fetch: globalThis.fetch,
  };
  process.env.DAO_GITHUB_REPOSITORY = "linuxremaster/Dao-Agentic";
  process.env.DAO_GITHUB_TOKEN = "test-token";
  process.env.DAO_GITHUB_MERGE_METHOD = "merge";
  delete process.env.DAO_GITHUB_API_BASE;
  delete process.env.DAO_ALLOW_TEST_PROVIDER_ENDPOINT;
  try { return await fn(); }
  finally {
    for (const [k, v] of [["DAO_GITHUB_REPOSITORY", saved.repo], ["DAO_GITHUB_TOKEN", saved.token],
      ["DAO_GITHUB_MERGE_METHOD", saved.method], ["DAO_GITHUB_API_BASE", saved.base],
      ["DAO_ALLOW_TEST_PROVIDER_ENDPOINT", saved.allow]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    globalThis.fetch = saved.fetch;
  }
}
async function broker({ state, appendEvidenceEntry, input = { pr_number: 23, expected_head_sha: SHA }, actionId = "action-1" }) {
  return authorizeRegisteredAction({ state, adapterId: "github-merge-v1", subject: "SOC-THREAD-070",
    requestId: "request-1", actionId, idempotencyKey: "idem-1", input, evidenceIds: [EVIDENCE],
    decisionEventId: "decision-1", appendDecision: async () => {}, appendEvidenceEntry,
    previousEvidenceEntry: null, now: () => new Date("2026-11-05T00:00:00Z") });
}

test("ACT-01: side effect cannot begin if ACTION_INTENT persistence fails", async () => {
  await withGithubEnvironment(async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls += 1; throw new Error("provider must not be called"); };
    const state = await replayLeases([grant()]);
    await assert.rejects(() => broker({ state, appendEvidenceEntry: async () => { throw new Error("intent persistence failed"); } }), /intent persistence failed/);
    assert.equal(calls, expected("ACT-01").adapter_invoked ? 1 : 0);
  });
});

test("ACT-02: provider success plus completion persistence failure becomes ACTION_OUTCOME_UNKNOWN", async () => {
  await withGithubEnvironment(async () => {
    let effects = 0;
    globalThis.fetch = async (url, options = {}) => {
      if ((options.method || "GET") === "GET") return response({ state: "open", head: { sha: SHA }, base: { repo: { full_name: "linuxremaster/Dao-Agentic" } } });
      effects += 1;
      return response({ merged: true, sha: "a".repeat(40), message: "merged" });
    };
    const state = await replayLeases([grant()]);
    let appendCalls = 0;
    const receipts = [];
    await assert.rejects(() => broker({ state, appendEvidenceEntry: async (entry) => {
      appendCalls += 1;
      if (appendCalls === 2) throw new Error("completion persistence failed");
      receipts.push(entry);
    } }), (err) => {
      assert.ok(err instanceof ActionOutcomeUnknownError);
      assert.equal(err.action_state, expected("ACT-02").action_state);
      assert.equal(err.automatic_retry, expected("ACT-02").automatic_retry);
      return true;
    });
    assert.ok(effects <= expected("ACT-04").max_provider_effect_count);
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].record.transaction_state, "ACTION_INTENT_PERSISTED");
  });
});

test("ACT-03: queryable reconciliation confirms prior effect without re-execution", async () => {
  await withGithubEnvironment(async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return response({ state: "closed", merged: true, merge_commit_sha: "b".repeat(40), head: { sha: SHA }, base: { repo: { full_name: "linuxremaster/Dao-Agentic" } } });
    };
    const result = await reconcileRegisteredAction({ adapterId: "github-merge-v1",
      input: { pr_number: 23, expected_head_sha: SHA }, evidenceIds: [EVIDENCE],
      actionId: "action-3", idempotencyKey: "idem-3" });
    assert.equal(result.reconciliation.status, "EFFECT_PRESENT");
    assert.equal(result.plan.decision, "CONFIRM_SUCCESS");
    assert.equal(result.plan.execution_attempts_added, expected("ACT-03").execution_attempts_added);
    assert.equal(calls, 1);
  });
});

test("ACT-04: idempotent retry reuses the original key", () => {
  const plan = planUnknownOutcome({ executionContract: ["IDEMPOTENT"], idempotencyKey: "idem-123", reconciliation: "INCONCLUSIVE" });
  assert.equal(plan.decision, "RETRY");
  assert.equal(plan.retry_idempotency_key, expected("ACT-04").retry_idempotency_key);
  const seen = new Set(); let effects = 0;
  const provider = (key) => { if (!seen.has(key)) { seen.add(key); effects += 1; } };
  provider("idem-123"); provider(plan.retry_idempotency_key);
  assert.equal(effects, 1);
});

test("ACT-05: NON_RETRYABLE unknown outcome holds", () => {
  const plan = planUnknownOutcome({ executionContract: ["NON_RETRYABLE"], idempotencyKey: "idem-5", reconciliation: "INCONCLUSIVE" });
  assert.equal(plan.decision, expected("ACT-05").decision);
  assert.equal(plan.execution_attempts_added, 0);
});

test("regression: preflight head change is confirmed no-effect", async () => {
  await withGithubEnvironment(async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls += 1; return response({ state: "open", head: { sha: "b".repeat(40) }, base: { repo: { full_name: "linuxremaster/Dao-Agentic" } } }); };
    const state = await replayLeases([grant()]); const receipts = [];
    await assert.rejects(() => broker({ state, appendEvidenceEntry: async (entry) => receipts.push(entry) }), (err) => {
      assert.equal(err.name, "AuthorizedActionError"); assert.equal(err.action_state, "FAILED_CONFIRMED_NO_EFFECT"); return true;
    });
    assert.equal(calls, 1);
    assert.equal(receipts.at(-1).record.transaction_state, "FAILED_CONFIRMED_NO_EFFECT");
    assert.equal(verifyEvidenceChain(receipts).ok, true);
  });
});

test("regression: normal success keeps a valid two-entry evidence chain", async () => {
  await withGithubEnvironment(async () => {
    globalThis.fetch = async (url, options = {}) => (options.method || "GET") === "GET"
      ? response({ state: "open", head: { sha: SHA }, base: { repo: { full_name: "linuxremaster/Dao-Agentic" } } })
      : response({ merged: true, sha: "c".repeat(40), message: "merged" });
    const state = await replayLeases([grant()]); const receipts = [];
    const result = await broker({ state, appendEvidenceEntry: async (entry) => receipts.push(entry) });
    assert.equal(result.enforcement, "ALLOW");
    assert.deepEqual(receipts.map((x) => x.record.transaction_state), ["ACTION_INTENT_PERSISTED", "SUCCEEDED"]);
    assert.equal(verifyEvidenceChain(receipts).ok, true);
  });
});
