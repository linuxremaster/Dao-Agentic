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
    const b = JSON.stringify(screen(parseInert(JSON.stringify(c.packet)), catalog));
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
  assert.throws(() => screen(packet, catalog), (e) => e instanceof AdmissionError && /untrusted in-memory/.test(e.message));
  assert.equal(runs, 0);
});

test("ingress: setter-only accessor is rejected", () => {
  const value = {};
  Object.defineProperty(value, "x", { set() {}, enumerable: true });
  assert.throws(() => assertInert(value), /untrusted in-memory/);
});

test("ingress: symbol-keyed property is rejected", () => {
  const packet = basePacket();
  packet.evidence.relay_snapshot[Symbol("hidden")] = "x";
  assert.throws(() => screen(packet, catalog), (e) => e instanceof AdmissionError && /untrusted in-memory/.test(e.message));
});

test("ingress: non-enumerable, class instance, function, undefined, NaN, cycle, sparse array are rejected", () => {
  const ne = {};
  Object.defineProperty(ne, "x", { value: 1, enumerable: false });
  assert.throws(() => assertInert(ne), /untrusted in-memory/);
  assert.throws(() => assertInert(new Date(0)), /untrusted in-memory/);
  assert.throws(() => assertInert({ f() {} }), /untrusted in-memory/);
  assert.throws(() => assertInert({ u: undefined }), /untrusted in-memory/);
  assert.throws(() => assertInert({ n: Number.NaN }), /untrusted in-memory/);
  const cyc = {};
  cyc.self = cyc;
  assert.throws(() => assertInert(cyc), /untrusted in-memory/);
  assert.throws(() => assertInert([1, , 3]), /untrusted in-memory/);
});

test("ingress: JSON text entry is inert by construction", () => {
  const packet = parseInert(JSON.stringify(basePacket()));
  assert.deepEqual(triples(screen(packet, catalog)), expectedTriples(synthetic.cases[1]));
  assert.throws(() => parseInert("{not json"), AdmissionError);
});

test("ingress: unknown evidence source and extra packet field are rejected", () => {
  const p1 = basePacket();
  p1.available_evidence.push("model_recollection");
  assert.throws(() => screen(parseInert(JSON.stringify(p1)), catalog), /unknown evidence source/);
  const p2 = basePacket();
  p2.extra = 1;
  assert.throws(() => screen(parseInert(JSON.stringify(p2)), catalog), /packet must contain exactly/);
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
    const errors = checkCatalog(parseInert(JSON.stringify(c)));
    assert.ok(errors.length >= 1);
    assert.match(errors[0], reason);
    assert.throws(() => screen(parseInert(JSON.stringify(basePacket())), parseInert(JSON.stringify(c))), /invalid catalog/);
  });
}

// AUDIT-RESULT-004B-001 regression controls, written before the fixes.
test("audit: untrusted Proxy ingress rejects without executing traps", () => {
  let traps = 0;
  const proxy = new Proxy(basePacket(), {
    getPrototypeOf(target) { traps += 1; return Reflect.getPrototypeOf(target); },
    ownKeys(target) { traps += 1; return Reflect.ownKeys(target); },
    get(target, key) { traps += 1; return Reflect.get(target, key); },
    getOwnPropertyDescriptor(target, key) { traps += 1; return Reflect.getOwnPropertyDescriptor(target, key); },
  });
  assert.throws(() => screen(proxy, catalog), AdmissionError);
  assert.equal(traps, 0);
});

test("audit: inherited evidence source names reject in packet and catalog", () => {
  for (const name of ["toString", "constructor", "__proto__"]) {
    const packet = basePacket();
    packet.available_evidence.push(name);
    assert.throws(() => screen(parseInert(JSON.stringify(packet)), catalog), /unknown evidence source/);
    const c = freshCatalog();
    c.targets[0].modes[0].requires_all.push(name);
    assert.ok(checkCatalog(parseInert(JSON.stringify(c))).some((e) => e.includes("unknown evidence source")));
  }
});

test("audit: FP07 counts active replies, not correction-chain history", () => {
  const packet = basePacket();
  const parent = packet.evidence.relay_policy.single_response_parents[0];
  packet.evidence.relay_snapshot.messages = [
    { message_id: "a", parent_message_id: parent },
    { message_id: "b", parent_message_id: parent, supersedes: "a" },
    { message_id: "c", parent_message_id: parent, supersedes: "b" },
  ];
  const finding = screen(parseInert(JSON.stringify(packet)), catalog).findings.find((f) => f.target_id === "FP07");
  assert.equal(finding.verdict, "NO_HIT");
  assert.equal(finding.observed.reply_count, 1);
  assert.deepEqual(finding.observed.replies.map((m) => m.message_id), ["c"]);
});

