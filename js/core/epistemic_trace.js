export class EpistemicTraceError extends Error {
  constructor(message) { super(message); this.name = "EpistemicTraceError"; }
}

const CLAIM_TYPES = new Set([
  "EMPIRICAL", "CAUSAL", "PREDICTIVE", "GENERALIZATION",
  "NORMATIVE", "OPINION", "PROJECT_STATE",
]);
const DISPOSITIONS = new Set([
  "SUPPORTED", "MIXED", "CONTRADICTED", "PENDING", "EVIDENCE_GAP", "QUARANTINE",
]);
const SOURCE_CLASSES = new Set(["ACADEMIC", "PROJECT_PRIMARY"]);
const PEER_REVIEW = new Set(["PEER_REVIEWED", "PREPRINT", "UNKNOWN", "NONACADEMIC", "NOT_APPLICABLE"]);
const QUALITY = new Set(["A", "B", "C", "QUARANTINE", "UNKNOWN"]);
const SUPPORT = new Set(["DIRECT", "INDIRECT", "BACKGROUND", "CONTRADICTS"]);
const VERIFICATION = new Set(["VERIFIED_PRIMARY", "VERIFIED_CATALOG", "CATALOG_ONLY", "UNVERIFIED", "MISMATCH"]);
const FAILURE_KINDS = new Set([
  "UNRESOLVABLE", "CITATION_MISMATCH", "PEER_REVIEW_UNKNOWN", "NON_PEER_REVIEWED",
  "INDIRECT_SUPPORT", "LOW_METHOD_QUALITY", "DUPLICATE_NOT_INDEPENDENT",
  "CONTRADICTORY_EVIDENCE", "LOW_EFFORT_RESEARCH", "FABRICATION_SUSPECTED", "OTHER",
]);
const ROOT_FIELDS = ["version", "mode", "claims", "sources", "failures"];
const CLAIM_FIELDS = ["claim_id", "claim_type", "disposition", "source_ids"];
const SOURCE_FIELDS = [
  "source_id", "source_class", "external_source_url", "rag_archive_url", "archive_sha256",
  "peer_review_status", "quality_tier", "support_relation", "verification", "logical_work_id",
];
const FAILURE_FIELDS = ["failure_kind", "source_id", "detail"];
const SHA = /^sha256:[0-9a-f]{64}$/;

