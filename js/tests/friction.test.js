import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { AdmissionError } from "../core/events.js";
import { assertInert, parseInert } from "../friction/ingress.js";
import { VERDICTS, checkCatalog, screen } from "../friction/probe.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const load = async (rel) => readFile(path.join(root, rel), "utf8");

const catalogText = await load("contracts/friction/friction_catalog.json");
const catalog = parseInert(catalogText);
const freshCatalog = () => JSON.parse(catalogText);
const real = parseInert(await load("contracts/friction/fixtures/real_incidents.json"));
const synthetic = parseInert(await load("contracts/friction/fixtures/synthetic_controls.json"));

const triples = (result) => result.findings.map((f) => `${f.target_id} ${f.locus} ${f.verdict}`).sort();
const expectedTriples = (c) => c.expected.map((e) => `${e.target_id} ${e.locus} ${e.verdict}`).sort();

test("catalog passes its checker", () => {
  assert.deepEqual(checkCatalog(catalog), []);
});

for (const c of [...real.cases, ...synthetic.cases]) {
  test(`fixture: ${c.name}`, () => {
    const result = screen(c.packet, catalog);
    assert.deepEqual(triples(result), expectedTriples(c));
    for (const f of result.findings) {
      for (const k of ["target_id", "mode", "locus", "verdict"]) assert.ok(k in f, `missing ${k}`);
      assert.ok(VERDICTS.includes(f.verdict));
    }
  });
}

test("determinism: repeated identical input gives identical output", () => {
  for (const c of [...real.cases, ...synthetic.cases]) {
    const a = JSON.stringify(screen(c.packet, catalog));
    const b = JSON.stringify(screen(JSON.parse(JSON.stringify(c.packet)), catalog));
    assert.equal(a, b);
  }
});

test("duplicate delivery: screening the same packet twice is idempotent and states no cause", () => {
  const packet = real.cases[0].packet;
  const first = screen(packet, catalog);
  const second = screen(packet, catalog);
  assert.deepEqual(first, second);
  const fp07 = first.findings.find((f) => f.target_id === "FP07");
  assert.equal(fp07.observed.reply_count, 2);
  assert.deepEqual(fp07.observed.duplicate_message_ids, ["AUDIT-RESULT-003C-004"]);
  assert.equal(fp07.observed.cause, "NOT ESTABLISHED");
});

test("missing evidence never collapses to NO_HIT", () => {
  const s3 = synthetic.cases.find((c) => c.packet.packet_id === "SYN-S3");
  const result = screen(s3.packet, catalog);
  assert.equal(result.counts.NO_HIT, 0);
  assert.equal(result.counts.HIT, 0);
  assert.equal(result.counts.NOT_RUN_MISSING_EVIDENCE, result.findings.length);
});

test("output carries the verification ceiling", () => {
  const result = screen(synthetic.cases[0].packet, catalog);
  assert.match(result.verification_ceiling, /Not authority/);
});

// ---- ingress negative controls --------------------------------------------

function basePacket() {
  return JSON.parse(JSON.stringify(synthetic.cases[1].packet));
}

test("ingress: getter is rejected without being executed", () => {
  const packet = basePacket();
  let runs = 0;
  Object.defineProperty(packet.evidence.relay_policy, "single_response_parents", {
    get() { runs += 1; return ["SYN-REQ-A"]; },
    enumerable: true,
  });
  assert.throws(() => screen(packet, catalog), (e) => e instanceof AdmissionError && /accessor/.test(e.message));
  assert.equal(runs, 0);
});

test("ingress: setter-only accessor is rejected", () => {
  const value = {};
  Object.defineProperty(value, "x", { set() {}, enumerable: true });
  assert.throws(() => assertInert(value), /accessor/);
});

test("ingress: symbol-keyed property is rejected", () => {
  const packet = basePacket();
  packet.evidence.relay_snapshot[Symbol("hidden")] = "x";
  assert.throws(() => screen(packet, catalog), (e) => e instanceof AdmissionError && /symbol/.test(e.message));
});

test("ingress: non-enumerable, class instance, function, undefined, NaN, cycle, sparse array are rejected", () => {
  const ne = {};
  Object.defineProperty(ne, "x", { value: 1, enumerable: false });
  assert.throws(() => assertInert(ne), /non-enumerable/);
  assert.throws(() => assertInert(new Date(0)), /non-plain/);
  assert.throws(() => assertInert({ f() {} }), /non-JSON/);
  assert.throws(() => assertInert({ u: undefined }), /non-JSON/);
  assert.throws(() => assertInert({ n: Number.NaN }), /non-finite/);
  const cyc = {};
  cyc.self = cyc;
  assert.throws(() => assertInert(cyc), /cycle/);
  assert.throws(() => assertInert([1, , 3]), /sparse/);
});

test("ingress: JSON text entry is inert by construction", () => {
  const packet = parseInert(JSON.stringify(basePacket()));
  assert.deepEqual(triples(screen(packet, catalog)), expectedTriples(synthetic.cases[1]));
  assert.throws(() => parseInert("{not json"), AdmissionError);
});

test("ingress: unknown evidence source and extra packet field are rejected", () => {
  const p1 = basePacket();
  p1.available_evidence.push("model_recollection");
  assert.throws(() => screen(p1, catalog), /unknown evidence source/);
  const p2 = basePacket();
  p2.extra = 1;
  assert.throws(() => screen(p2, catalog), /packet must contain exactly/);
});

// ---- catalog negative controls (each fails for its own reason) -------------

const mutations = [
  ["extra verdict value", (c) => c.probe_results.push("PASS"), /probe_results/],
  ["missing NOT_RUN_MISSING_EVIDENCE", (c) => c.probe_results.pop(), /probe_results/],
  ["unknown evidence source", (c) => c.targets[0].modes[0].requires_all.push("vibes"), /unknown evidence source vibes/],
  ["unknown family", (c) => { c.targets[0].family_id = "FF9"; }, /unknown family FF9/],
  ["duplicate target", (c) => c.targets.push(JSON.parse(JSON.stringify(c.targets[0]))), /duplicate target_id/],
  ["finding fields weakened", (c) => c.finding_required_fields.pop(), /finding_required_fields/],
  ["mode without requirements", (c) => { c.targets[0].modes[0].requires_all = []; }, /no evidence requirements/],
  ["implemented target without code", (c) => { c.targets[0].modes[0].mode = "imaginary"; }, /no implementation/],
];

for (const [name, mutate, reason] of mutations) {
  test(`catalog negative control: ${name}`, () => {
    const c = freshCatalog();
    mutate(c);
    const errors = checkCatalog(c);
    assert.ok(errors.length >= 1);
    assert.match(errors[0], reason);
    assert.throws(() => screen(basePacket(), c), /invalid catalog/);
  });
}