test("audit: Proxy wrappers, nested inputs and revoked Proxies never run traps", () => {
  let runs = 0;
  const handler = Object.fromEntries(["get", "getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"]
    .map((name) => [name, () => { runs += 1; throw new Error("trap executed"); }]));
  const wrapper = new Proxy(parseInert(JSON.stringify(basePacket())), handler);
  const nested = basePacket();
  nested.evidence.relay_snapshot = new Proxy({}, handler);
  const revoked = Proxy.revocable({}, handler);
  revoked.revoke();
  for (const value of [wrapper, nested, revoked.proxy]) {
    assert.throws(() => assertInert(value), AdmissionError);
    assert.throws(() => screen(value, catalog), AdmissionError);
    assert.throws(() => checkCatalog(value), AdmissionError);
    assert.throws(() => screen(parseInert(JSON.stringify(basePacket())), value), AdmissionError);
    assert.throws(() => parseInert(value), AdmissionError);
  }
  assert.equal(runs, 0);
});

test("audit: parsed provenance cannot be invalidated by mutation or forged by freezing", () => {
  const packet = parseInert(JSON.stringify(basePacket()));
  assert.ok(Object.isFrozen(packet));
  assert.ok(Object.isFrozen(packet.evidence.relay_snapshot.messages));
  assert.throws(() => { packet.evidence.relay_snapshot = new Proxy({}, {}); }, TypeError);
  assert.throws(() => assertInert(Object.freeze(basePacket())), AdmissionError);
  assertInert(packet.evidence.relay_snapshot);
  screen(packet, catalog);
});

test("audit: FP07 correction order is irrelevant and independent active replies still HIT", () => {
  const packet = basePacket();
  const parent = packet.evidence.relay_policy.single_response_parents[0];
  const messages = [
    { message_id: "a", parent_message_id: parent },
    { message_id: "b", parent_message_id: parent, supersedes: "a" },
    { message_id: "c", parent_message_id: parent, supersedes: "b" },
    { message_id: "independent", parent_message_id: parent },
  ];
  const results = [];
  for (const order of [messages, [...messages].reverse()]) {
    packet.evidence.relay_snapshot.messages = order;
    const f = screen(parseInert(JSON.stringify(packet)), catalog).findings.find((f) => f.target_id === "FP07");
    assert.equal(f.verdict, "HIT");
    assert.equal(f.observed.reply_count, 2);
    results.push(f);
  }
  // Membership/count is independent of snapshot order even when file keys are absent.
  assert.deepEqual(results.map((f) => f.observed.replies.map((r) => r.message_id).sort()), [["c", "independent"], ["c", "independent"]]);
});

// AUDIT-RESULT-004B-003: these controls precede the corresponding fixes.
test("audit004 C1: FP01 malformed requests yield missing evidence without exceptions", () => {
  const invalid = [null, false, 42, "request", [], {}, { request_id: null }, { request_id: 7 }];
  for (const value of invalid) {
    const packet = JSON.parse(JSON.stringify(synthetic.cases[0].packet));
    packet.evidence.relay_snapshot.requests = [value !== null && typeof value === "object" && !Array.isArray(value)
      ? { action_class: "branch_commit", channel: "bus", ...value } : value];
    const findings = screen(parseInert(JSON.stringify(packet)), catalog).findings.filter((f) => f.target_id === "FP01");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].verdict, "NOT_RUN_MISSING_EVIDENCE", JSON.stringify(value));
  }
});

test("audit004 C1: FP07 malformed messages yield missing evidence without exceptions", () => {
  for (const value of [null, false, 42, "message", [], {}, { message_id: null }, { message_id: 7 }]) {
    const packet = basePacket();
    const parent = packet.evidence.relay_policy.single_response_parents[0];
    const entry = value !== null && typeof value === "object" && !Array.isArray(value)
      ? { parent_message_id: parent, ...value } : value;
    // An invalid entry must not be ignored even alongside otherwise usable evidence.
    packet.evidence.relay_snapshot.messages.push(entry);
    const findings = screen(parseInert(JSON.stringify(packet)), catalog).findings.filter((f) => f.target_id === "FP07");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].verdict, "NOT_RUN_MISSING_EVIDENCE", JSON.stringify(value));
  }
});

test("audit004 C2: a foreign parent's supersedes link cannot hide active replies", () => {
  const packet = basePacket();
  const parent = packet.evidence.relay_policy.single_response_parents[0];
  packet.evidence.relay_policy.single_response_parents.push("other");
  packet.evidence.relay_snapshot.messages = [
    { message_id: "a", parent_message_id: parent },
    { message_id: "b", parent_message_id: parent },
    { message_id: "foreign", parent_message_id: "other", supersedes: "a" },
  ];
  const findings = screen(parseInert(JSON.stringify(packet)), catalog).findings.filter((f) => f.target_id === "FP07");
  const target = findings.find((f) => f.locus === `relay:${parent}`);
  assert.equal(target.verdict, "HIT");
  assert.equal(target.observed.reply_count, 2);
  assert.deepEqual(target.observed.replies.map((r) => r.message_id).sort(), ["a", "b"]);
  const other = findings.find((f) => f.locus === "relay:other");
  assert.equal(other.verdict, "NO_HIT");
  assert.equal(other.observed.reply_count, 1);
});
