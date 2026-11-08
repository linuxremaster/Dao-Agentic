import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { signMandate } from "../core/mandates.js";
import {
  DAO_NATIVE_MANDATE_PROFILE,
  normalizeAuthorizationCandidate,
  verifyAuthorizationCandidate,
  authorizeVerifiedAuthorization,
  effectiveAuthorityGrantEvent,
} from "../core/authorization_interop.js";
import { replayLeases } from "../core/leases.js";
import { authorizeRegisteredAction } from "../core/action_broker.js";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
const trustStore = {
  version: "0.1",
  keys: [{ kid: "operator-2026-01", alg: "EdDSA", status: "ACTIVE", public_key_pem: publicKeyPem }],
};
const NOW = new Date("2026-11-04T20:00:00Z");
const SHA = "95b903ad9f7f734d946bf718c73b00c2795b4544";
const EVIDENCE = "github-actions:conformance:test:success";

function mandate(overrides = {}) {
  const base = {
    version: "0.1",
    mandate_id: "m-authz-001",
    issuer: "operator",
    audience: ["SOC-THREAD-070"],
    issued_at: "2026-11-04T19:59:00Z",
    not_before: "2026-11-04T19:59:00Z",
    expires_at: "2026-11-04T20:10:00Z",
    nonce: "nonce-authz-001",
    grant: {
      grant_id: "grant-authz-001",
      subject: "SOC-THREAD-070",
      action: "MERGE",
      target: `PR-23@${SHA}`,
      scope: "linuxremaster/Dao-Agentic",
      expires_sequence: 10,
      required_evidence: [EVIDENCE],
    },
  };
  return { ...base, ...overrides, grant: { ...base.grant, ...(overrides.grant || {}) } };
}

function signed(m = mandate()) {
  return signMandate(m, { kid: "operator-2026-01", privateKeyPem });
}

function candidate(jws = signed(), source_extensions = []) {
  const n = normalizeAuthorizationCandidate({
    profile_id: DAO_NATIVE_MANDATE_PROFILE,
    profile_version: "0.1",
    artifact: jws,
    source_extensions,
  });
  assert.equal(n.ok, true);
  return n;
}

function verified(n = candidate()) {
  return verifyAuthorizationCandidate(n.candidate, {
    trustStore,
    expectedIssuer: "operator",
    expectedAudience: "SOC-THREAD-070",
    now: NOW,
  });
}

function current(overrides = {}) {
  return {
    audience: "SOC-THREAD-070",
    actingAgent: "SOC-THREAD-070",
    action: "MERGE",
    target: `PR-23@${SHA}`,
    scope: "linuxremaster/Dao-Agentic",
    evidenceIds: [EVIDENCE],
    currentSequence: 1,
    policyDecisions: [{ policy_state: "ACTIVE", decision: "ACCEPT", policy_digest: "sha256:policy-1" }],
    now: NOW,
    delegationDepth: 0,
    ...overrides,
  };
}

test("PARSE/NORMALIZE yields Candidate only and does not confer authority", () => {
  const n = candidate();
  assert.equal(n.candidate.kind, "AuthorizationCandidate");
  assert.equal(n.result.disposition, "CANDIDATE_ONLY");
  assert.equal(n.candidate.unverified_claims.action, "MERGE");
  assert.equal("verified_authorization" in n, false);
  assert.equal("effective_authorization" in n, false);
});

test("VERIFY produces VerifiedAuthorization with reconstructable verification context", () => {
  const v = verified();
  assert.equal(v.ok, true);
  assert.equal(v.verified_authorization.kind, "VerifiedAuthorization");
  assert.equal(v.receipt.receipt_kind, "AuthorizationVerificationReceipt");
  assert.equal(v.verified_authorization.verification_context.profile_id, DAO_NATIVE_MANDATE_PROFILE);
  assert.deepEqual(v.verified_authorization.verification_context.trust_anchor_ids, ["operator-2026-01"]);
  assert.equal(v.verified_authorization.verification_context.verification_checks.signature_result, "VALID");
  assert.match(v.verified_authorization.verification_context.trust_store_digest, /^[0-9a-f]{64}$/);
  assert.equal(v.verified_authorization.source_artifact_digest, v.receipt.source_artifact_digest);
});

test("tampered native artifact normalizes but verification HOLDs", () => {
  const parts = signed().split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  payload.grant.action = "DELETE";
  parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const n = candidate(parts.join("."));
  assert.equal(n.ok, true);
  const v = verifyAuthorizationCandidate(n.candidate, {
    trustStore, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now: NOW,
  });
  assert.equal(v.ok, false);
  assert.equal(v.disposition, "HOLD");
  assert.equal(v.reason, "INVALID_SIGNATURE");
});

