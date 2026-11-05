import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractCandidateClaims,
  evaluateClaimCoverage,
  evaluateSearchCoverage,
} from "../core/coverage.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const bundleRoot = path.join(root, "contracts", "v1.3");
const fixtures = JSON.parse(await readFile(path.join(root, "contracts/v1.3/fixtures.json"), "utf8")).fixtures;
const fixture = (id) => fixtures.find((x) => x.id === id);

for (const id of ["COV-01", "COV-02", "COV-03"]) {
  test(`${id}: deterministic candidate decomposition meets normative fixed-fixture recall`, async () => {
    const f = fixture(id);
    const payload = JSON.parse(await readFile(path.join(bundleRoot, f.input.payload_file), "utf8"));
    const candidates = extractCandidateClaims(payload.text);
    const result = evaluateClaimCoverage({
      risk: payload.risk,
      referenceClaims: payload.seeded_claims,
      candidates,
      fixedNormativeFixture: true,
    });
    assert.equal(result.recall, f.expected.required_recall);
    assert.deepEqual([...result.detected_ids].sort(), [...f.expected.must_detect].sort());
    assert.equal(result.missed_ids.length, 0);
    assert.equal(result.passed, true);
  });
}

test("coverage verifier fails closed when a material R3 candidate is omitted", async () => {
  const f = fixture("COV-03");
  const payload = JSON.parse(await readFile(path.join(bundleRoot, f.input.payload_file), "utf8"));
  const candidates = extractCandidateClaims(payload.text).filter((c) => !/private key/i.test(c.text));
  const result = evaluateClaimCoverage({ risk: payload.risk, referenceClaims: payload.seeded_claims, candidates, fixedNormativeFixture: true });
  assert.equal(result.passed, false);
  assert.equal(result.disposition, "HOLD");
  assert.ok(result.missed_ids.includes("c5"));
});

test("COV-04: R2 single non-authoritative index is incomplete", () => {
  const f = fixture("COV-04");
  const result = evaluateSearchCoverage({
    risk: f.input.risk,
    retrievalSources: f.input.retrieval_sources,
    authoritativeComprehensiveException: f.input.authoritative_comprehensive_exception,
  });
  assert.equal(result.search_coverage, f.expected.search_coverage);
  assert.equal(result.supported_unqualified, f.expected.supported_unqualified);
});

test("COV-05: R3 without citation chaining/domain equivalent holds", () => {
  const f = fixture("COV-05");
  const result = evaluateSearchCoverage({
    risk: f.input.risk,
    retrievalSources: f.input.retrieval_sources,
    citationChainingPass: f.input.citation_chaining_pass,
    domainEquivalent: f.input.domain_equivalent,
  });
  assert.equal(result.search_coverage, f.expected.search_coverage);
  assert.equal(result.decision, f.expected.decision);
});

test("R3 search coverage passes only with two sources plus chaining/domain equivalent", () => {
  assert.equal(evaluateSearchCoverage({ risk: "R3_HIGH", retrievalSources: ["A", "B"], citationChainingPass: true }).complete, true);
  assert.equal(evaluateSearchCoverage({ risk: "R3_HIGH", retrievalSources: ["A", "B"], domainEquivalent: true }).complete, true);
  assert.equal(evaluateSearchCoverage({ risk: "R3_HIGH", retrievalSources: ["A", "B"] }).complete, false);
});
