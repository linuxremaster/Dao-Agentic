import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { AdmissionError, canonicalEventText } from "../core/events.js";
import { initialState, reduce, replay } from "../core/reducer.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const cases = JSON.parse(await readFile(path.join(root, "contracts/conformance/cases.json"), "utf8"));
const numeric = JSON.parse(await readFile(path.join(root, "contracts/conformance/numeric-boundaries.json"), "utf8"));

for (const fixture of cases.cases) {
  test(`conformance: ${fixture.name}`, async () => {
    const expected = fixture.expected;
    if (expected.result === "reject") {
      await assert.rejects(() => replay(fixture.events), (error) => {
        assert.ok(error instanceof AdmissionError);
        assert.equal(error.message, expected.error);
        return true;
      });
      return;
    }
    const state = await replay(fixture.events);
    assert.equal(state.status, expected.status);
    assert.equal(state.lastSequence, expected.last_sequence);
    assert.deepEqual([...state.eventIds].sort(), expected.event_ids);
    assert.equal(state.historyHash, expected.history_hash);
  });
}

test("numeric boundary probes explicitly preserve PASS controls and HOLD evidence", async () => {
  const observations = [];
  for (const probe of numeric.probes) {
    const event = JSON.parse(probe.raw_event_json);
    let jsCanonical = null;
    let jsReduce = null;
    let jsError = null;
    try {
      jsCanonical = canonicalEventText(event);
      const state = await reduce(initialState(), event);
      jsReduce = { result: "ok", status: state.status, history_hash: state.historyHash };
    } catch (error) {
      jsError = error.message;
      jsReduce = { result: "reject", error: error.message };
    }

    if (probe.cross_runtime_expectation === "PASS_CONTROL") {
      assert.equal(probe.python_result, "ok");
      assert.equal(jsCanonical, probe.python_canonical_utf8);
      assert.deepEqual(jsReduce, probe.python_reduce);
    } else {
      const pythonObservation = probe.python_result === "reject"
        ? { result: "reject", error: probe.python_error }
        : { result: "ok", canonical: probe.python_canonical_utf8, reduce: probe.python_reduce };
      const jsObservation = jsCanonical === null
        ? { result: "reject", error: jsError }
        : { result: "ok", canonical: jsCanonical, reduce: jsReduce };
      assert.notDeepEqual(jsObservation, pythonObservation, `${probe.name} must remain discriminating HOLD evidence`);
      observations.push({ name: probe.name, python: pythonObservation, javascript: jsObservation });
    }
  }
  assert.ok(observations.length >= 1);
});

test("canonical JavaScript core has no Node-only runtime dependency", async () => {
  const files = ["events.js", "predicates.js", "reducer.js"];
  for (const file of files) {
    const source = await readFile(path.join(root, "js/core", file), "utf8");
    assert.doesNotMatch(source, /(?:from\s+["']node:|require\s*\(|\bprocess\b|\bBuffer\b)/);
  }
});
