import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { observe, material, replay, parse, hex, Hold } from "./candidates.js";
import { emit, fixtures, history } from "./emit.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const python = JSON.parse(execFileSync("python", ["-m", "experiments.numeric_contract.python.emit"], { cwd: root, encoding: "utf8" }));
const javascript = await emit();
const rows = new Map(javascript.observations.map((row) => [row.name, row]));

test("N/J/D compare actual Python and JS emitted bytes and digests", () => {
  for (let i = 0; i < fixtures.length; i += 1) {
    for (const candidate of "NJD") {
      const py = python.observations[i][candidate];
      const js = javascript.observations[i][candidate];
      assert.equal(python.observations[i].name, fixtures[i].name);
      const expected = fixtures[i].hold_candidates.includes(candidate) ? "HOLD" : "ok";
      assert.equal(py.result, expected, `${fixtures[i].name}/${candidate}/Python`);
      assert.equal(js.result, expected, `${fixtures[i].name}/${candidate}/JS`);
      if (expected === "ok") {
        const bytes = (text) => Uint8Array.from(text.match(/../g), (byte) => Number.parseInt(byte, 16));
        assert.deepEqual(bytes(py.canonical_hex), bytes(js.canonical_hex));
        assert.equal(py.event_sha256, js.event_sha256);
        assert.equal(py.payload_sha256, js.payload_sha256);
      }
    }
  }
});

test("numeric lexemes survive before native parsing; N emits exact tags", async () => {
  for (const [name, expected] of [["payload_high_precision", "1.0000000000000000000001"], ["payload_unsafe_integer", "9007199254740993"]]) {
    const raw = fixtures.find((fixture) => fixture.name === name).raw_event_json;
    assert.equal(parse(raw).event.payload.value.text, expected);
    const emitted = await observe("N", raw);
    assert.equal(JSON.parse(emitted.canonical_text).payload.value.$numeric.text, expected);
  }
});

test("JCS_SUBSET_PROBE normalizes values and explicitly holds unsupported numbers", () => {
  for (const [a, b] of [["payload_lexical_one", "payload_integer_one"], ["payload_negative_zero", "payload_zero"], ["raw_lexical_a", "raw_lexical_b"]]) {
    assert.equal(rows.get(a).J.canonical_hex, rows.get(b).J.canonical_hex);
    assert.equal(rows.get(a).J.event_sha256, rows.get(b).J.event_sha256);
    assert.notEqual(rows.get(a).N.canonical_hex, rows.get(b).N.canonical_hex);
  }
  for (const name of ["payload_high_precision", "payload_unsafe_integer", "payload_inexact_tenth", "payload_exponent"]) {
    assert.equal(rows.get(name).J.result, "HOLD");
  }
  for (const name of ["explicit_integer", "explicit_decimal", "explicit_nested"]) assert.equal(rows.get(name).J.result, "ok");
});

test("D commits to exact UTF-8 payload bytes and shared envelope only", async () => {
  const raw = fixtures.find((fixture) => fixture.name === "raw_lexical_a").raw_event_json;
  const a = await material("D", raw);
  const expectedDigest = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode('{ "value" : 1e0 }'))));
  assert.equal(a.payloadDigest, expectedDigest);
  assert.equal(JSON.parse(new TextDecoder().decode(a.encoded)).payload_sha256, expectedDigest);
  assert.deepEqual((await material("D", ` \n${raw}\t`)).encoded, a.encoded);
  assert.notEqual(rows.get("raw_lexical_a").D.payload_sha256, rows.get("raw_lexical_b").D.payload_sha256);
  assert.notEqual(rows.get("raw_lexical_a").D.event_sha256, rows.get("raw_lexical_b").D.event_sha256);
});

test("replay is deterministic and matches actual Python states and hashes", async () => {
  for (const candidate of "NJD") {
    const a = await replay(candidate, history());
    assert.equal(a.status, "DONE");
    assert.equal(a.last_sequence, 6);
    assert.deepEqual(a, await replay(candidate, history()));
    assert.deepEqual(a, python.replays[candidate]);
    assert.notEqual(a.history_hash, (await replay(candidate, history('{"value":1.25}'))).history_hash);
  }
});

test("replay rejects duplicate IDs, gaps, and invalid transitions", async () => {
  const source = history();
  for (const candidate of "NJD") {
    for (const bad of [[source[0], source[2]], [source[0], source[1].replace('"h2"', '"h1"')], [source[1]]]) {
      await assert.rejects(() => replay(candidate, bad));
    }
  }
});

test("lossless parser holds ambiguous and unsupported JSON", async () => {
  for (const raw of ['{"a":1,}', '{"a":01}', '[1,]', '{"a":Infinity}', '{"a":1} trailing', '"\\ud800"']) {
    assert.throws(() => parse(raw), Hold);
  }
  for (const candidate of "NJD") {
    assert.equal((await observe(candidate, "[".repeat(66) + "0" + "]".repeat(66))).result, "HOLD");
  }
});

test("browser-targeted module has no Node runtime dependencies", async () => {
  const source = await readFile(new URL("./candidates.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /(?:from\s+["']node:|require\s*\(|\bprocess\b|\bBuffer\b)/);
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert.deepEqual(imports, ["../../../js/core/events.js", "../../../js/core/predicates.js"]);
});
