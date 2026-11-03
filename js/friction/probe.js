// Friction Probe deterministic core (WO-004 Phase B MVP slice).
//
// Pure: no network, filesystem, clock, environment, randomness or provider SDK. All facts enter
// through a frozen evidence packet (D0). Output is diagnostic evidence only:
//   FRICTION DETECTION != AUTHORITY; HIT != AUTHORITY TO ACT; NO_HIT != COMPLETE ACCOUNT;
//   NOT_RUN_MISSING_EVIDENCE is neither pass nor failure and never becomes NO_HIT.

import { AdmissionError } from "../core/events.js";
import { assertInert } from "./ingress.js";

export const VERDICTS = Object.freeze(["HIT", "NO_HIT", "NOT_RUN_MISSING_EVIDENCE"]);
export const REQUIRED_FIELDS = Object.freeze(["target_id", "mode", "locus", "verdict"]);
export const PROBE_VERSION = "0.1.0";
export const VERIFICATION_CEILING =
  "Deterministic screening of the supplied packet only. Not authority, not a complete account, " +
  "and not proof that the packet matches the world.";

const PACKET_FIELDS = ["packet_id", "schema_version", "scope", "available_evidence", "evidence", "provenance"];

function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function sameSet(a, b) {
  return Array.isArray(a) && a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x));
}

// ---- catalog checker ------------------------------------------------------

export function checkCatalog(catalog) {
  assertInert(catalog);
  const errors = [];
  if (!isObj(catalog)) return ["catalog must be an object"];
  if (catalog.schema_version !== "1.0") errors.push("unsupported schema_version");
  if (!sameSet(catalog.probe_results, VERDICTS)) errors.push("probe_results must equal HIT/NO_HIT/NOT_RUN_MISSING_EVIDENCE");
  if (!sameSet(catalog.finding_required_fields, REQUIRED_FIELDS)) errors.push("finding_required_fields must equal kernel minimum");
  const sources = isObj(catalog.evidence_sources) ? catalog.evidence_sources : {};
  const families = Array.isArray(catalog.families) ? catalog.families : [];
  const familyIds = families.map((f) => f.family_id);
  if (new Set(familyIds).size !== familyIds.length) errors.push("duplicate family_id");
  const targets = Array.isArray(catalog.targets) ? catalog.targets : [];
  const targetIds = targets.map((t) => t.target_id);
  if (new Set(targetIds).size !== targetIds.length) errors.push("duplicate target_id");
  for (const t of targets) {
    if (!familyIds.includes(t.family_id)) errors.push(`${t.target_id}: unknown family ${t.family_id}`);
    if (!["PROPOSED", "IMPLEMENTED_UNVALIDATED"].includes(t.status)) errors.push(`${t.target_id}: unknown status`);
    if (!Array.isArray(t.modes) || t.modes.length === 0) errors.push(`${t.target_id}: no evidence modes`);
    for (const m of t.modes || []) {
      const req = [...(m.requires_all || []), ...(m.requires_any || [])];
      if (req.length === 0) errors.push(`${t.target_id}/${m.mode}: no evidence requirements`);
      for (const s of req) if (!Object.hasOwn(sources, s)) errors.push(`${t.target_id}/${m.mode}: unknown evidence source ${s}`);
      if (t.status === "IMPLEMENTED_UNVALIDATED" && !(PROBES[t.target_id] && PROBES[t.target_id][m.mode])) {
        errors.push(`${t.target_id}/${m.mode}: no implementation`);
      }
    }
  }
  return errors;
}

// ---- packet admission -----------------------------------------------------

