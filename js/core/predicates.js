import { AdmissionError } from "./events.js";

export const TRANSITIONS = Object.freeze({
  "NEW|TASK_ADMITTED": "ADMITTED",
  "ADMITTED|TASK_READY": "READY",
  "READY|WORK_STARTED": "RUNNING",
  "RUNNING|OUTPUT_READY": "VERIFYING",
  "RUNNING|HOLD_ENTERED": "HOLD",
  "VERIFYING|VERIFICATION_PASSED": "VERIFIED",
  "VERIFYING|VERIFICATION_FAILED": "HOLD",
  "VERIFYING|HOLD_ENTERED": "HOLD",
  "HOLD|RECOVERY_COMPLETED": "READY",
  "VERIFIED|CHECKPOINTED": "DONE",
});

export function admit(state, event) {
  if (state.eventIds.includes(event.event_id)) throw new AdmissionError("duplicate event_id");
  if (event.sequence !== state.lastSequence + 1) {
    throw new AdmissionError("sequence must be contiguous and increasing");
  }
  const next = TRANSITIONS[`${state.status}|${event.kind}`];
  if (next === undefined) throw new AdmissionError("unspecified lifecycle transition");
  return next;
}
