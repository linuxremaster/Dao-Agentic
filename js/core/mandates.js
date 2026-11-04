import { createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";

export class MandateError extends Error {
  constructor(message, code = "INVALID_MANDATE") { super(message); this.name = "MandateError"; this.code = code; }
}

const HEADER_FIELDS = ["alg", "kid", "typ"];
const MANDATE_FIELDS = ["version", "mandate_id", "issuer", "audience", "issued_at", "not_before", "expires_at", "nonce", "grant"];
const GRANT_FIELDS = ["grant_id", "subject", "action", "target", "scope", "expires_sequence", "required_evidence"];
const FORBIDDEN = new Set(["*", "ANY", "ALL"]);
const TYPE = "dao-action-mandate+jws";

function exactKeys(value, fields) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const a = Object.keys(value).sort();
  const b = [...fields].sort();
  return a.length === b.length && a.every((k, i) => k === b[i]);
}
function nonempty(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new MandateError(`${name} must be a non-empty string`);
  return value;
}
function explicit(value, name) {
  nonempty(value, name);
  if (FORBIDDEN.has(value)) throw new MandateError(`${name} must be explicit; wildcards are forbidden`);
  return value;
}
function stringList(value, name) {
  if (!Array.isArray(value) || value.length === 0 || value.some((x) => typeof x !== "string" || x.length === 0)) {
    throw new MandateError(`${name} must be a non-empty list of non-empty strings`);
  }
  if (new Set(value).size !== value.length) throw new MandateError(`${name} must not contain duplicates`);
  return [...value];
}
function optionalStringList(value, name) {
  if (!Array.isArray(value) || value.some((x) => typeof x !== "string" || x.length === 0)) {
    throw new MandateError(`${name} must be a list of non-empty strings`);
  }
  if (new Set(value).size !== value.length) throw new MandateError(`${name} must not contain duplicates`);
  return [...value];
}
function stableValue(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (typeof value !== "object") throw new MandateError("unsupported canonical JSON value");
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableValue(value[k])}`).join(",")}}`;
}
export function canonicalJson(value) { return stableValue(value); }
function b64url(bytes) { return Buffer.from(bytes).toString("base64url"); }
function unb64url(text) {
  if (typeof text !== "string" || !/^[A-Za-z0-9_-]+$/.test(text)) throw new MandateError("invalid base64url encoding");
  return Buffer.from(text, "base64url");
}
function parseJson(bytes, name) {
  try { return JSON.parse(Buffer.from(bytes).toString("utf8")); }
  catch { throw new MandateError(`${name} is not valid JSON`); }
}
function parseUtc(value, name) {
  nonempty(value, name);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    throw new MandateError(`${name} must be an RFC3339 UTC timestamp ending in Z`);
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new MandateError(`${name} is invalid`);
  return ms;
}
function validateGrant(grant) {
  if (!exactKeys(grant, GRANT_FIELDS)) throw new MandateError("grant fields do not match contract");
  const out = {
    grant_id: explicit(grant.grant_id, "grant.grant_id"),
    subject: explicit(grant.subject, "grant.subject"),
    action: explicit(grant.action, "grant.action"),
    target: explicit(grant.target, "grant.target"),
    scope: explicit(grant.scope, "grant.scope"),
    expires_sequence: grant.expires_sequence,
    required_evidence: optionalStringList(grant.required_evidence, "grant.required_evidence"),
  };
  if (!Number.isSafeInteger(out.expires_sequence) || out.expires_sequence < 2) {
    throw new MandateError("grant.expires_sequence must be a safe integer >= 2");
  }
  return out;
}
export function validateMandate(mandate) {
  if (!exactKeys(mandate, MANDATE_FIELDS)) throw new MandateError("mandate fields do not match contract");
  if (mandate.version !== "0.1") throw new MandateError("unsupported mandate version");
  const issued = parseUtc(mandate.issued_at, "issued_at");
  const nbf = parseUtc(mandate.not_before, "not_before");
  const exp = parseUtc(mandate.expires_at, "expires_at");
  if (issued > nbf || nbf >= exp) throw new MandateError("mandate time ordering must satisfy issued_at <= not_before < expires_at");
  return {
    version: "0.1",
    mandate_id: explicit(mandate.mandate_id, "mandate_id"),
    issuer: explicit(mandate.issuer, "issuer"),
    audience: stringList(mandate.audience, "audience"),
    issued_at: mandate.issued_at,
    not_before: mandate.not_before,
    expires_at: mandate.expires_at,
    nonce: explicit(mandate.nonce, "nonce"),
    grant: validateGrant(mandate.grant),
  };
}
function validateHeader(header) {
  if (!exactKeys(header, HEADER_FIELDS)) throw new MandateError("protected header fields do not match contract");
  if (header.alg !== "EdDSA") throw new MandateError("only EdDSA is allowed", "ALGORITHM_NOT_ALLOWED");
  if (header.typ !== TYPE) throw new MandateError("unexpected mandate type");
  return { alg: "EdDSA", kid: explicit(header.kid, "kid"), typ: TYPE };
}
function trustedKey(trustStore, kid) {
  if (!trustStore || trustStore.version !== "0.1" || !Array.isArray(trustStore.keys)) {
    throw new MandateError("invalid trust store", "TRUST_STORE_INVALID");
  }
  const matches = trustStore.keys.filter((k) => k && k.kid === kid);
  if (matches.length !== 1) throw new MandateError("operator key not found or ambiguous", "UNKNOWN_KEY");
  const key = matches[0];
  if (key.alg !== "EdDSA") throw new MandateError("key algorithm is not allowed", "ALGORITHM_NOT_ALLOWED");
  if (key.status !== "ACTIVE") throw new MandateError("operator key is not active", "KEY_REVOKED");
  nonempty(key.public_key_pem, "public_key_pem");
  return key;
}
function defaultChecks() {
  return {
    signature_result: "NOT_CHECKED",
    key_result: "NOT_CHECKED",
    algorithm_result: "NOT_CHECKED",
    issuer_result: "NOT_CHECKED",
    freshness_result: "NOT_CHECKED",
    audience_result: "NOT_CHECKED",
    scope_result: "NOT_CHECKED",
    replay_result: "NOT_CHECKED",
    payload_integrity_result: "NOT_CHECKED",
    canonicalization_result: "NOT_CHECKED",
  };
}
function authorizationState(reason) {
  if (reason === "MISSING_SIGNATURE" || reason === "MALFORMED_JWS") return "UNAUTHENTICATED";
  if (reason === "REPLAY") return "REJECT";
  if (reason === "WRONG_AUDIENCE" || reason === "WRONG_ISSUER") return "NOT_AUTHORIZED";
  return "INVALID";
}
function failure(reason, details = {}, checks = defaultChecks()) {
  return Object.freeze({
    ok: false,
    authorization_state: authorizationState(reason),
    disposition: "HOLD",
    reason,
    checks: Object.freeze({ ...checks }),
    ...details,
  });
}

