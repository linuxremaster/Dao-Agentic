import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CanonicalizationError,
  canonicalize,
  canonicalizeRawJson,
  canonicalRecordForHash,
  recordHash,
} from "../core/c14n_v13.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtures = JSON.parse(await readFile(path.join(root, "contracts/v1.3/fixtures.json"), "utf8")).fixtures;
const golden = JSON.parse(await readFile(path.join(root, "contracts/v1.3/c14n_golden_vectors.json"), "utf8"));
const fixture = (id) => fixtures.find((x) => x.id === id);
const vector = (id) => [...golden.accepted, ...golden.rejected_raw_json].find((x) => x.id === id);

for (const id of ["CAN-01", "CAN-02", "CAN-03"]) {
  test(`${id}: strict raw ingestion rejects adversarial JSON before map collapse`, () => {
    const f = fixture(id);
    const v = vector(f.input.vector);
    assert.throws(() => canonicalizeRawJson(v.raw_json), (err) => {
      assert.ok(err instanceof CanonicalizationError);
      assert.equal(err.reason, f.expected.reason);
      return true;
    });
  });
}

test("CAN-04: canonically equivalent string values remain byte-distinct", () => {
  const f = fixture("CAN-04");
  const v = vector(f.input.vector);
  const text = canonicalize(v.input);
  assert.equal(text, v.canonical_utf8);
  assert.notEqual(v.input.a, v.input.b);
  assert.equal(f.expected.preserve_distinct_values, true);
});

test("CAN-05: exact decimal text and scale are preserved", () => {
  const f = fixture("CAN-05");
  const v = vector(f.input.vector);
  assert.equal(canonicalize(v.input), v.canonical_utf8);
  assert.equal(v.input.decimal.text, f.expected.exact_text);
});

test("CAN-06: genesis vector matches exact canonical bytes and SHA-256", () => {
  const f = fixture("CAN-06");
  const v = vector(f.input.vector);
  assert.equal(canonicalRecordForHash(v.input), v.canonical_utf8);
  assert.equal(recordHash(v.input), f.expected.sha256);
  assert.equal(v.input.local_sequence, f.expected.local_sequence);
  assert.equal(v.input.previous_hash, f.expected.previous_hash);
});

test("CAN-07: successor includes previous_hash once and excludes record_hash", () => {
  const f = fixture("CAN-07");
  const v = vector(f.input.vector);
  assert.equal(recordHash(v.input), f.expected.sha256);
  const withRecordHash = { ...v.input, record_hash: "f".repeat(64) };
  const canonical = canonicalRecordForHash(withRecordHash);
  assert.equal(canonical, v.canonical_utf8);
  assert.equal((canonical.match(/\"previous_hash\"/g) ?? []).length, 1);
  assert.equal(canonical.includes("record_hash"), f.expected.record_hash_in_canonical);
});

test("direct-object canonicalization rejects NFC-colliding keys too", () => {
  const obj = { "é": 1, "e\u0301": 2 };
  assert.throws(() => canonicalize(obj), (err) => err.reason === "NFC_COLLIDING_PROPERTY_NAMES");
});

test("non-integer JSON numbers are rejected in SOCRATES-C14N-2", () => {
  assert.throws(() => canonicalizeRawJson('{"x":1.25}'), (err) => err.reason === "NON_INTEGER_JSON_NUMBER");
});
