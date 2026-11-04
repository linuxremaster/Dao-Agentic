import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
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
const verify = (jws, extra = {}) => verifyMandate(jws, { trustStore, expectedAudience: "SOC-THREAD-070", now, ...extra });

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
  assert.equal(verifyMandate(signed(), { trustStore: wrong, expectedAudience: "SOC-THREAD-070", now }).reason, "INVALID_SIGNATURE");
  const revoked = { version: "0.1", keys: [{ ...trustStore.keys[0], status: "REVOKED" }] };
  assert.equal(verifyMandate(signed(), { trustStore: revoked, expectedAudience: "SOC-THREAD-070", now }).reason, "KEY_REVOKED");
});

test("expiry, future issue, and wrong audience fail closed", () => {
  assert.equal(verifyMandate(signed(), { trustStore, expectedAudience: "OTHER", now }).reason, "WRONG_AUDIENCE");
  assert.equal(verifyMandate(signed(), { trustStore, expectedAudience: "SOC-THREAD-070", now: new Date("2026-11-04T20:10:00Z") }).reason, "EXPIRED");
  assert.equal(verifyMandate(signed(), { trustStore, expectedAudience: "SOC-THREAD-070", now: new Date("2026-11-04T19:58:00Z") }).reason, "FUTURE_ISSUED");
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