export function signMandate(mandate, { kid, privateKeyPem }) {
  const valid = validateMandate(mandate);
  const header = { alg: "EdDSA", kid: explicit(kid, "kid"), typ: TYPE };
  const h = b64url(Buffer.from(canonicalJson(header), "utf8"));
  const p = b64url(Buffer.from(canonicalJson(valid), "utf8"));
  const input = Buffer.from(`${h}.${p}`, "ascii");
  const sig = cryptoSign(null, input, createPrivateKey(privateKeyPem));
  return `${h}.${p}.${b64url(sig)}`;
}

export function verifyMandate(jws, {
  trustStore,
  expectedAudience,
  expectedIssuer,
  now = new Date(),
  replayState = { mandateIds: new Set(), nonces: new Set() },
  clockSkewSeconds = 0,
} = {}) {
  const checks = defaultChecks();
  const fail = (reason, details = {}) => failure(reason, details, checks);
  try {
    if (typeof jws !== "string" || jws.trim() === "") return fail("MISSING_SIGNATURE");
    const parts = jws.trim().split(".");
    if (parts.length !== 3 || parts.some((p) => p.length === 0)) return fail("MALFORMED_JWS");
    const [h64, p64, s64] = parts;

    const header = validateHeader(parseJson(unb64url(h64), "protected header"));
    checks.algorithm_result = "ALLOWED";
    if (b64url(Buffer.from(canonicalJson(header), "utf8")) !== h64) {
      checks.canonicalization_result = "NON_CANONICAL";
      return fail("NON_CANONICAL_JWS", { kid: header.kid });
    }

    let key;
    try {
      key = trustedKey(trustStore, header.kid);
      checks.key_result = "VALID";
    } catch (err) {
      if (err instanceof MandateError) {
        checks.key_result = err.code === "KEY_REVOKED" ? "REVOKED" : "INVALID";
        if (err.code === "ALGORITHM_NOT_ALLOWED") checks.algorithm_result = "NOT_ALLOWED";
        return fail(err.code || "INVALID_MANDATE", { error: err.message, kid: header.kid });
      }
      throw err;
    }

    const input = Buffer.from(`${h64}.${p64}`, "ascii");
    const signature = unb64url(s64);
    let publicKey;
    try { publicKey = createPublicKey(key.public_key_pem); }
    catch {
      checks.key_result = "INVALID";
      return fail("TRUST_STORE_INVALID", { kid: header.kid });
    }
    if (!cryptoVerify(null, input, publicKey, signature)) {
      checks.signature_result = "INVALID";
      checks.payload_integrity_result = "INVALID";
      return fail("INVALID_SIGNATURE", { kid: header.kid });
    }
    checks.signature_result = "VALID";
    checks.payload_integrity_result = "VALID";

    const mandate = validateMandate(parseJson(unb64url(p64), "mandate payload"));
    if (b64url(Buffer.from(canonicalJson(mandate), "utf8")) !== p64) {
      checks.canonicalization_result = "NON_CANONICAL";
      return fail("NON_CANONICAL_JWS", { kid: header.kid, mandate_id: mandate.mandate_id });
    }
    checks.canonicalization_result = "VALID";
    checks.scope_result = "SIGNED_EXPLICIT_GRANT";

    explicit(expectedIssuer, "expectedIssuer");
    if (mandate.issuer !== expectedIssuer) {
      checks.issuer_result = "MISMATCH";
      return fail("WRONG_ISSUER", { kid: header.kid, mandate_id: mandate.mandate_id });
    }
    checks.issuer_result = "MATCH";

    explicit(expectedAudience, "expectedAudience");
    if (!mandate.audience.includes(expectedAudience)) {
      checks.audience_result = "MISMATCH";
      return fail("WRONG_AUDIENCE", { kid: header.kid, mandate_id: mandate.mandate_id });
    }
    checks.audience_result = "MATCH";

    const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
    if (!Number.isFinite(nowMs)) throw new MandateError("now is invalid");
    const skew = clockSkewSeconds * 1000;
    const issued = Date.parse(mandate.issued_at);
    const nbf = Date.parse(mandate.not_before);
    const exp = Date.parse(mandate.expires_at);
    if (issued > nowMs + skew) {
      checks.freshness_result = "FUTURE_ISSUED";
      return fail("FUTURE_ISSUED", { kid: header.kid, mandate_id: mandate.mandate_id });
    }
    if (nowMs + skew < nbf) {
      checks.freshness_result = "NOT_YET_VALID";
      return fail("NOT_YET_VALID", { kid: header.kid, mandate_id: mandate.mandate_id });
    }
    if (nowMs - skew >= exp) {
      checks.freshness_result = "EXPIRED";
      return fail("EXPIRED", { kid: header.kid, mandate_id: mandate.mandate_id });
    }
    checks.freshness_result = "VALID";

    if (replayState.mandateIds?.has(mandate.mandate_id) || replayState.nonces?.has(mandate.nonce)) {
      checks.replay_result = "REPLAY";
      return fail("REPLAY", { kid: header.kid, mandate_id: mandate.mandate_id });
    }
    checks.replay_result = "FRESH";

    return Object.freeze({
      ok: true,
      authorization_state: "AUTHENTICATED_OPERATOR_INSTRUCTION",
      disposition: "AUTHENTICATED_OPERATOR_INSTRUCTION",
      reason: "VALID_MANDATE",
      kid: header.kid,
      mandate,
      checks: Object.freeze({ ...checks }),
    });
  } catch (err) {
    if (err instanceof MandateError) {
      if (err.code === "ALGORITHM_NOT_ALLOWED") checks.algorithm_result = "NOT_ALLOWED";
      return fail(err.code || "INVALID_MANDATE", { error: err.message });
    }
    return fail("INVALID_MANDATE", { error: String(err?.message || err) });
  }
}

export function authorityGrantEvent(verification, sequence) {
  if (!verification?.ok) throw new MandateError("verified mandate required", "UNAUTHENTICATED");
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new MandateError("sequence must be a safe integer >= 1");
  const g = verification.mandate.grant;
  if (g.expires_sequence <= sequence) throw new MandateError("signed grant already expired in logical sequence", "GRANT_EXPIRED");
  return {
    event_id: `mandate:${verification.mandate.mandate_id}`,
    sequence,
    kind: "AUTHORITY_GRANTED",
    payload: { ...g, required_evidence: [...g.required_evidence] },
  };
}
