import test from "node:test";
import assert from "node:assert/strict";
import { EpistemicTraceError, extractEpistemicTrace, validateEpistemicTrace } from "../core/epistemic_trace.js";

const MESSAGE = "MSG-001";
const SHA = "sha256:" + "a".repeat(64);

function academic(overrides = {}) {
  return {
    source_id: "doi:10.18653/v1/2023.emnlp-main.398",
    source_class: "ACADEMIC",
    external_source_url: "https://aclanthology.org/2023.emnlp-main.398/",
    rag_archive_url: "https://drive.google.com/file/d/example/view",
    archive_sha256: SHA,
    peer_review_status: "PEER_REVIEWED",
    quality_tier: "A",
    support_relation: "DIRECT",
    verification: "VERIFIED_PRIMARY",
    logical_work_id: "doi:10.18653/v1/2023.emnlp-main.398",
    ...overrides,
  };
}

function claim(overrides = {}) {
  return {
    claim_id: `${MESSAGE}#C1`,
    claim_type: "EMPIRICAL",
    disposition: "SUPPORTED",
    source_ids: ["doi:10.18653/v1/2023.emnlp-main.398"],
    ...overrides,
  };
}

function trace(overrides = {}) {
  return {
    version: "0.1",
    mode: "CLAIMS",
    claims: [claim()],
    sources: [academic()],
    failures: [],
    ...overrides,
  };
}

test("peer-reviewed direct archived evidence admits a supported claim", () => {
  const valid = validateEpistemicTrace(trace(), { messageId: MESSAGE });
  assert.equal(valid.claims[0].disposition, "SUPPORTED");
  assert.equal(valid.sources[0].archived, true);
});

test("supported external claim cannot use a preprint as the qualifying source", () => {
  assert.throws(() => validateEpistemicTrace(trace({
    sources: [academic({ peer_review_status: "PREPRINT" })],
  }), { messageId: MESSAGE }), /lacks qualifying direct evidence/);
});

test("supported external claim must have archived RAG bytes", () => {
  assert.throws(() => validateEpistemicTrace(trace({
    sources: [academic({ rag_archive_url: "PENDING_ARCHIVE", archive_sha256: "PENDING_ARCHIVE" })],
  }), { messageId: MESSAGE }), /lacks qualifying direct evidence/);
});

test("evidence gap is representable without citation padding", () => {
  const valid = validateEpistemicTrace(trace({
    claims: [claim({ disposition: "EVIDENCE_GAP", source_ids: [] })],
    sources: [],
  }), { messageId: MESSAGE });
  assert.equal(valid.claims[0].disposition, "EVIDENCE_GAP");
});

test("project state uses primary project provenance rather than fake academic support", () => {
  const sourceId = "project:github:commit:e3fa9e4";
  const valid = validateEpistemicTrace(trace({
    claims: [claim({ claim_type: "PROJECT_STATE", source_ids: [sourceId] })],
    sources: [{
      source_id: sourceId,
      source_class: "PROJECT_PRIMARY",
      external_source_url: "https://github.com/linuxremaster/Dao-Agentic/commit/e3fa9e447d12a0e443e5c911abe01e545ccea16d",
      rag_archive_url: "PENDING_ARCHIVE",
      archive_sha256: "PENDING_ARCHIVE",
      peer_review_status: "NOT_APPLICABLE",
      quality_tier: "A",
      support_relation: "DIRECT",
      verification: "VERIFIED_PRIMARY",
      logical_work_id: sourceId,
    }],
  }), { messageId: MESSAGE });
  assert.equal(valid.claims[0].claim_type, "PROJECT_STATE");
});

test("mixed claim requires qualifying support and contradiction", () => {
  const second = "doi:contradiction";
  const mixed = trace({
    claims: [claim({ disposition: "MIXED", source_ids: [academic().source_id, second] })],
    sources: [academic(), academic({
      source_id: second,
      logical_work_id: second,
      external_source_url: "https://example.edu/contradiction",
      rag_archive_url: "https://drive.google.com/file/d/contradiction/view",
      support_relation: "CONTRADICTS",
    })],
  });
  assert.equal(validateEpistemicTrace(mixed, { messageId: MESSAGE }).claims[0].disposition, "MIXED");

  mixed.sources[1].peer_review_status = "PREPRINT";
  assert.throws(() => validateEpistemicTrace(mixed, { messageId: MESSAGE }), /requires qualifying direct and contradictory evidence/);
});

test("no-substantive-claim mode is explicit and empty", () => {
  const valid = validateEpistemicTrace({
    version: "0.1", mode: "NO_SUBSTANTIVE_CLAIM", claims: [], sources: [], failures: [],
  }, { messageId: MESSAGE });
  assert.equal(valid.mode, "NO_SUBSTANTIVE_CLAIM");
});

test("claim ids are message-bound and contiguous", () => {
  assert.throws(() => validateEpistemicTrace(trace({
    claims: [claim({ claim_id: "OTHER#C1" })],
  }), { messageId: MESSAGE }), /claim_id must be contiguous/);
});

test("extractor requires exactly one machine-readable trace line", () => {
  const line = `epistemic_trace_json: ${JSON.stringify(trace())}`;
  assert.equal(extractEpistemicTrace(`message_id: ${MESSAGE}\n${line}\nbody: x\n`, { messageId: MESSAGE }).claims.length, 1);
  assert.throws(() => extractEpistemicTrace(`message_id: ${MESSAGE}\nbody: x\n`, { messageId: MESSAGE }), EpistemicTraceError);
  assert.throws(() => extractEpistemicTrace(`${line}\n${line}\n`, { messageId: MESSAGE }), /exactly one/);
});
