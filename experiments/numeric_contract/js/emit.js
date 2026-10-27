// Node-only fixture loader / observation runner, outside browser-targeted logic.
import { readFile } from "node:fs/promises";
import { canonicalEvent } from "../../../js/core/events.js";
import { initialState, reduce } from "../../../js/core/reducer.js";
import { observe, replay, hex } from "./candidates.js";

export const fixtures = JSON.parse(await readFile(new URL("../fixtures/probes.json", import.meta.url), "utf8")).probes;
export function history(payload = '{"value":1.5}') {
  return ["TASK_ADMITTED", "TASK_READY", "WORK_STARTED", "OUTPUT_READY", "VERIFICATION_PASSED", "CHECKPOINTED"]
    .map((kind, i) => `{"event_id":"h${i + 1}","sequence":${i + 1},"kind":"${kind}","payload":${payload}}`);
}

async function baseline(raw) {
  try {
    const event = JSON.parse(raw);
    const encoded = canonicalEvent(event);
    const observation = { result: "ok", canonical_hex: hex(encoded), canonical_text: new TextDecoder().decode(encoded),
      event_sha256: hex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", encoded))) };
    try {
      const state = await reduce(initialState(), event);
      observation.reduction = { status: state.status, history_hash: state.historyHash };
    } catch (error) { observation.reduction = { result: "reject", reason: error.message }; }
    return observation;
  } catch (error) { return { result: "reject", reason: error.message }; }
}

export async function emit() {
  const observations = [];
  for (const fixture of fixtures) {
    const row = { name: fixture.name, baseline: await baseline(fixture.raw_event_json) };
    for (const candidate of "NJD") row[candidate] = await observe(candidate, fixture.raw_event_json);
    observations.push(row);
  }
  const replays = {};
  for (const candidate of "NJD") replays[candidate] = await replay(candidate, history());
  return { observations, replays };
}
