import { createHash } from "node:crypto";
import { canonicalJson, verifyMandate } from "./mandates.js";

export const DAO_NATIVE_MANDATE_PROFILE = "DAO-NATIVE-MANDATE-1";
export const DAO_NATIVE_MANDATE_VERSION = "0.1";

export class AuthorizationInteropError extends Error {
  constructor(message, code = "AUTHORIZATION_INTEROP_ERROR") {
    super(message);
    this.name = "AuthorizationInteropError";
    this.code = code;
  }
}

function sha256Text(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}

function stableDigest(value) {
  return sha256Text(canonicalJson(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function nonempty(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AuthorizationInteropError(`${name} must be a non-empty string`, "INVALID_INPUT");
  }
  return value;
}

function stringList(value, name) {
  if (!Array.isArray(value) || value.some((x) => typeof x !== "string" || x.length === 0)) {
    throw new AuthorizationInteropError(`${name} must be a list of non-empty strings`, "INVALID_INPUT");
  }
  if (new Set(value).size !== value.length) {
    throw new AuthorizationInteropError(`${name} must not contain duplicates`, "INVALID_INPUT");
  }
  return [...value];
}

function parseB64Json(part, name) {
  try {
    if (typeof part !== "string" || !/^[A-Za-z0-9_-]+$/.test(part)) throw new Error("bad b64url");
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    throw new AuthorizationInteropError(`${name} is not parseable JSON`, "MALFORMED_PROFILE_ARTIFACT");
  }
}

function receipt(kind, body) {
  const withoutId = { receipt_kind: kind, ...body };
  return deepFreeze({ ...withoutId, receipt_id: stableDigest(withoutId) });
}

function failResult(stage, reason, body = {}) {
  const result = receipt(`${stage}Result`, {
    stage,
    ok: false,
    disposition: "HOLD",
    reason,
    ...body,
  });
  return deepFreeze({ ok: false, disposition: "HOLD", reason, result });
}

function normalizeExtensions(sourceExtensions) {
  if (sourceExtensions === undefined) return [];
  if (!Array.isArray(sourceExtensions)) {
    throw new AuthorizationInteropError("source_extensions must be an array", "INVALID_SOURCE_EXTENSIONS");
  }
  return sourceExtensions.map((ext, index) => {
    if (!ext || typeof ext !== "object" || Array.isArray(ext)) {
      throw new AuthorizationInteropError(`source_extensions[${index}] must be an object`, "INVALID_SOURCE_EXTENSIONS");
    }
    const namespace = nonempty(ext.namespace, `source_extensions[${index}].namespace`);
    const version = nonempty(ext.version, `source_extensions[${index}].version`);
    if (typeof ext.authorization_relevant !== "boolean") {
      throw new AuthorizationInteropError(`source_extensions[${index}].authorization_relevant must be boolean`, "INVALID_SOURCE_EXTENSIONS");
    }
    if (!("claim" in ext)) {
      throw new AuthorizationInteropError(`source_extensions[${index}].claim is required`, "INVALID_SOURCE_EXTENSIONS");
    }
    return { namespace, version, authorization_relevant: ext.authorization_relevant, claim: ext.claim };
  });
}

function nativeProjection(payload, header) {
  const grant = payload?.grant ?? {};
  return {
    principal: payload?.issuer ?? null,
    acting_agent: grant?.subject ?? null,
    audience: Array.isArray(payload?.audience) ? [...payload.audience] : null,
    action: grant?.action ?? null,
    resource: { target: grant?.target ?? null, scope: grant?.scope ?? null },
    constraints: {
      required_evidence: Array.isArray(grant?.required_evidence) ? [...grant.required_evidence] : null,
      expires_sequence: grant?.expires_sequence ?? null,
    },
    delegation_bounds: { max_depth: 0 },
    validity_window: {
      issued_at: payload?.issued_at ?? null,
      not_before: payload?.not_before ?? null,
      expires_at: payload?.expires_at ?? null,
    },
    proof_of_possession: { status: "NOT_BOUND_BY_PROFILE" },
    policy_binding: null,
    cryptographic_provenance: {
      kid: header?.kid ?? null,
      alg: header?.alg ?? null,
      typ: header?.typ ?? null,
    },
    mandate_id: payload?.mandate_id ?? null,
    grant_id: grant?.grant_id ?? null,
    nonce: payload?.nonce ?? null,
  };
}

export function normalizeAuthorizationCandidate({
  profile_id,
  profile_version = DAO_NATIVE_MANDATE_VERSION,
  artifact,
  source_extensions = [],
} = {}) {
  try {
    if (profile_id !== DAO_NATIVE_MANDATE_PROFILE) {
      return failResult("Normalization", "UNSUPPORTED_PROFILE", { profile_id: profile_id ?? null, profile_version: profile_version ?? null });
    }
    if (profile_version !== DAO_NATIVE_MANDATE_VERSION) {
      return failResult("Normalization", "UNSUPPORTED_PROFILE_VERSION", { profile_id, profile_version });
    }
    nonempty(artifact, "artifact");
    const parts = artifact.trim().split(".");
    if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
      return failResult("Normalization", "MALFORMED_PROFILE_ARTIFACT", { profile_id, profile_version });
    }
    const header = parseB64Json(parts[0], "protected header");
    const payload = parseB64Json(parts[1], "payload");
    const extensions = normalizeExtensions(source_extensions);
    const sourceArtifactDigest = sha256Text(artifact.trim());
    const candidate = deepFreeze({
      kind: "AuthorizationCandidate",
      profile_id,
      profile_version,
      source_artifact_digest: sourceArtifactDigest,
      source_artifact: artifact.trim(),
      unverified_claims: nativeProjection(payload, header),
      source_extensions: extensions,
    });
    const result = receipt("NormalizationResult", {
      stage: "PARSE_NORMALIZE",
      ok: true,
      disposition: "CANDIDATE_ONLY",
      reason: "NORMALIZED_NOT_VERIFIED",
      profile_id,
      profile_version,
      source_artifact_digest: sourceArtifactDigest,
    });
    return deepFreeze({ ok: true, candidate, result });
  } catch (err) {
    return failResult("Normalization", err.code || "NORMALIZATION_FAILED", { error: String(err?.message || err) });
  }
}

function handlerKey(ext) {
  return `${ext.namespace}@${ext.version}`;
}

function normalizeHandlers(semanticHandlers = {}) {
  if (!semanticHandlers || typeof semanticHandlers !== "object" || Array.isArray(semanticHandlers)) {
    throw new AuthorizationInteropError("semanticHandlers must be an object map", "INVALID_SEMANTIC_HANDLERS");
  }
  return semanticHandlers;
}

function interpretExtensions(candidate, semanticHandlers) {
  const handlers = normalizeHandlers(semanticHandlers);
  const interpreted = [];
  const preserved = [];
  for (const ext of candidate.source_extensions) {
    const key = handlerKey(ext);
    const handler = handlers[key];
    if (!handler) {
      if (ext.authorization_relevant) {
        return { ok: false, reason: "UNKNOWN_AUTHORIZATION_SEMANTICS", extension: key };
      }
      preserved.push({ ...ext, interpretation: "PRESERVED_UNINTERPRETED" });
      continue;
    }
    if (handler.deterministic !== true || typeof handler.interpret !== "function") {
      return { ok: false, reason: "INVALID_SEMANTIC_HANDLER", extension: key };
    }
    const semantic_contract_digest = nonempty(handler.semantic_contract_digest, `${key}.semantic_contract_digest`);
    const value = handler.interpret(ext.claim);
    interpreted.push({
      namespace: ext.namespace,
      version: ext.version,
      authorization_relevant: ext.authorization_relevant,
      semantic_contract_digest,
      handler_id: handler.handler_id ?? key,
      handler_version: handler.handler_version ?? ext.version,
      value,
    });
  }
  return { ok: true, interpreted, preserved };
}

export function verifyAuthorizationCandidate(candidate, {
  trustStore,
  expectedIssuer,
  expectedAudience,
  now = new Date(),
  replayState = { mandateIds: new Set(), nonces: new Set() },
  clockSkewSeconds = 0,
  semanticHandlers = {},
} = {}) {
  if (!candidate || candidate.kind !== "AuthorizationCandidate") {
    return failResult("Verification", "CANDIDATE_REQUIRED");
  }
  if (candidate.profile_id !== DAO_NATIVE_MANDATE_PROFILE || candidate.profile_version !== DAO_NATIVE_MANDATE_VERSION) {
    return failResult("Verification", "UNSUPPORTED_PROFILE", {
      profile_id: candidate.profile_id,
      profile_version: candidate.profile_version,
      source_artifact_digest: candidate.source_artifact_digest,
    });
  }

  let extensionState;
  try {
    extensionState = interpretExtensions(candidate, semanticHandlers);
  } catch (err) {
    return failResult("Verification", err.code || "SEMANTIC_HANDLER_FAILURE", {
      profile_id: candidate.profile_id,
      profile_version: candidate.profile_version,
      source_artifact_digest: candidate.source_artifact_digest,
      error: String(err?.message || err),
    });
  }
  if (!extensionState.ok) {
    return failResult("Verification", extensionState.reason, {
      profile_id: candidate.profile_id,
      profile_version: candidate.profile_version,
      source_artifact_digest: candidate.source_artifact_digest,
      extension: extensionState.extension,
    });
  }

  const verification = verifyMandate(candidate.source_artifact, {
    trustStore,
    expectedIssuer,
    expectedAudience,
    now,
    replayState,
    clockSkewSeconds,
  });

  const trustStoreDigest = trustStore ? stableDigest(trustStore) : null;
  const verificationTime = (now instanceof Date ? now : new Date(now)).toISOString();
  const handlerContexts = extensionState.interpreted.map((x) => ({
    handler_id: x.handler_id,
    handler_version: x.handler_version,
    semantic_contract_digest: x.semantic_contract_digest,
  }));
  const context = deepFreeze({
    profile_id: candidate.profile_id,
    profile_version: candidate.profile_version,
    source_artifact_digest: candidate.source_artifact_digest,
    trust_store_version: trustStore?.version ?? null,
    trust_store_digest: trustStoreDigest,
    trust_anchor_ids: verification.kid ? [verification.kid] : [],
    signing_key_ids: verification.kid ? [verification.kid] : [],
    algorithms: verification.kid ? ["EdDSA"] : [],
    verification_time: verificationTime,
    freshness_basis: "RFC3339_UTC_PLUS_CLOCK_SKEW",
    revocation_basis: "TRUST_STORE_KEY_STATUS",
    semantic_handlers: handlerContexts,
    canonicalization_profile: "DAO-NATIVE-CANONICAL-JSON-0.1",
    verification_checks: verification.checks ?? null,
  });

  const verificationReceipt = receipt("AuthorizationVerificationReceipt", {
    stage: "VERIFY",
    ok: verification.ok === true,
    disposition: verification.ok ? "VERIFIED" : "HOLD",
    reason: verification.reason,
    profile_id: candidate.profile_id,
    profile_version: candidate.profile_version,
    source_artifact_digest: candidate.source_artifact_digest,
    verification_context: context,
  });

  if (!verification.ok) {
    return deepFreeze({
      ok: false,
      disposition: "HOLD",
      reason: verification.reason,
      receipt: verificationReceipt,
      profile_verification: verification,
    });
  }

  const mandate = verification.mandate;
  const grant = mandate.grant;
  const verifiedAuthorization = deepFreeze({
    kind: "VerifiedAuthorization",
    profile_id: candidate.profile_id,
    profile_version: candidate.profile_version,
    principal: mandate.issuer,
    acting_agent: grant.subject,
    audience: [...mandate.audience],
    action: grant.action,
    resource: { target: grant.target, scope: grant.scope },
    constraints: {
      required_evidence: [...grant.required_evidence],
      expires_sequence: grant.expires_sequence,
    },
    delegation_bounds: { max_depth: 0 },
    validity_window: {
      issued_at: mandate.issued_at,
      not_before: mandate.not_before,
      expires_at: mandate.expires_at,
    },
    proof_of_possession: { status: "NOT_BOUND_BY_PROFILE" },
    policy_binding: null,
    cryptographic_provenance: {
      kid: verification.kid,
      alg: "EdDSA",
      signature_result: verification.checks.signature_result,
      payload_integrity_result: verification.checks.payload_integrity_result,
    },
    verification_context: context,
    source_artifact_digest: candidate.source_artifact_digest,
    source_extensions: candidate.source_extensions.map((x) => ({ ...x })),
    interpreted_extensions: extensionState.interpreted,
    preserved_extensions: extensionState.preserved,
    mandate_id: mandate.mandate_id,
    grant_id: grant.grant_id,
    nonce: mandate.nonce,
    verification_receipt_id: verificationReceipt.receipt_id,
  });

  return deepFreeze({
    ok: true,
    disposition: "VERIFIED",
    verified_authorization: verifiedAuthorization,
    receipt: verificationReceipt,
    profile_verification: verification,
  });
}

function evaluatePolicies(policyDecisions) {
  if (!Array.isArray(policyDecisions) || policyDecisions.length === 0) {
    return { ok: false, reason: "MISSING_REQUIRED_POLICY", digests: [] };
  }
  const digests = [];
  for (const decision of policyDecisions) {
    if (!decision || decision.policy_state !== "ACTIVE" || decision.decision !== "ACCEPT"
      || typeof decision.policy_digest !== "string" || decision.policy_digest.length === 0) {
      return { ok: false, reason: decision?.reason || "POLICY_INVALID", digests: [] };
    }
    digests.push(decision.policy_digest);
  }
  return { ok: true, digests: [...new Set(digests)].sort() };
}

function decisionReceipt(body) {
  return receipt("AuthorizationDecision", { stage: "AUTHORIZE", ...body });
}

export function authorizeVerifiedAuthorization(verified, {
  audience,
  actingAgent,
  action,
  target,
  scope,
  evidenceIds = [],
  currentSequence,
  policyDecisions,
  now = new Date(),
  delegationDepth = 0,
} = {}) {
  const hold = (reason, checks = {}) => {
    const decision = decisionReceipt({
      ok: false,
      decision: "HOLD",
      reason,
      verified_authorization_digest: verified ? stableDigest(verified) : null,
      checks,
    });
    return deepFreeze({ ok: false, disposition: "HOLD", reason, decision });
  };

  if (!verified || verified.kind !== "VerifiedAuthorization") return hold("VERIFIED_AUTHORIZATION_REQUIRED");

  try {
    nonempty(audience, "audience");
    nonempty(actingAgent, "actingAgent");
    nonempty(action, "action");
    nonempty(target, "target");
    nonempty(scope, "scope");
    evidenceIds = stringList(evidenceIds, "evidenceIds");
    if (!Number.isSafeInteger(currentSequence) || currentSequence < 1) {
      return hold("INVALID_LOGICAL_SEQUENCE");
    }
    if (!Number.isSafeInteger(delegationDepth) || delegationDepth < 0) {
      return hold("INVALID_DELEGATION_DEPTH");
    }

    const checks = {
      audience: verified.audience.includes(audience) ? "MATCH" : "MISMATCH",
      acting_agent: verified.acting_agent === actingAgent ? "MATCH" : "MISMATCH",
      action: verified.action === action ? "MATCH" : "MISMATCH",
      target: verified.resource.target === target ? "MATCH" : "MISMATCH",
      scope: verified.resource.scope === scope ? "MATCH" : "MISMATCH",
      evidence: verified.constraints.required_evidence.every((id) => evidenceIds.includes(id)) ? "SATISFIED" : "MISSING_REQUIRED_EVIDENCE",
      delegation: delegationDepth <= verified.delegation_bounds.max_depth ? "WITHIN_BOUND" : "EXCEEDS_BOUND",
      logical_expiry: currentSequence < verified.constraints.expires_sequence ? "VALID" : "EXPIRED",
      freshness: "NOT_CHECKED",
      policy: "NOT_CHECKED",
    };

    const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
    if (!Number.isFinite(nowMs)) return hold("INVALID_CURRENT_TIME", checks);
    const nbf = Date.parse(verified.validity_window.not_before);
    const exp = Date.parse(verified.validity_window.expires_at);
    checks.freshness = nowMs >= nbf && nowMs < exp ? "VALID" : (nowMs < nbf ? "NOT_YET_VALID" : "EXPIRED");

    const policy = evaluatePolicies(policyDecisions);
    checks.policy = policy.ok ? "ACCEPT" : "HOLD";

    const orderedFailures = [
      [checks.audience !== "MATCH", "UNBOUND_AUDIENCE"],
      [checks.acting_agent !== "MATCH", "UNBOUND_ACTING_AGENT"],
      [checks.action !== "MATCH", "UNBOUND_ACTION"],
      [checks.target !== "MATCH", "UNBOUND_RESOURCE"],
      [checks.scope !== "MATCH", "UNBOUND_SCOPE"],
      [checks.evidence !== "SATISFIED", "MISSING_REQUIRED_EVIDENCE"],
      [checks.delegation !== "WITHIN_BOUND", "DELEGATION_ATTENUATION_VIOLATION"],
      [checks.logical_expiry !== "VALID", "STALE_AUTHORIZATION"],
      [checks.freshness !== "VALID", "STALE_AUTHORIZATION"],
      [!policy.ok, policy.reason],
    ];
    const failed = orderedFailures.find(([condition]) => condition);
    if (failed) return hold(failed[1], checks);

    const decisionBody = {
      ok: true,
      decision: "PERMIT",
      reason: "EFFECTIVE_AUTHORIZATION_ESTABLISHED",
      verified_authorization_digest: stableDigest(verified),
      checks,
      active_policy_digests: policy.digests,
      effective_bindings: {
        audience,
        acting_agent: actingAgent,
        action,
        target,
        scope,
        evidence_ids: evidenceIds,
        current_sequence: currentSequence,
        delegation_depth: delegationDepth,
      },
    };
    const decision = decisionReceipt(decisionBody);
    const effective = deepFreeze({
      kind: "EffectiveAuthorization",
      profile_id: verified.profile_id,
      profile_version: verified.profile_version,
      principal: verified.principal,
      acting_agent: actingAgent,
      audience,
      action,
      resource: { target, scope },
      constraints: {
        required_evidence: [...verified.constraints.required_evidence],
        expires_sequence: verified.constraints.expires_sequence,
      },
      delegation_bounds: { max_depth: verified.delegation_bounds.max_depth, effective_depth: delegationDepth },
      active_policy_digests: policy.digests,
      verified_authorization_digest: stableDigest(verified),
      verification_receipt_id: verified.verification_receipt_id,
      authorization_decision_id: decision.receipt_id,
      source_artifact_digest: verified.source_artifact_digest,
      effective_at: (now instanceof Date ? now : new Date(now)).toISOString(),
      effective_sequence: currentSequence,
      grant_id: verified.grant_id,
      mandate_id: verified.mandate_id,
    });
    return deepFreeze({ ok: true, disposition: "PERMIT", effective_authorization: effective, decision });
  } catch (err) {
    return hold(err.code || "AUTHORIZATION_EVALUATION_FAILED", { error: String(err?.message || err) });
  }
}

export function effectiveAuthorityGrantEvent(effective, sequence) {
  if (!effective || effective.kind !== "EffectiveAuthorization") {
    throw new AuthorizationInteropError("EffectiveAuthorization required", "EFFECTIVE_AUTHORIZATION_REQUIRED");
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new AuthorizationInteropError("sequence must be a safe integer >= 1", "INVALID_LOGICAL_SEQUENCE");
  }
  if (effective.effective_sequence !== sequence) {
    throw new AuthorizationInteropError("effective authorization sequence does not match grant event sequence", "SEQUENCE_BINDING_MISMATCH");
  }
  if (effective.constraints.expires_sequence <= sequence) {
    throw new AuthorizationInteropError("effective authorization is logically expired", "STALE_AUTHORIZATION");
  }
  return deepFreeze({
    event_id: `effective-auth:${effective.authorization_decision_id}`,
    sequence,
    kind: "AUTHORITY_GRANTED",
    payload: {
      grant_id: effective.grant_id,
      subject: effective.acting_agent,
      action: effective.action,
      target: effective.resource.target,
      scope: effective.resource.scope,
      expires_sequence: effective.constraints.expires_sequence,
      required_evidence: [...effective.constraints.required_evidence],
    },
  });
}