function admitPacket(packet, catalog) {
  assertInert(packet);
  if (!isObj(packet)) throw new AdmissionError("packet must be an object");
  const keys = Object.keys(packet);
  if (keys.length !== PACKET_FIELDS.length || !PACKET_FIELDS.every((k) => keys.includes(k))) {
    throw new AdmissionError(`packet must contain exactly ${PACKET_FIELDS.join(", ")}`);
  }
  if (typeof packet.packet_id !== "string" || packet.packet_id === "") throw new AdmissionError("packet_id must be a non-empty string");
  if (packet.schema_version !== "1.0") throw new AdmissionError("unsupported packet schema_version");
  if (!Array.isArray(packet.available_evidence)) throw new AdmissionError("available_evidence must be an array");
  if (!isObj(packet.evidence)) throw new AdmissionError("evidence must be an object");
  for (const s of [...packet.available_evidence, ...Object.keys(packet.evidence)]) {
    if (!Object.hasOwn(catalog.evidence_sources, s)) throw new AdmissionError(`unknown evidence source ${s}`);
  }
}

// A source is eligible only if declared available AND present with usable (non-empty) content.
function eligible(packet, source) {
  if (!packet.available_evidence.includes(source)) return false;
  const v = packet.evidence[source];
  return isObj(v) && Object.keys(v).length > 0;
}

// ---- probes (pure; each returns [{locus, verdict, observed, expected, evidence_refs}]) ----

function notRun(locus, why) {
  return { locus, verdict: "NOT_RUN_MISSING_EVIDENCE", observed: { missing: why }, expected: null, evidence_refs: [] };
}

function fp01ChannelAuthority(ev, packetLocus) {
  const classes = ev.authority_policy.action_classes;
  const requests = ev.relay_snapshot.requests;
  if (!isObj(classes)) return [notRun(packetLocus, "authority_policy.action_classes")];
  if (!Array.isArray(requests)) return [notRun(packetLocus, "relay_snapshot.requests")];
  if (requests.length === 0) {
    return [{ locus: packetLocus, verdict: "NO_HIT", observed: { requests: 0 }, expected: null, evidence_refs: ["relay_snapshot"] }];
  }
  return requests.map((r) => {
    const locus = `action:${r.action_class}:${r.request_id}`;
    if (typeof r.channel !== "string" || typeof r.action_class !== "string") return notRun(locus, "request channel/action_class");
    const rule = classes[r.action_class];
    const permitted = isObj(rule) && Array.isArray(rule.permitted_channels) ? rule.permitted_channels : null;
    const hit = permitted === null || !permitted.includes(r.channel);
    return {
      locus,
      verdict: hit ? "HIT" : "NO_HIT",
      observed: { channel: r.channel, action_class: r.action_class },
      expected: { permitted_channels: permitted === null ? "NOT ESTABLISHED BY POLICY" : permitted },
      evidence_refs: ["authority_policy", `relay_snapshot:${r.request_id}`],
    };
  });
}

function fp03BaseAncestry(ev, packetLocus) {
  const refs = ev.repository_snapshot.refs;
  const ancestry = Array.isArray(ev.repository_snapshot.ancestry) ? ev.repository_snapshot.ancestry : [];
  const branches = ev.work_order.branches;
  if (!Array.isArray(branches) || branches.length === 0) return [notRun(packetLocus, "work_order.branches")];
  if (!isObj(refs)) return [notRun(packetLocus, "repository_snapshot.refs")];
  return branches.map((b) => {
    const locus = `git-ref:${b.branch}`;
    const head = refs[b.branch];
    if (typeof head !== "string") return notRun(locus, `repository_snapshot.refs[${b.branch}]`);
    if (typeof b.required_base !== "string") return notRun(locus, "work_order required_base");
    const base = { head, required_base: b.required_base };
    if (head === b.required_base) {
      return { locus, verdict: "NO_HIT", observed: { ...base, is_ancestor: true }, expected: { contains: b.required_base }, evidence_refs: ["repository_snapshot", "work_order"] };
    }
    const fact = ancestry.find((a) => a.ancestor === b.required_base && a.descendant === head);
    if (!fact || typeof fact.is_ancestor !== "boolean") return notRun(locus, `ancestry ${b.required_base} -> ${head}`);
    return {
      locus,
      verdict: fact.is_ancestor ? "NO_HIT" : "HIT",
      observed: { ...base, is_ancestor: fact.is_ancestor },
      expected: { contains: b.required_base },
      evidence_refs: ["repository_snapshot", "work_order"],
    };
  });
}