test("authority-relevant unknown extension HOLDs; audit-only extension is preserved but inert", () => {
  const authorityExt = candidate(signed(), [{
    namespace: "urn:example:authority",
    version: "1",
    authorization_relevant: true,
    claim: { broaden_scope: true },
  }]);
  const held = verifyAuthorizationCandidate(authorityExt.candidate, {
    trustStore, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now: NOW,
  });
  assert.equal(held.ok, false);
  assert.equal(held.reason, "UNKNOWN_AUTHORIZATION_SEMANTICS");

  const auditExt = candidate(signed(), [{
    namespace: "urn:example:audit",
    version: "1",
    authorization_relevant: false,
    claim: { carrier: "test" },
  }]);
  const accepted = verifyAuthorizationCandidate(auditExt.candidate, {
    trustStore, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now: NOW,
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.verified_authorization.preserved_extensions[0].interpretation, "PRESERVED_UNINTERPRETED");
  assert.equal(accepted.verified_authorization.interpreted_extensions.length, 0);
});

test("AUTHORIZE requires exact current binding plus active policy before EffectiveAuthorization exists", () => {
  const v = verified();
  assert.equal(v.ok, true);
  const a = authorizeVerifiedAuthorization(v.verified_authorization, current());
  assert.equal(a.ok, true);
  assert.equal(a.effective_authorization.kind, "EffectiveAuthorization");
  assert.equal(a.decision.decision, "PERMIT");
  assert.deepEqual(a.effective_authorization.active_policy_digests, ["sha256:policy-1"]);

  const wrongResource = authorizeVerifiedAuthorization(v.verified_authorization, current({ target: `PR-24@${SHA}` }));
  assert.equal(wrongResource.ok, false);
  assert.equal(wrongResource.reason, "UNBOUND_RESOURCE");

  const missingPolicy = authorizeVerifiedAuthorization(v.verified_authorization, current({ policyDecisions: [] }));
  assert.equal(missingPolicy.ok, false);
  assert.equal(missingPolicy.reason, "MISSING_REQUIRED_POLICY");
});

test("stale authorization and attempted delegation beyond native bound HOLD", () => {
  const v = verified();
  const stale = authorizeVerifiedAuthorization(v.verified_authorization, current({ now: new Date("2026-11-04T20:10:00Z") }));
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, "STALE_AUTHORIZATION");

  const delegated = authorizeVerifiedAuthorization(v.verified_authorization, current({ delegationDepth: 1 }));
  assert.equal(delegated.ok, false);
  assert.equal(delegated.reason, "DELEGATION_ATTENUATION_VIOLATION");
});

test("only EffectiveAuthorization can emit the lease grant consumed by the unchanged broker", async () => {
  const n = candidate();
  const v = verified(n);
  assert.throws(() => effectiveAuthorityGrantEvent(n.candidate, 1), /EffectiveAuthorization required/);
  assert.throws(() => effectiveAuthorityGrantEvent(v.verified_authorization, 1), /EffectiveAuthorization required/);

  const a = authorizeVerifiedAuthorization(v.verified_authorization, current());
  const grantEvent = effectiveAuthorityGrantEvent(a.effective_authorization, 1);
  const state = await replayLeases([grantEvent]);

  const saved = {
    repo: process.env.DAO_GITHUB_REPOSITORY,
    token: process.env.DAO_GITHUB_TOKEN,
    fetch: globalThis.fetch,
  };
  process.env.DAO_GITHUB_REPOSITORY = "linuxremaster/Dao-Agentic";
  process.env.DAO_GITHUB_TOKEN = "test-token";
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if ((options.method || "GET") === "GET") {
      return { ok: true, status: 200, async json() { return { state: "open", head: { sha: SHA }, base: { repo: { full_name: "linuxremaster/Dao-Agentic" } } }; } };
    }
    return { ok: true, status: 200, async json() { return { merged: true, sha: "a".repeat(40), message: "merged" }; } };
  };

  try {
    const receipts = [];
    const decisions = [];
    const result = await authorizeRegisteredAction({
      state,
      adapterId: "github-merge-v1",
      subject: "SOC-THREAD-070",
      requestId: "request-authz-001",
      actionId: "action-authz-001",
      input: { pr_number: 23, expected_head_sha: SHA },
      evidenceIds: [EVIDENCE],
      decisionEventId: "decision-authz-001",
      appendDecision: async (event) => decisions.push(event),
      appendEvidenceEntry: async (entry) => receipts.push(entry),
      now: () => NOW,
    });
    assert.equal(result.enforcement, "ALLOW");
    assert.equal(result.decision.payload.grant_id, "grant-authz-001");
    assert.equal(calls.length, 2);
    assert.equal(receipts[0].record.transaction_state, "ACTION_INTENT_PERSISTED");
    assert.notEqual(a.decision.receipt_id, receipts[0].entry_hash);
  } finally {
    if (saved.repo === undefined) delete process.env.DAO_GITHUB_REPOSITORY; else process.env.DAO_GITHUB_REPOSITORY = saved.repo;
    if (saved.token === undefined) delete process.env.DAO_GITHUB_TOKEN; else process.env.DAO_GITHUB_TOKEN = saved.token;
    globalThis.fetch = saved.fetch;
  }
});
