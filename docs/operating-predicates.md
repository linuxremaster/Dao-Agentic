# Operating predicates

These predicates have the following bounded operational effects. Payload text
cannot override event admission or lifecycle transitions.

| Rule | Condition | Consequence |
| --- | --- | --- |
| AGREEMENT != VERIFICATION | Payload expresses agreement without VERIFICATION_PASSED | No promotion to VERIFIED; OUTPUT_READY enters VERIFYING only |
| VALID RECORD != TRUE CLAIM | Structurally valid event requests an unspecified transition | Reject; payload claims cannot bypass lifecycle predicates |
| INTENT != ACTION | TASK_READY or payload expresses intent to work | State is READY until WORK_STARTED is admitted |
| ACTION != OUTCOME | WORK_STARTED is admitted | State is RUNNING until OUTPUT_READY or HOLD_ENTERED |
| OUTCOME != VERIFIED SUCCESS | OUTPUT_READY is admitted | State is VERIFYING; only VERIFICATION_PASSED promotes to VERIFIED, while VERIFICATION_FAILED enters HOLD |
| UNVERIFIED WORK != CURRENT STATE | Output is available but verification has not passed | Materialized status remains VERIFYING; CHECKPOINTED is rejected |
| PAST ACTION != AUTHORIZATION | Work previously started, then entered HOLD | WORK_STARTED is rejected until RECOVERY_COMPLETED returns to READY |

VERIFIED is a lifecycle label based on a supplied verification event. No semantic
truth check, external authorization service, or independent verifier is provided.
The state records the current control status, not an assertion that payload claims
have become external facts. No additional authority or claim model is implied.
