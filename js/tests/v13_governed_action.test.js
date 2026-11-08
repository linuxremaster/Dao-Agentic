import test from "node:test";
import assert from "node:assert/strict";
import { authorizeGovernedActionV13 } from "../core/governed_action_v13.js";
import { replayLeases } from "../core/leases.js";
import { verifyEvidenceChain } from "../core/evidence_log.js";

const SHA="95b903ad9f7f734d946bf718c73b00c2795b4544";
const EVIDENCE="github-actions:conformance:test:success";
function grant(){return {event_id:"grant-event",sequence:1,kind:"AUTHORITY_GRANTED",payload:{grant_id:"grant-1",subject:"SOC-THREAD-070",action:"MERGE",target:`PR-23@${SHA}`,scope:"linuxremaster/Dao-Agentic",expires_sequence:10,required_evidence:[EVIDENCE]}};}
const activePolicy=(digest)=>({policy_state:"ACTIVE",decision:"ACCEPT",policy_digest:digest});
const witness={history_state:"NORMAL",r3_side_effect:"ALLOW_IF_OTHER_GATES_PASS"};
function response(body,status=200){return {ok:status>=200&&status<300,status,async json(){return body;}};}
async function env(fn){
 const saved={repo:process.env.DAO_GITHUB_REPOSITORY,token:process.env.DAO_GITHUB_TOKEN,fetch:globalThis.fetch};
 process.env.DAO_GITHUB_REPOSITORY="linuxremaster/Dao-Agentic";process.env.DAO_GITHUB_TOKEN="test-token";
 try{return await fn();}finally{if(saved.repo===undefined)delete process.env.DAO_GITHUB_REPOSITORY;else process.env.DAO_GITHUB_REPOSITORY=saved.repo;if(saved.token===undefined)delete process.env.DAO_GITHUB_TOKEN;else process.env.DAO_GITHUB_TOKEN=saved.token;globalThis.fetch=saved.fetch;}
}
async function baseArgs(){
 const state=await replayLeases([grant()]); const receipts=[]; const decisions=[];
 return {state,adapterId:"github-merge-v1",subject:"SOC-THREAD-070",requestId:"req-1",actionId:"act-1",input:{pr_number:23,expected_head_sha:SHA},evidenceIds:[EVIDENCE],decisionEventId:"decision-1",appendDecision:async e=>decisions.push(e),appendEvidenceEntry:async e=>receipts.push(e),receipts,decisions,toolArtifactIdentity:"sha256:test-adapter"};
}

test("dependency uncertain holds before authority/provider path",async()=>env(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error("must not call")};const a=await baseArgs();
 const r=await authorizeGovernedActionV13({...a,dependency:{dependencyClass:"DEPENDENCY_UNCERTAIN",riskClass:"R3_HIGH",decisionId:"dep-1"},policyDecisions:[activePolicy("p1")],historyWitness:witness,resolveResourceAtEffect:async()=>`PR-23@${SHA}`});
 assert.equal(r.enforcement,"HOLD");assert.equal(r.stage,"ACTION_DEPENDENCY");assert.equal(calls,0);assert.equal(a.receipts.length,0);
}));

test("invalid policy holds before provider path",async()=>env(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error("must not call")};const a=await baseArgs();
 const r=await authorizeGovernedActionV13({...a,dependency:{dependencyClass:"PREFERENCE_DEFINED",riskClass:"R2_MATERIAL",decisionId:"dep-1"},policyDecisions:[{policy_state:"POLICY_INVALID",decision:"HOLD",reason:"ROLLBACK"}],historyWitness:witness,resolveResourceAtEffect:async()=>`PR-23@${SHA}`});
 assert.equal(r.enforcement,"HOLD");assert.equal(r.stage,"POLICY");assert.equal(calls,0);
}));

test("R3 degraded witness holds before provider path",async()=>env(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error("must not call")};const a=await baseArgs();
 const r=await authorizeGovernedActionV13({...a,dependency:{dependencyClass:"PREFERENCE_DEFINED",riskClass:"R3_HIGH",decisionId:"dep-1"},policyDecisions:[activePolicy("p1")],historyWitness:{history_state:"DEGRADED_HISTORY",r3_side_effect:"HOLD"},resolveResourceAtEffect:async()=>`PR-23@${SHA}`});
 assert.equal(r.enforcement,"HOLD");assert.equal(r.stage,"WITNESS");assert.equal(calls,0);
}));

test("sink rebinding cancels after intent but before provider effect",async()=>env(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error("provider must not call")};const a=await baseArgs();
 await assert.rejects(()=>authorizeGovernedActionV13({...a,dependency:{dependencyClass:"PREFERENCE_DEFINED",riskClass:"R3_HIGH",decisionId:"dep-1"},policyDecisions:[activePolicy("p1")],historyWitness:witness,resolveResourceAtEffect:async()=>`PR-999@${SHA}`}),err=>{assert.equal(err.action_state,"CANCELLED_BEFORE_EFFECT");return true;});
 assert.equal(calls,0);assert.equal(a.receipts.length,2);assert.equal(a.receipts[0].record.transaction_state,"ACTION_INTENT_PERSISTED");assert.equal(a.receipts[1].record.transaction_state,"CANCELLED_BEFORE_EFFECT");assert.equal(verifyEvidenceChain(a.receipts).ok,true);
}));

test("governed pass binds control context and executes exact provider action",async()=>env(async()=>{
 const calls=[];globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),options});if((options.method||"GET")==="GET")return response({state:"open",head:{sha:SHA},base:{repo:{full_name:"linuxremaster/Dao-Agentic"}}});return response({merged:true,sha:"a".repeat(40),message:"merged"});};const a=await baseArgs();
 const r=await authorizeGovernedActionV13({...a,dependency:{dependencyClass:"EVIDENCE_DEPENDENT",evidenceSatisfied:true,riskClass:"R3_HIGH",decisionId:"dep-1"},policyDecisions:[activePolicy("p1"),activePolicy("p2")],historyWitness:witness,resolveResourceAtEffect:async({request})=>request.target});
 assert.equal(r.enforcement,"ALLOW");assert.equal(calls.length,2);assert.equal(a.receipts.length,2);assert.deepEqual(a.receipts[0].record.control_context.active_policy_digests,["p1","p2"]);assert.equal(a.receipts[0].record.control_context.action_dependency_class,"EVIDENCE_DEPENDENT");
}));
