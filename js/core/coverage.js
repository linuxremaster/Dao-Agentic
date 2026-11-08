const RISK_FLOORS = Object.freeze({
  R1_LOW: 0.95,
  R2_MATERIAL: 0.98,
  R3_HIGH: 0.99,
});

const FIXED_FIXTURE_REQUIRED_RECALL = 1.0;

function explicit(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function bool(value, name) {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
  return value;
}

function uniqueStrings(values, name) {
  if (!Array.isArray(values) || values.some((x) => typeof x !== "string" || x.trim() === "")) {
    throw new TypeError(`${name} must be a list of non-empty strings`);
  }
  return [...new Set(values.map((x) => x.trim()))];
}

export function coverageFloor(risk) {
  explicit(risk, "risk");
  if (!(risk in RISK_FLOORS)) throw new TypeError(`unsupported risk class: ${risk}`);
  return RISK_FLOORS[risk];
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitMaterialClauses(sentence) {
  // Deliberately conservative: split only discourse boundaries that commonly
  // join independently verifiable propositions. Do not split arbitrary "and".
  return sentence
    .split(/\s+(?:while|but)\s+/iu)
    .map((s) => s.trim().replace(/^[,;:]\s*/, "").replace(/[.!?]+$/, "").trim())
    .filter(Boolean);
}

function isClearlySubjectiveValue(text) {
  return /\b(?:nicest|best-looking|prettiest|favorite|favourite|most beautiful|tastiest)\b/iu.test(text);
}

function isInstructionLikeUntrustedData(text) {
  return /\bignore\s+(?:policy|previous|prior)\b/iu.test(text)
    || /\bsend\s+the\s+private\s+key\b/iu.test(text);
}

function isActionConditioning(text) {
  return /^if\b/iu.test(text) || /\bonly\s+if\b/iu.test(text) || /\bdeploy\b|\bdelete\b|\brotate\b/iu.test(text);
}

/**
 * Deterministic, source-independent candidate decomposition used as a baseline
 * coverage mechanism. It intentionally favors recall over precision: later
 * epistemic gates decide whether a candidate is evidentiary, normative, quoted,
 * or irrelevant. This function does not certify its own completeness.
 */
export function extractCandidateClaims(text) {
  explicit(text, "text");
  const candidates = [];
  let index = 0;
  for (const sentence of splitSentences(text)) {
    for (const clause of splitMaterialClauses(sentence)) {
      const classification = isClearlySubjectiveValue(clause)
        ? "VALUE_OR_PREFERENCE"
        : isInstructionLikeUntrustedData(clause)
          ? "UNTRUSTED_INSTRUCTION_LIKE_DATA"
          : "SUBSTANTIVE_CANDIDATE";
      candidates.push(Object.freeze({
        candidate_id: `candidate-${++index}`,
        text: clause,
        classification,
        action_conditioning: isActionConditioning(clause),
        untrusted_instruction_like: classification === "UNTRUSTED_INSTRUCTION_LIKE_DATA",
      }));
    }
  }
  return Object.freeze(candidates);
}

function normalizedToken(token) {
  let t = token.toLowerCase();
  if (/^attribut(?:e|es|ed|ing)$/.test(t)) return "attribut";
  if (/^report(?:s|ed|ing)?$/.test(t)) return "report";
  if (/^remain(?:s|ed|ing)?$/.test(t)) return "remain";
  if (/^authoriz(?:e|es|ed|ing)$/.test(t)) return "authoriz";
  if (t.endsWith("'s")) t = t.slice(0, -2);
  return t;
}

function tokens(text) {
  return (text.match(/[\p{L}\p{N}_-]+/gu) ?? []).map(normalizedToken);
}

const MATCH_STOP = new Set(["the", "a", "an", "to", "of", "and", "or", "it", "is", "be", "was"]);

function contentTokenSet(text) {
  return new Set(tokens(text).filter((t) => !MATCH_STOP.has(t)));
}

export function referenceClaimMatched(referenceSpan, candidateText) {
  const need = contentTokenSet(explicit(referenceSpan, "referenceSpan"));
  const have = contentTokenSet(explicit(candidateText, "candidateText"));
  if (need.size === 0) return false;
  let matched = 0;
  for (const token of need) if (have.has(token)) matched += 1;
  return matched / need.size >= 0.8;
}

/** Offline/fixture benchmark evaluator. The benchmark labels are reference data,
 * not runtime hints to the extractor. */
export function evaluateClaimCoverage({ risk, referenceClaims, candidates, fixedNormativeFixture = false }) {
  const floor = coverageFloor(risk);
  if (!Array.isArray(referenceClaims) || referenceClaims.length === 0) throw new TypeError("referenceClaims must be non-empty");
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array");

  const material = referenceClaims.filter((r) => r?.material === true);
  if (material.length === 0) throw new TypeError("referenceClaims must include material claims");

  const detected = [];
  const missed = [];
  for (const ref of material) {
    const hit = candidates.some((c) => referenceClaimMatched(ref.span, c.text));
    (hit ? detected : missed).push(ref.id);
  }
  const recall = detected.length / material.length;
  const required = fixedNormativeFixture ? FIXED_FIXTURE_REQUIRED_RECALL : floor;
  const passed = recall >= required;
  const disposition = passed
    ? "COVERAGE_PASS"
    : risk === "R3_HIGH" ? "HOLD" : "HOLD_OR_QUALIFY";
  return Object.freeze({
    risk,
    policy_version: "CP-1.3.0",
    recall,
    required_recall: required,
    floor_recall: floor,
    detected_ids: Object.freeze(detected),
    missed_ids: Object.freeze(missed),
    passed,
    disposition,
  });
}

export function evaluateSearchCoverage({
  risk,
  retrievalSources = [],
  citationChainingPass = false,
  domainEquivalent = false,
  authoritativeComprehensiveException = false,
  narrowControllingAuthorityLookup = false,
  searchCompleted = true,
} = {}) {
  coverageFloor(risk); // validates risk
  const sources = uniqueStrings(retrievalSources, "retrievalSources");
  bool(citationChainingPass, "citationChainingPass");
  bool(domainEquivalent, "domainEquivalent");
  bool(authoritativeComprehensiveException, "authoritativeComprehensiveException");
  bool(narrowControllingAuthorityLookup, "narrowControllingAuthorityLookup");
  bool(searchCompleted, "searchCompleted");

  let complete = false;
  let reason = "INSUFFICIENT_SEARCH_BREADTH";
  if (!searchCompleted) {
    complete = false;
    reason = "SEARCH_NOT_COMPLETED";
  } else if (narrowControllingAuthorityLookup) {
    complete = sources.length >= 1;
    reason = complete ? "NARROW_CONTROLLING_AUTHORITY_LOOKUP" : "NO_RETRIEVAL_SOURCE";
  } else if (risk === "R1_LOW") {
    complete = sources.length >= 1 || authoritativeComprehensiveException;
    reason = complete ? "R1_POLICY_BREADTH_MET" : "INSUFFICIENT_SEARCH_BREADTH";
  } else if (risk === "R2_MATERIAL") {
    complete = sources.length >= 2 || authoritativeComprehensiveException;
    reason = complete ? (authoritativeComprehensiveException ? "AUTHORITATIVE_COMPREHENSIVE_EXCEPTION" : "R2_BREADTH_MET") : "INSUFFICIENT_SEARCH_BREADTH";
  } else {
    complete = sources.length >= 2 && (citationChainingPass || domainEquivalent);
    reason = complete ? (citationChainingPass ? "R3_BREADTH_PLUS_CHAINING_MET" : "R3_DOMAIN_EQUIVALENT_MET") : "INSUFFICIENT_SEARCH_BREADTH";
  }

  return Object.freeze({
    risk,
    policy_version: "CP-1.3.0",
    search_coverage: complete ? "COMPLETE" : "INCOMPLETE",
    complete,
    reason,
    retrieval_source_count: sources.length,
    supported_unqualified: complete,
    decision: complete ? "CONTINUE" : risk === "R3_HIGH" ? "HOLD" : "QUALIFY_OR_HOLD",
  });
}
