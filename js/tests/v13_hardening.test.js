import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveIntegrityLabel, authorityDeltaFromDerivedEvidence, selectRegisteredTool, sideEffectFromMemoryInstructionAllowed, derivePrivacyClass, INTEGRITY } from "../core/security_labels.js";
import { validateSinkAtEffect } from "../core/sink_binding.js";
import { evaluateSupplyChain } from "../core/supply_chain.js";
import { evaluateEvidenceMethod } from "../core/evidence_method.js";
import { evaluateAssessmentDiversity } from "../core/assessment_diversity.js";
import { evaluateConformanceClaim } from "../core/conformance_report.js";
import { planIncarnationStart } from "../core/incarnation.js";
import { applySourceStatusChange } from "../core/retraction.js";
import { projectPresentation } from "../core/presentation.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtures = JSON.parse(await readFile(path.join(root, "contracts/v1.3/fixtures.json"), "utf8")).fixtures;
const f = (id) => fixtures.find((x) => x.id === id);

test("ACT-06: resource rebinding invalidates sink authorization", () => {
  const x=f("ACT-06");
  const result=validateSinkAtEffect({
    decision:{ sink_decision_valid_before:x.input.sink_decision_valid_before, resolved_resource_binding:x.input.authorized_resource },
    actual:{ resolved_resource_binding:x.input.resolved_at_effect },
  });
  assert.equal(result.sink_decision_valid,x.expected.sink_decision_valid);
  assert.equal(result.side_effect_allowed,x.expected.side_effect_allowed);
  assert.equal(result.revalidation_required,x.expected.revalidation_required);
});

test("INJ-01: untrusted integrity propagates through derived steps without authority", () => {
  const x=f("INJ-01");
  let label=INTEGRITY.UNTRUSTED;
  for (const _step of x.input.derived_steps) label=deriveIntegrityLabel([label]);
  assert.equal(label,INTEGRITY.UNTRUSTED);
  assert.equal(authorityDeltaFromDerivedEvidence(label),x.expected.authority_delta);
  assert.equal(false,x.expected.private_key_exfiltration);
});

test("INJ-02: delayed memory instruction remains untrusted", () => {
  const x=f("INJ-02");
  assert.equal(deriveIntegrityLabel([x.input.memory_entry.integrity]),x.expected.memory_integrity);
  assert.equal(sideEffectFromMemoryInstructionAllowed(x.input.memory_entry.integrity),x.expected.side_effect_allowed_from_memory_instruction);
});

test("INJ-03: poisoned metadata cannot substitute registered tool", () => {
  const x=f("INJ-03");
  const r=selectRegisteredTool({registeredToolId:x.input.registered_tool_id, metadataSuggestion:"admin-delete-v9", metadataTrusted:x.input.metadata_trusted});
  assert.equal(r.selected_tool_id,x.expected.selected_tool_id);
  assert.equal(r.substitution_allowed,x.expected.substitution_allowed);
});

test("INJ-04: cross-document untrusted composition creates no authority", () => {
  const x=f("INJ-04");
  const label=deriveIntegrityLabel([INTEGRITY.UNTRUSTED,INTEGRITY.UNTRUSTED]);
  assert.equal(authorityDeltaFromDerivedEvidence(label),x.expected.authority_delta);
  assert.equal(label,INTEGRITY.UNTRUSTED);
});

test("SUP-01: valid signature from revoked builder is rejected", () => {
  const x=f("SUP-01");
  const r=evaluateSupplyChain({ attestationSignatureValid:x.input.attestation_signature_valid, builder:x.input.builder, builderTrust:x.input.builder_trust });
  assert.equal(r.component_trusted,x.expected.component_trusted);
  assert.equal(r.decision,x.expected.decision);
});

test("SUP-02: missing required build step rejects supply chain", () => {
  const x=f("SUP-02");
  const r=evaluateSupplyChain({ attestationSignatureValid:true, builder:"builder-A", builderTrust:"TRUSTED", expectedSteps:x.input.expected_steps, observedSteps:x.input.observed_steps });
  assert.equal(r.component_trusted,x.expected.component_trusted);
  assert.deepEqual([...r.missing_steps],x.expected.missing_steps);
});

test("MET-01: approval without validation/applicability is inadmissible", () => {
  const x=f("MET-01");
  const r=evaluateEvidenceMethod({ approved:x.input.approved, validation_evidence:x.input.validation_evidence, domain_applicability:x.input.domain_applicability });
  assert.equal(r.method_admissible,x.expected.method_admissible);
});

test("DIV-01: provider diversity alone does not satisfy R3 procedural diversity", () => {
  const x=f("DIV-01");
  const r=evaluateAssessmentDiversity({ risk:x.input.risk, assessors:x.input.assessors, empirical_error_diversity_validated:x.input.empirical_error_diversity_validated, human_or_deterministic_channel:x.input.human_or_deterministic_channel });
  assert.equal(r.diversity_satisfied,x.expected.diversity_satisfied);
  assert.equal(r.decision,x.expected.decision);
});

test("DIV-02: model plus validated deterministic channel can satisfy R3 diversity", () => {
  const x=f("DIV-02");
  const r=evaluateAssessmentDiversity({ risk:x.input.risk, channels:x.input.channels, shared_failure_mode_material:x.input.shared_failure_mode_material });
  assert.equal(r.diversity_satisfied,x.expected.diversity_satisfied);
});

test("CONF-01: self-declared badge without report is unestablished", () => {
  const x=f("CONF-01");
  const r=evaluateConformanceClaim({ productClaim:x.input.product_claim, conformanceReport:x.input.conformance_report });
  assert.equal(r.conformance_state,x.expected.conformance_state);
});

test("INC-01: uncertain clone starts new incarnation at sequence 1", () => {
  const x=f("INC-01");
  const r=planIncarnationStart({ reason:x.input.reason, exclusiveContinuationProven:x.input.exclusive_continuation_proven, priorIncarnationId:x.input.attempted_prior_incarnation, attemptedSequence:x.input.attempted_sequence, newIncarnationId:"inc-new" });
  assert.equal(r.must_create_new_incarnation,x.expected.must_create_new_incarnation);
  assert.equal(r.local_sequence,x.expected.local_sequence);
  assert.equal(r.event_type,x.expected.event_type);
});

test("PRV-01: derived privacy inherits highest material input class", () => {
  const x=f("PRV-01");
  const r=derivePrivacyClass(x.input.inputs,{authorizedDowngrade:x.input.privacy_transform_authorized});
  assert.equal(r,x.expected.derived_minimum_class);
});

test("RET-01: adverse source status removes unqualified R3 support pending reevaluation", () => {
  const x=f("RET-01");
  const r=applySourceStatusChange({ risk:x.input.risk, claimState:x.input.claim_state, sourceStatusChange:x.input.source_status_change });
  assert.equal(r.reevaluation_enqueued,x.expected.reevaluation_enqueued);
  assert.notEqual(r.claim_state,x.expected.claim_state_not);
  assert.equal(r.unqualified_support_allowed,false);
});

test("UNC-01: presentation is deterministic projection of MIXED epistemic state", () => {
  const x=f("UNC-01");
  const r=projectPresentation({epistemicState:x.input.epistemic_state,presentationPolicy:x.input.presentation_policy});
  assert.equal(r.must_disclose_conflict,x.expected.must_disclose_conflict);
  assert.equal(r.must_not_emit_unqualified_certainty,x.expected.must_not_emit_unqualified_certainty);
});
