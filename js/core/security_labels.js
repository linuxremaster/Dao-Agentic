export const INTEGRITY = Object.freeze({
  TRUSTED_AUTHORITY: "TRUSTED_AUTHORITY",
  TRUSTED_DATA: "TRUSTED_DATA",
  UNTRUSTED: "UNTRUSTED",
});

const PRIVACY_ORDER = Object.freeze([
  "PUBLIC",
  "PROJECT_INTERNAL",
  "USER_CONTENT",
  "PERSONAL_DATA",
  "SENSITIVE_PERSONAL_DATA",
  "CREDENTIAL_OR_SECRET",
  "SECURITY_METADATA",
]);

function validIntegrity(value) {
  if (!Object.values(INTEGRITY).includes(value)) throw new TypeError(`invalid integrity label: ${value}`);
  return value;
}

export function deriveIntegrityLabel(inputs, { trustedTransformation = false, outputLabel = null } = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new TypeError("inputs must be non-empty");
  const labels = inputs.map((x) => validIntegrity(typeof x === "string" ? x : x.integrity));
  if (trustedTransformation) {
    if (!outputLabel) throw new TypeError("trusted transformation requires explicit outputLabel");
    return validIntegrity(outputLabel);
  }
  if (labels.includes(INTEGRITY.UNTRUSTED)) return INTEGRITY.UNTRUSTED;
  if (labels.includes(INTEGRITY.TRUSTED_DATA)) return INTEGRITY.TRUSTED_DATA;
  return INTEGRITY.TRUSTED_AUTHORITY;
}

export function authorityDeltaFromDerivedEvidence(integrity) {
  validIntegrity(integrity);
  return integrity === INTEGRITY.TRUSTED_AUTHORITY ? 1 : 0;
}

export function selectRegisteredTool({ registeredToolId, metadataSuggestion = null, metadataTrusted = false } = {}) {
  if (typeof registeredToolId !== "string" || registeredToolId.length === 0) throw new TypeError("registeredToolId required");
  return Object.freeze({
    selected_tool_id: registeredToolId,
    substitution_allowed: metadataTrusted === true && metadataSuggestion === registeredToolId,
  });
}

export function sideEffectFromMemoryInstructionAllowed(memoryIntegrity) {
  return validIntegrity(memoryIntegrity) === INTEGRITY.TRUSTED_AUTHORITY;
}

export function derivePrivacyClass(inputs, { authorizedDowngrade = false, downgradeTo = null } = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new TypeError("inputs must be non-empty");
  const ranks = inputs.map((x) => {
    const cls = typeof x === "string" ? x : x.class;
    const rank = PRIVACY_ORDER.indexOf(cls);
    if (rank < 0) throw new TypeError(`invalid privacy class: ${cls}`);
    return { cls, rank };
  });
  const max = ranks.reduce((a, b) => a.rank >= b.rank ? a : b);
  if (!authorizedDowngrade) return max.cls;
  const targetRank = PRIVACY_ORDER.indexOf(downgradeTo);
  if (targetRank < 0) throw new TypeError("authorized downgrade requires valid downgradeTo");
  return downgradeTo;
}
