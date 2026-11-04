import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { authorityGrantEvent, signMandate, verifyMandate } from "../core/mandates.js";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
const trustStore = { version: "0.1", keys: [{ kid: "operator-2026-01", alg: "EdDSA", status: "ACTIVE", public_key_pem: publicKeyPem }] };
const now = new Date("2026-11-04T20:00:00Z");
const mandate = (overrides = {}) => ({
  version: "0.1", mandate_id: "m-001", issuer: "operator", audience: ["SOC-THREAD-070"],
  issued_at: "2026-11-04T19:59:00Z", not_before: "2026-11-04T19:59:00Z", expires_at: "2026-11-04T20:10:00Z",
  nonce: "n-001",
  grant: { grant_id: "g-001", subject: "SOC-THREAD-070", action: "IMPLEMENT", target: "signed-mandate-gate", scope: "linuxremaster/Dao-Agentic", expires_sequence: 10, required_evidence: [] },
  ...overrides,
});
const signed = (m = mandate()) => signMandate(m, { kid: "operator-2026-01", privateKeyPem });
const verify = (jws, extra = {}) => verifyMandate(jws, {
  trustStore, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now, ...extra,
});

test("valid mandate verifies and emits exact authority grant event", () => {
  const v = verify(signed());
  assert.equal(v.ok, true);
  assert.equal(v.disposition, "AUTHENTICATED_OPERATOR_INSTRUCTION");
  assert.deepEqual(authorityGrantEvent(v, 1), {
    event_id: "mandate:m-001", sequence: 1, kind: "AUTHORITY_GRANTED",
    payload: { grant_id: "g-001", subject: "SOC-THREAD-070", action: "IMPLEMENT", target: "signed-mandate-gate", scope: "linuxremaster/Dao-Agentic", expires_sequence: 10, required_evidence: [] },
  });
});

test("modified payload is rejected", () => {
  const parts = signed().split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  payload.grant.action = "DELETE";
  parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
  assert.equal(verify(parts.join(".")).reason, "INVALID_SIGNATURE");
});

test("wrong key and revoked key are rejected", () => {
  const other = generateKeyPairSync("ed25519");
  const wrong = { version: "0.1", keys: [{ kid: "operator-2026-01", alg: "EdDSA", status: "ACTIVE", public_key_pem: other.publicKey.export({ type: "spki", format: "pem" }) }] };
  assert.equal(verifyMandate(signed(), { trustStore: wrong, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now }).reason, "INVALID_SIGNATURE");
  const revoked = { version: "0.1", keys: [{ ...trustStore.keys[0], status: "REVOKED" }] };
  assert.equal(verifyMandate(signed(), { trustStore: revoked, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now }).reason, "KEY_REVOKED");
});

test("expiry, future issue, and wrong audience fail closed", () => {
  assert.equal(verifyMandate(signed(), { trustStore, expectedIssuer: "operator", expectedAudience: "OTHER", now }).reason, "WRONG_AUDIENCE");
  assert.equal(verifyMandate(signed(), { trustStore, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now: new Date("2026-11-04T20:10:00Z") }).reason, "EXPIRED");
  assert.equal(verifyMandate(signed(), { trustStore, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now: new Date("2026-11-04T19:58:00Z") }).reason, "FUTURE_ISSUED");
});

test("mandate id and nonce replay are rejected", () => {
  assert.equal(verify(signed(), { replayState: { mandateIds: new Set(["m-001"]), nonces: new Set() } }).reason, "REPLAY");
  assert.equal(verify(signed(), { replayState: { mandateIds: new Set(), nonces: new Set(["n-001"]) } }).reason, "REPLAY");
});

test("wildcards and extra fields are rejected before signing", () => {
  assert.throws(() => signed(mandate({ grant: { ...mandate().grant, scope: "*" } })));
  assert.throws(() => signed({ ...mandate(), surprise: true }));
});

test("logical expiry is checked when grant event is emitted", () => {
  const v = verify(signed());
  assert.throws(() => authorityGrantEvent(v, 10));
});


test("wrong issuer is rejected deterministically", () => {
  const v = verify(signed(), { expectedIssuer: "different-operator" });
  assert.equal(v.ok, false);
  assert.equal(v.reason, "WRONG_ISSUER");
  assert.equal(v.checks.issuer_result, "MISMATCH");
});

test("validly signed non-canonical payload is rejected", () => {
  const header = { alg: "EdDSA", kid: "operator-2026-01", typ: "dao-action-mandate+jws" };
  const h64 = Buffer.from(JSON.stringify(header), "utf8").toString("base64url");
  const p64 = Buffer.from(JSON.stringify(mandate(), null, 2), "utf8").toString("base64url");
  const input = Buffer.from(`${h64}.${p64}`, "ascii");
  const sig = cryptoSign(null, input, privateKey).toString("base64url");
  const v = verify(`${h64}.${p64}.${sig}`);
  assert.equal(v.ok, false);
  assert.equal(v.reason, "NON_CANONICAL_JWS");
  assert.equal(v.checks.canonicalization_result, "NON_CANONICAL");
});


test("mandatory HOLD classifications are explicit", () => {
  const missing = verifyMandate("", {
    trustStore, expectedIssuer: "operator", expectedAudience: "SOC-THREAD-070", now,
  });
  assert.equal(missing.authorization_state, "UNAUTHENTICATED");
  assert.equal(missing.disposition, "HOLD");

  const replay = verify(signed(), {
    replayState: { mandateIds: new Set(["m-001"]), nonces: new Set() },
  });
  assert.equal(replay.authorization_state, "REJECT");
  assert.equal(replay.disposition, "HOLD");

  const wrongAudience = verifyMandate(signed(), {
    trustStore, expectedIssuer: "operator", expectedAudience: "OTHER", now,
  });
  assert.equal(wrongAudience.authorization_state, "NOT_AUTHORIZED");
  assert.equal(wrongAudience.disposition, "HOLD");
});

test("key rotation supports a new active kid while an old kid is revoked", () => {
  const rotated = generateKeyPairSync("ed25519");
  const rotatedPrivatePem = rotated.privateKey.export({ type: "pkcs8", format: "pem" });
  const rotatedPublicPem = rotated.publicKey.export({ type: "spki", format: "pem" });
  const rotatedStore = {
    version: "0.1",
    keys: [
      { ...trustStore.keys[0], status: "REVOKED" },
      { kid: "operator-2026-02", alg: "EdDSA", status: "ACTIVE", public_key_pem: rotatedPublicPem },
    ],
  };
  const jws = signMandate(mandate({ mandate_id: "m-rotated", nonce: "n-rotated" }), {
    kid: "operator-2026-02", privateKeyPem: rotatedPrivatePem,
  });
  const v = verifyMandate(jws, {
    trustStore: rotatedStore,
    expectedIssuer: "operator",
    expectedAudience: "SOC-THREAD-070",
    now,
  });
  assert.equal(v.ok, true);
  assert.equal(v.kid, "operator-2026-02");
});
