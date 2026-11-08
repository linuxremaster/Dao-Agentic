import { randomUUID } from "node:crypto";
export function planIncarnationStart({ reason, exclusiveContinuationProven = false, priorIncarnationId = null, attemptedSequence = null, newIncarnationId = null } = {}) {
  const mustNew = reason === "CLONE" || reason === "RECOVERY" || reason === "MIGRATION" || reason === "COMPROMISE_RECOVERY";
  if (mustNew && !exclusiveContinuationProven) {
    return Object.freeze({
      must_create_new_incarnation: true,
      instance_incarnation_id: newIncarnationId ?? `inc-${randomUUID()}`,
      prior_instance_incarnation_id_or_null: priorIncarnationId,
      attempted_prior_sequence: attemptedSequence,
      local_sequence: 1,
      previous_hash: "0".repeat(64),
      event_type: "INCARNATION_STARTED",
    });
  }
  return Object.freeze({ must_create_new_incarnation: false, local_sequence: attemptedSequence ?? 1, event_type: "CONTINUE_EXISTING_INCARNATION" });
}