function fp07SingleResponse(ev, packetLocus) {
  const parents = ev.relay_policy.single_response_parents;
  const messages = ev.relay_snapshot.messages;
  if (!Array.isArray(parents) || parents.length === 0) return [notRun(packetLocus, "relay_policy.single_response_parents")];
  if (!Array.isArray(messages)) return [notRun(packetLocus, "relay_snapshot.messages")];
  const superseded = new Set(messages
    .filter((m) => typeof m.supersedes === "string" && m.supersedes !== "")
    .map((m) => m.supersedes));
  return parents.map((parent) => {
    const replies = messages
      .filter((m) => m.parent_message_id === parent && !superseded.has(m.message_id))
      .map((m) => ({ message_id: m.message_id, file: m.file === undefined ? null : m.file }))
      .sort((a, b) => (String(a.file) < String(b.file) ? -1 : String(a.file) > String(b.file) ? 1 : 0));
    const ids = replies.map((r) => r.message_id);
    const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].sort();
    // Observation only: the probe records multiplicity and shared message_ids; it states no cause.
    return {
      locus: `relay:${parent}`,
      verdict: replies.length > 1 ? "HIT" : "NO_HIT",
      observed: { reply_count: replies.length, replies, duplicate_message_ids: duplicateIds, cause: "NOT ESTABLISHED" },
      expected: { max_replies: 1 },
      evidence_refs: ["relay_policy", "relay_snapshot"],
    };
  });
}

export const PROBES = Object.freeze({
  FP01: Object.freeze({ channel_authority_check: fp01ChannelAuthority }),
  FP03: Object.freeze({ base_ancestry_check: fp03BaseAncestry }),
  FP07: Object.freeze({ single_response_check: fp07SingleResponse }),
});

// ---- screening ------------------------------------------------------------

function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function screen(packet, catalog) {
  assertInert(catalog);
  const catalogErrors = checkCatalog(catalog);
  if (catalogErrors.length) throw new AdmissionError(`invalid catalog: ${catalogErrors[0]}`);
  admitPacket(packet, catalog);
  const packetLocus = `packet:${packet.packet_id}`;
  const findings = [];
  for (const t of catalog.targets) {
    if (t.status !== "IMPLEMENTED_UNVALIDATED") continue;
    const mode = t.modes.find((m) =>
      (m.requires_all || []).every((s) => eligible(packet, s)) &&
      ((m.requires_any || []).length === 0 || m.requires_any.some((s) => eligible(packet, s)))
    );
    const raw = mode
      ? PROBES[t.target_id][mode.mode](packet.evidence, packetLocus)
      : [notRun(packetLocus, t.modes.map((m) => (m.requires_all || []).filter((s) => !eligible(packet, s)).join("+")).join(" | "))];
    for (const r of raw) {
      findings.push({
        finding_id: `${t.target_id}|${mode ? mode.mode : "none"}|${r.locus}`,
        target_id: t.target_id,
        family_id: t.family_id,
        mode: mode ? mode.mode : null,
        locus: r.locus,
        verdict: r.verdict,
        observed: r.observed,
        expected: r.expected,
        evidence_refs: r.evidence_refs,
        probe_version: PROBE_VERSION,
      });
    }
  }
  findings.sort((a, b) => cmp(a.target_id, b.target_id) || cmp(a.locus, b.locus));
  for (const f of findings) if (!VERDICTS.includes(f.verdict)) throw new Error("verdict outside closed set");
  const counts = Object.fromEntries(VERDICTS.map((v) => [v, findings.filter((f) => f.verdict === v).length]));
  return {
    packet_id: packet.packet_id,
    catalog_revision: catalog.record_revision,
    verification_ceiling: VERIFICATION_CEILING,
    counts,
    findings,
  };
}
