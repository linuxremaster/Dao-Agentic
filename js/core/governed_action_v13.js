import { createHash } from "node:crypto";
import { authorizeRegisteredAction } from "./action_broker.js";
import { evaluateActionDependency } from "./action_dependency.js";
import { canonicalize } from "./c14n_v13.js";
import { validateSinkAtEffect } from "./sink_binding.js";

function hashCanonical(value) {
  return createHash("sha256").update(Buffer.from(canonicalize(value), "utf8")).digest("hex");
}

function policyGate(policyDecisions) {
  if (!Array.isArray(policyDecisions) || policyDecisions.length === 0) return { ok: false, reason: "MISSING_REQUIRED_POLICY" };
  const invalid = policyDecisions.find((p) => p?.policy_state !== "ACTIVE" || p?.decision !== "ACCEPT" || typeof p?.policy_digest !== "string");
  if (invalid) return { ok: false, reason: invalid.reason || "POLICY_INVALID" };
  return { ok: true, digests: [...new Set(policyDecisions.map((p) => p.policy_digest))].sort() };
}

export async function authorizeGovernedActionV13({
  dependency,
  policyDecisions,
  historyWitness,
  resolveResourceAtEffect,
  toolArtifactIdentity,
  privacyState = "ALLOW",
  integrityState = "UNTRUSTED",
  ...brokerArgs
} = {}) {
  const dep = evaluateActionDependency(dependency ?? {});
  if (dep.decision !== "PASS") return Object.freeze({ enforcement: "HOLD", stage: "ACTION_DEPENDENCY", reason: dep.reason, dependency: dep });

  const policies = policyGate(policyDecisions);
  if (!policies.ok) return Object.freeze({ enforcement: "HOLD", stage: "POLICY", reason: policies.reason });

  if (privacyState === "BLOCK") return Object.freeze({ enforcement: "HOLD", stage: "PRIVACY", reason: "PRIVACY_POLICY_BLOCK" });
  if (dependency?.riskClass === "R3_HIGH" && historyWitness?.r3_side_effect === "HOLD") {
    return Object.freeze({ enforcement: "HOLD", stage: "WITNESS", reason: "DEGRADED_HISTORY" });
  }
  if (typeof resolveResourceAtEffect !== "function") throw new TypeError("resolveResourceAtEffect must be a function");
  if (typeof toolArtifactIdentity !== "string" || !toolArtifactIdentity) throw new TypeError("toolArtifactIdentity required");

  const controlContext = Object.freeze({
    action_dependency_decision_id: dependency?.decisionId ?? null,
    action_dependency_class: dep.dependency_class,
    risk_class: dependency?.riskClass ?? "R1_LOW",
    active_policy_digests: Object.freeze(policies.digests),
    integrity_label_state: integrityState,
    privacy_state: privacyState,
    witness_state: historyWitness?.history_state ?? "UNKNOWN",
  });

  return authorizeRegisteredAction({
    ...brokerArgs,
    controlContext,
    beforeExecute: async ({ adapter, derived, request, decision, actionId }) => {
      const actualResource = await resolveResourceAtEffect({ adapter, derived, request, decision, actionId });
      const sink = validateSinkAtEffect({
        decision: {
          sink_decision_valid_before: true,
          registered_tool_id: adapter.id,
          tool_artifact_digest_or_remote_identity: toolArtifactIdentity,
          resolved_resource_binding: request.target,
          canonical_argument_hash: hashCanonical(derived.execution_input),
          authorization_decision_id: decision.event_id,
          action_dependency_decision_id: dependency?.decisionId ?? "dependency-decision-unbound",
        },
        actual: {
          registered_tool_id: adapter.id,
          tool_artifact_digest_or_remote_identity: toolArtifactIdentity,
          resolved_resource_binding: actualResource,
          canonical_argument_hash: hashCanonical(derived.execution_input),
          authorization_decision_id: decision.event_id,
          action_dependency_decision_id: dependency?.decisionId ?? "dependency-decision-unbound",
        },
      });
      if (!sink.side_effect_allowed) {
        const e = new Error(`sink revalidation failed: ${sink.reason}`);
        e.name = "SinkRevalidationError";
        e.sink = sink;
        throw e;
      }
    },
  });
}