function exactKeys(value, fields, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EpistemicTraceError(`${name} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) {
    throw new EpistemicTraceError(`${name} fields do not match contract`);
  }
}
function nonempty(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new EpistemicTraceError(`${name} must be a non-empty string`);
  }
  return value;
}
function oneOf(value, allowed, name) {
  nonempty(value, name);
  if (!allowed.has(value)) throw new EpistemicTraceError(`${name} has unsupported value ${value}`);
  return value;
}
function stringList(value, name) {
  if (!Array.isArray(value) || value.some((x) => typeof x !== "string" || x.length === 0)) {
    throw new EpistemicTraceError(`${name} must be a list of non-empty strings`);
  }
  if (new Set(value).size !== value.length) throw new EpistemicTraceError(`${name} must not contain duplicates`);
  return [...value];
}
function httpsUrl(value, name) {
  nonempty(value, name);
  let parsed;
  try { parsed = new URL(value); } catch { throw new EpistemicTraceError(`${name} must be a valid URL`); }
  if (parsed.protocol !== "https:") throw new EpistemicTraceError(`${name} must use https`);
  return value;
}
function archivePair(source) {
  const pendingUrl = source.rag_archive_url === "PENDING_ARCHIVE";
  const pendingHash = source.archive_sha256 === "PENDING_ARCHIVE";
  if (pendingUrl !== pendingHash) throw new EpistemicTraceError("rag_archive_url and archive_sha256 must become available together");
  if (pendingUrl) return false;
  httpsUrl(source.rag_archive_url, "source.rag_archive_url");
  const host = new URL(source.rag_archive_url).hostname;
  if (host !== "drive.google.com" && host !== "docs.google.com") {
    throw new EpistemicTraceError("source.rag_archive_url must be a Google Drive locator or PENDING_ARCHIVE");
  }
  if (!SHA.test(source.archive_sha256)) throw new EpistemicTraceError("source.archive_sha256 must be sha256:<64 lowercase hex>");
  return true;
}
function qualifyingAcademic(source, relation) {
  return source.source_class === "ACADEMIC"
    && source.peer_review_status === "PEER_REVIEWED"
    && (source.quality_tier === "A" || source.quality_tier === "B")
    && source.support_relation === relation
    && source.verification === "VERIFIED_PRIMARY"
    && source.archived === true;
}
function qualifyingProject(source, relation) {
  return source.source_class === "PROJECT_PRIMARY"
    && source.support_relation === relation
    && source.verification === "VERIFIED_PRIMARY";
}

export function validateEpistemicTrace(value, { messageId } = {}) {
  nonempty(messageId, "messageId");
  exactKeys(value, ROOT_FIELDS, "epistemic trace");
  if (value.version !== "0.1") throw new EpistemicTraceError("unsupported epistemic trace version");
  oneOf(value.mode, new Set(["CLAIMS", "NO_SUBSTANTIVE_CLAIM"]), "mode");
  if (!Array.isArray(value.claims) || !Array.isArray(value.sources) || !Array.isArray(value.failures)) {
    throw new EpistemicTraceError("claims, sources and failures must be arrays");
  }

  if (value.mode === "NO_SUBSTANTIVE_CLAIM") {
    if (value.claims.length || value.sources.length || value.failures.length) {
      throw new EpistemicTraceError("NO_SUBSTANTIVE_CLAIM requires empty claims, sources and failures");
    }
    return Object.freeze({ version: "0.1", mode: value.mode, claims: Object.freeze([]), sources: Object.freeze([]), failures: Object.freeze([]) });
  }
  if (value.claims.length === 0) throw new EpistemicTraceError("CLAIMS mode requires at least one claim");

  const sources = value.sources.map((source, i) => {
    exactKeys(source, SOURCE_FIELDS, `sources[${i}]`);
    const out = {
      source_id: nonempty(source.source_id, "source.source_id"),
      source_class: oneOf(source.source_class, SOURCE_CLASSES, "source.source_class"),
      external_source_url: httpsUrl(source.external_source_url, "source.external_source_url"),
      rag_archive_url: nonempty(source.rag_archive_url, "source.rag_archive_url"),
      archive_sha256: nonempty(source.archive_sha256, "source.archive_sha256"),
      peer_review_status: oneOf(source.peer_review_status, PEER_REVIEW, "source.peer_review_status"),
      quality_tier: oneOf(source.quality_tier, QUALITY, "source.quality_tier"),
      support_relation: oneOf(source.support_relation, SUPPORT, "source.support_relation"),
      verification: oneOf(source.verification, VERIFICATION, "source.verification"),
      logical_work_id: nonempty(source.logical_work_id, "source.logical_work_id"),
    };
    if (out.source_class === "PROJECT_PRIMARY" && out.peer_review_status !== "NOT_APPLICABLE") {
      throw new EpistemicTraceError("PROJECT_PRIMARY source peer_review_status must be NOT_APPLICABLE");
    }
    if (out.source_class === "ACADEMIC" && out.peer_review_status === "NOT_APPLICABLE") {
      throw new EpistemicTraceError("ACADEMIC source must declare peer review status");
    }
    out.archived = archivePair(out);
    return Object.freeze(out);
  });
  if (new Set(sources.map((x) => x.source_id)).size !== sources.length) {
    throw new EpistemicTraceError("source_id must be unique");
  }
  const bySource = new Map(sources.map((x) => [x.source_id, x]));

  const claims = value.claims.map((claim, i) => {
    exactKeys(claim, CLAIM_FIELDS, `claims[${i}]`);
    const expectedId = `${messageId}#C${i + 1}`;
    if (claim.claim_id !== expectedId) throw new EpistemicTraceError(`claim_id must be contiguous and equal ${expectedId}`);
    const out = {
      claim_id: claim.claim_id,
      claim_type: oneOf(claim.claim_type, CLAIM_TYPES, "claim.claim_type"),
      disposition: oneOf(claim.disposition, DISPOSITIONS, "claim.disposition"),
      source_ids: stringList(claim.source_ids, "claim.source_ids"),
    };
    const refs = out.source_ids.map((id) => {
      const source = bySource.get(id);
      if (!source) throw new EpistemicTraceError(`claim references unknown source_id ${id}`);
      return source;
    });

    if (["PENDING", "EVIDENCE_GAP", "QUARANTINE"].includes(out.disposition)) return Object.freeze(out);
    if (refs.length === 0) throw new EpistemicTraceError(`${out.disposition} claim requires source evidence`);

    const qualifies = (relation) => out.claim_type === "PROJECT_STATE"
      ? refs.some((source) => qualifyingProject(source, relation))
      : refs.some((source) => qualifyingAcademic(source, relation));

    if (out.disposition === "SUPPORTED" && !qualifies("DIRECT")) {
      throw new EpistemicTraceError("SUPPORTED claim lacks qualifying direct evidence");
    }
    if (out.disposition === "CONTRADICTED" && !qualifies("CONTRADICTS")) {
      throw new EpistemicTraceError("CONTRADICTED claim lacks qualifying contradictory evidence");
    }
    if (out.disposition === "MIXED" && (!qualifies("DIRECT") || !qualifies("CONTRADICTS"))) {
      throw new EpistemicTraceError("MIXED claim requires qualifying direct and contradictory evidence");
    }
    return Object.freeze(out);
  });

  const failures = value.failures.map((failure, i) => {
    exactKeys(failure, FAILURE_FIELDS, `failures[${i}]`);
    const out = {
      failure_kind: oneOf(failure.failure_kind, FAILURE_KINDS, "failure.failure_kind"),
      source_id: nonempty(failure.source_id, "failure.source_id"),
      detail: nonempty(failure.detail, "failure.detail"),
    };
    if (out.source_id !== "NONE" && !bySource.has(out.source_id)) {
      throw new EpistemicTraceError(`failure references unknown source_id ${out.source_id}`);
    }
    return Object.freeze(out);
  });

  return Object.freeze({
    version: "0.1",
    mode: value.mode,
    claims: Object.freeze(claims),
    sources: Object.freeze(sources),
    failures: Object.freeze(failures),
  });
}

export function extractEpistemicTrace(messageText, { messageId } = {}) {
  if (typeof messageText !== "string") throw new EpistemicTraceError("message text must be a string");
  const matches = messageText.split(/\r?\n/).filter((line) => line.startsWith("epistemic_trace_json:"));
  if (matches.length !== 1) throw new EpistemicTraceError("message must contain exactly one epistemic_trace_json line");
  const raw = matches[0].slice("epistemic_trace_json:".length).trim();
  if (!raw) throw new EpistemicTraceError("epistemic_trace_json must not be empty");
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new EpistemicTraceError("epistemic_trace_json is not valid JSON"); }
  return validateEpistemicTrace(parsed, { messageId });
}
