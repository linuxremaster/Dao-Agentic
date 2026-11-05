import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateHistoryWitness, detectHistoryFork } from "../core/history_witness.js";
const here=path.dirname(fileURLToPath(import.meta.url)); const root=path.resolve(here,"../..");
const set=JSON.parse(await readFile(path.join(root,"contracts/v1.3/fixtures.json"),"utf8")); const f=new Map(set.fixtures.map(x=>[x.id,x]));

test("WIT-01 forward-secure local auth alone is insufficient",()=>{const x=f.get("WIT-01");const r=evaluateHistoryWitness({localForwardSecure:x.input.local_forward_secure,externalMonotonicHead:x.input.external_monotonic_head});assert.equal(r.core_history_assurance,x.expected.core_history_assurance);assert.equal(r.history_state,x.expected.history_state);});
test("WIT-02 unwitnessed event window degrades history",()=>{const x=f.get("WIT-02");const r=evaluateHistoryWitness({externalMonotonicHead:true,maxUnwitnessedEvents:x.input.max_unwitnessed_events,eventsSinceWitness:x.input.events_since_witness});assert.equal(r.history_state,x.expected.history_state);});
test("WIT-03 incompatible valid successors detect fork",()=>{const x=f.get("WIT-03");const r=detectHistoryFork({predecessor:x.input.predecessor,successors:x.input.successors,compatible:x.input.compatible});assert.equal(r.history_state,x.expected.history_state);assert.equal(r.preserve_both_branches,x.expected.preserve_both_branches);assert.equal(r.branch_dependent_action,x.expected.branch_dependent_action);});
test("WIT-04 stale cross-view plus witness outage degrades and holds R3",()=>{const x=f.get("WIT-04");const r=evaluateHistoryWitness({externalMonotonicHead:true,maxCrossViewIntervalS:x.input.max_cross_view_interval_s,secondsSinceCrossView:x.input.seconds_since_cross_view,witnessAvailable:x.input.witness_available});assert.equal(r.history_state,x.expected.history_state);assert.equal(r.r3_side_effect,x.expected.r3_side_effect);});
