# Dao Agentic - Representation-Independent Workflow Composition and Adaptive Representational Commitment

## Constructive Falsification Specification v0.1.3

**Status:** RESEARCH SPECIFICATION / CURRENTNESS + TYPE-PRECISION REVISION / NO POLICY AUTHORITY  
**Date:** 2026-11-28  
**Project:** SOC-THREAD-076-95  
**Policy / runtime anchors:** Environment v0.1.31 TESTING; Temporal Notepad v0.1.14 TESTING; Cognitive Architecture Runtime (experimental; under development); Sandbox Runtime Library v0.1.4  
**Pre-implementation currentness anchor:** exact repository heads checked 2026-11-28; current owner versions re-opened before implementation.  
**Private pre-implementation head:** `ff5fe82015fbfd807dab0de757ff118fbb316dd9`  
**Public pre-implementation head:** `28a97d776bf313995af518bcaf40bff9f4b0281d`  
**Relay anchor:** `SECTION16-GRAPH-PROJECTION-095-001`, private GitHub relay #18, comment `7197942387`  
**Repository routing:** private development source -> accepted shared change -> public mirror

**Revision disposition:** v0.1.3 preserves the v0.1.2 experimental contract and makes only the agreed currentness, terminology, type-precision, and implementation-local repairs required before the first bounded fixture. H1/H2 semantics are not reopened. Environment §18 patch-time reconstruction is namespaced away from runtime source/relation reconstruction and representation migration. Environment §6 defeasible inference is admitted only from candidate-visible, in-scope support and cannot silently satisfy a transition prerequisite that explicitly requires exact/verified support. Repository Stewardship, Environmental / Runtime Telemetry v0.2, and the Experimental Research Object Archival Standard remain surrounding development/observation/preservation surfaces, not SUT execution machinery. No new Environment rule, controller, standing assay, or live behavioral score is introduced.

---

## 0. Purpose and disposition

This specification turns the representation-independent composition hypothesis into a bounded, executable, failure-seeking research program while preventing the experimental apparatus from silently supplying the composition capability under test.

The program distinguishes three questions:

```text
H1 - REPRESENTATION-INDEPENDENT COMPOSITION

Can independently justified workflow properties
be preserved by materially different realizations
under specified operational conditions?


H2a - REPRESENTATION MIGRATION SAFETY

Can a workflow move between sufficient realizations
from the actual reachable state
without losing required properties?


H2b - ADAPTIVE REPRESENTATIONAL COMMITMENT

Can an agent conditionally select, compose, retain,
expand, replace, and release realizations
without losing required workflow properties?
```

These hypotheses are related but non-equivalent:

```text
H1 SUCCESS
!-> H2a SUCCESS
!-> H2b SUCCESS

H2b SUCCESS
!-> ADAPTIVE SELF-MODELING ESTABLISHED

WORKFLOW CORRECTNESS
!-> COGNITIVE-SCAFFOLDING EFFECTIVENESS
```

The target is not architectural minimalism. The target is condition-dependent commitment to structure.

```text
LESS STRUCTURE
!-> LOWER TOTAL BURDEN

MORE STRUCTURE
!-> GREATER RELIABILITY

ABLATION
!-> IMPROVEMENT

CURRENTLY USEFUL
!-> PERMANENTLY NECESSARY

CURRENTLY UNNECESSARY
!-> PERMANENTLY USELESS
```

A central evidence firewall is added in v0.1.1:

```text
REPRESENTATION INDEPENDENCE
!= HARNESS INDEPENDENCE

GRAPH ABSENT
!-> HARNESS ABLATED

GRAPH PRESENT
!-> HARNESS REQUIRED

STRUCTURE REENCODED
!-> STRUCTURE ABLATED

FUNCTIONALITY RELOCATED
!-> FUNCTIONALITY UNNECESSARY
```

---

## 1. Recalibration and context-hygiene boundary

### 1.1 Preserved owner boundaries

```text
ENVIRONMENT
-> NON-STATE SEMANTICS
   PURPOSE / ENTRY / EVIDENCE / JUDGMENT /
   ACTION / STOP / EVOLUTION

SECTION 16
-> CRITERION-CONDITIONED SOURCE / VIEW RELATION
-> NON-COLLAPSE
-> SOURCE RECOVERY / REFINEMENT
-> CRITERION RELEASE

SECTION 16
!-> GRAPH COMPOSITION ENGINE
!-> GRAPH EXECUTION ENGINE
!-> GRAPH ONTOLOGY
!-> RESOURCE MANAGER
!-> ARCHITECTURE OPTIMIZER

GRAPH COMPOSITION
-> MAY REPRESENT DEPENDENCIES / CONCURRENCY /
   SYNCHRONIZATION / TEMPORAL RELATIONSHIPS

TEMPORAL NOTEPAD
-> PERSISTENT STATE
-> PROVENANCE / HISTORY
-> DETERMINISTIC MUTATION BOUNDARY

TEMPORAL NOTEPAD
!-> COMPLETE HARNESS
!-> NON-STATE JUDGMENT LAYER
!-> LIVE GRAPH MUTATION AUTHORITY
```

These are semantic distinctions, not required software components.

### 1.2 Complete Section 16 lifecycle remains unchanged

```text
X_t = AVAILABLE SOURCE / WORKING STATE
B_t = CURRENT CRITERION
W_t = r_t = P(X_t, B_t)

W_t != X_t

r_t INSUFFICIENT / MISBOUND
-> RETURN TOWARD X_t
-> RE-EVALUATE UNDER SAME B_t

INSUFFICIENT VIEW
!-> INVALID CRITERION

B_t RESOLVED / INVALIDATED
-> RELEASE B_t

RELEASE B_t
!-> REQUIRE SUCCESSOR

NEW LOAD-BEARING DISTINCTION?
    YES -> B_{t+1}
    NO  -> EMPTY

B_t !-> B_{t+1}
```

The successor relation is restored here for fidelity. It does not create an automatic criterion generator, and representation change does not imply criterion change.

```text
REPRESENTATION CHANGES
!-> CRITERION CHANGES

SAME B_t
+ DIFFERENT M
-> VALID REFINEMENT / REALIZATION CHANGE CANDIDATE
```

### 1.3 Criterion, condition envelope, and realization remain distinct

```text
X_t = AVAILABLE SOURCE
B_t = CURRENT CRITERION
C_t = CURRENT EXOGENOUS CONDITION ENVELOPE
M   = CANDIDATE REPRESENTATIONAL REALIZATION

W_t = r_t = P(X_t, B_t)
```

`W_t` and `r_t` denote the same bounded working projection, not two operations. `B_t` determines which distinctions matter. `C_t` defines the relevant externally imposed operational conditions and ceilings. `M` is the current realization. Candidate-dependent progress, consumption, contention, and remaining margin are observed outcomes, not silently folded back into the fixed comparison envelope.

```text
INFORMATION SUFFICIENT FOR B_t
!-> OPERATIONALLY AVAILABLE WITHIN C_t

OPERATIONALLY AVAILABLE WITHIN C_t
!-> INFORMATION SUFFICIENT FOR B_t

EQUIVALENT EXOGENOUS LIMITS
!= IDENTICAL REALIZED CONDITIONS
!= IDENTICAL RESOURCE CONSUMPTION
```

Observed endogenous conditions (remaining time, actual progress, resource use, in-flight obligations and recovery margin) may inform adaptive judgment within a run. Their relevance does not make them fixed comparison inputs. A criterion change need not entail a representation change either.

### 1.4 Currentness and surrounding-surface firewalls

Environment v0.1.30 introduced patch-time repair-versus-reconstruction strategy. That namespace is distinct from runtime reconstruction in M5 and from representation migration in H2a:

```text
PATCH-TIME IMPLEMENTATION RECONSTRUCTION
!= RUNTIME SOURCE / RELATION RECONSTRUCTION
!= REPRESENTATION MIGRATION
```

Environment v0.1.31 permits defeasible inference from independently identifiable contextual support. In this experiment the support available to a candidate remains bounded by the declared candidate-visible interface:

```text
CANDIDATE-VISIBLE
+ IN-SCOPE CONTEXTUAL SUPPORT
-> MAY JUSTIFY DEFEASIBLE INFERENCE

HIDDEN FIXTURE TRUTH
-> APPARATUS ONLY
!-> CANDIDATE SUPPORT

DEFEASIBLE INFERENCE
!= VERIFIED FIXTURE FACT
!= ACTION AUTHORIZATION
!= PERMANENT CONCLUSION

TRANSITION PRECONDITION
EXPLICITLY REQUIRES VERIFIED / EXACT SUPPORT
-> DEFEASIBLE INFERENCE ALONE
   DOES NOT SATISFY THAT PRECONDITION
```

The surrounding repository surfaces remain outside composition execution:

```text
REPOSITORY STEWARDSHIP
-> DEVELOPMENT / SOURCE / PROVENANCE / DISTRIBUTION PRESERVATION
!-> SUT CONTROLLER

ENVIRONMENTAL / RUNTIME TELEMETRY v0.2
-> PASSIVE OBSERVATION
!-> TRANSITION / SUCCESS / AUTHORIZATION

EXPERIMENTAL RESEARCH OBJECT ARCHIVAL STANDARD v0.1
-> COMPLETED / FROZEN / SUPERSEDED OBJECT PRESERVATION
!-> ACTIVE SUT EXECUTION SEMANTICS
```

---

## 2. Research claims and result taxonomy

For workflow purpose `Q`, define:

```text
R = independently justified required-property set
L = legitimate constraint set
C = relevant exogenous condition trajectory / envelope
M = candidate realization
T(M) = observable execution trajectory under M
```

Operational sufficiency is scoped as:

```text
SUFFICIENT(M; R, L, C)
```

This is analytical shorthand, not a universal semantic oracle.

```text
BEHAVIORAL DIFFERENCE
!-> REGRESSION

ARCHITECTURAL DIFFERENCE
!-> FUNCTIONAL LOSS

EQUIVALENT REQUIRED PROPERTIES
!-> IDENTICAL EXECUTION TRAJECTORY
```

### 2.1 Four distinct outcome claims

Where supported by evidence, identify one or more of the following nonexclusive claims; a failed or inconclusive comparison may establish none:

```text
SUBSTITUTION
-> DIFFERENT REALIZATION PRESERVES A REQUIRED PROPERTY

REENCODING
-> EQUIVALENT STRUCTURAL INFORMATION EXISTS IN ANOTHER FORM

DISPLACEMENT
-> REQUIRED FUNCTIONALITY MOVED TO ANOTHER SYSTEM SURFACE

ABLATION
-> REQUIRED PROPERTIES SURVIVE WITHOUT THE REMOVED
   FUNCTIONALITY OR STRUCTURE
```

These are analytical labels, not four experimental phases. Identify the system boundary and exact object of each claim: ablation of a representation, stored structure, or supervisory functionality are distinct. An unclassified or unresolved result is admissible.

```text
SUBSTITUTION
!-> ABLATION

REENCODING
!-> FUNCTIONAL REDUCTION

DISPLACEMENT
!-> HARNESS INDEPENDENCE
```

---

## 3. Six experimental contracts

v0.1.1 consolidates the surviving audit findings into six contracts. These contracts constrain the experiment; they do not create runtime subsystems.

### A. Capability and apparatus boundary

```text
DECLARE COMMON ENVIRONMENTAL CAPABILITIES.

ATTRIBUTE PROPERTY PRESERVATION
TO THE MECHANISMS THAT SUPPLY IT.

DO NOT SILENTLY SUPPLY TESTED FUNCTIONALITY.

DISTINGUISH SUBSTITUTION,
REENCODING, DISPLACEMENT, AND ABLATION.
```

The apparatus may inject declared exogenous conditions, expose declared candidate-visible observations, record effects, and adjudicate properties. It must not silently route work, choose successors, recover source relations, deduplicate effects, select representations, restore interrupted work, or enforce dependencies on behalf of a candidate unless that functionality is explicitly declared as common substrate and included in the result interpretation.

### B. Requirement and evaluation boundary

```text
JUSTIFY REQUIRED PROPERTIES INDEPENDENTLY.

DISTINGUISH:
    SAFETY
    PROGRESSION
    RECOVERY
    COMPLETION
    JUSTIFIED NON-EXECUTION

DO NOT CONFUSE
SAFE HOLD WITH OPERATIONAL SUFFICIENCY.

EVALUATOR OBSERVATION
!-> SEMANTIC AUTHORITY.
```

A proposed property may enter `R` when it is supported by current purpose, a legitimate constraint, or a required external consequence, with justification independent of incumbent behavior alone.

```text
INDEPENDENT JUSTIFICATION
!= INDEPENDENT AUTHORITY

REQUIREMENT PROVENANCE
!-> REQUIREMENT GOVERNANCE SYSTEM
```

### C. Condition and disturbance boundary

```text
FIX RELEVANT EXOGENOUS CONDITIONS.

OBSERVE ENDOGENOUS TRAJECTORIES.

DISTINGUISH FORCED TRANSITION TESTS
FROM CANDIDATE-DIRECTED COMPOSITION.

DEFINE ONLY THE MEASUREMENTS
REQUISITE TO EACH COMPARISON.
```

### D. Execution and recovery boundary

```text
PRESERVE:
    LOGICAL CONTRIBUTION INTEGRITY
    REQUIRED ORDERING
    CURRENT AUTHORIZATION
    EXTERNAL EFFECT INTEGRITY
    REQUISITE CONTINUITY

UNKNOWN OUTCOME
!-> NON-EXECUTION
!-> SUCCESS
!-> AUTOMATIC RETRY

IDENTIFY WHAT SURVIVES INTERRUPTION
AND WHAT DOES NOT.
```

### E. Representation and migration boundary

```text
SUFFICIENT ENDPOINTS
!-> FEASIBLE MIGRATION

REPRESENTATIONAL CHANGE
!-> CRITERION CHANGE

COGNITIVE RELEASE
!-> EXECUTION OBLIGATION RELEASE

RETAIN OR RECOVER INFORMATION
ONLY WHERE INDEPENDENTLY REQUIRED.
```

### F. Evidence and research-progression boundary

```text
STATIC SUBSTITUTABILITY
!= ADAPTIVE REPRESENTATIONAL COMMITMENT

ADAPTATION
!= ADAPTIVE SELF-MODELING

WORKFLOW CORRECTNESS
!= COGNITIVE REGULATION VALIDATION

NEXT EXPERIMENT
-> ONLY WHEN A MATERIAL QUESTION SURVIVES
```

Progression is evidential, not ceremonial. No universal phase gate, report authority, or sequencing controller is introduced.

---

## 4. Discriminating workflow fixture

### 4.1 Logical workflow

```text
                 +---- A ----+
                 |           |
INPUT -----------+           +---- C ----> D
                 |           |
                 +---- B ----+
```

A and B may progress concurrently. They each produce one distinguishable logical contribution to shared resource `R_shared`. C is a join. D produces an external consequence keyed by stable effect key `K`.

### 4.2 Required workflow facts

```text
A accepted contribution -> contribution_id = A1
B accepted contribution -> contribution_id = B1

FOR EACH ACCEPTED LOGICAL CONTRIBUTION:
    EXACTLY ONE CONTRIBUTION COMMIT

UNACCEPTED CONTRIBUTION:
    ZERO CONTRIBUTION COMMITS

FINAL R_shared
-> CONSISTENT WITH THE SET OF ACCEPTED CONTRIBUTIONS
```

A terminal counter alone is insufficient evidence because compensating duplicate/lost mutations can produce the same value.

Logical concurrency does not require simultaneous critical writes:

```text
A AND B MAY PROGRESS CONCURRENTLY
!-> SHARED WRITE MUST BE PHYSICALLY SIMULTANEOUS
```

For this fixture, an accepted contribution is one admitted by the declared fixture conditions, not merely one the candidate elects to label accepted. Acceptance is distinct from durable commitment. Successful branch completion requires its committed logical contribution and any other declared requisite branch conditions. A rejected contribution, interruption, or termination does not establish successful completion. For a rejected branch, declare whether an authorized alternative can satisfy the join or whether the dependent transition must remain blocked; the default fixture requires both successful branches. An interrupted accepted contribution remains pending or unresolved until supported evidence establishes its disposition. Evaluate exact-once completion at the required endpoint, not at every intermediate instant.

C requires:

```text
A COMPLETE
AND
B COMPLETE
AND
AUTHORIZATION VALID FOR C AT C COMMIT
```

D requires a valid committed C and the declared D authorization at its own consequential transition. D produces:

```text
EXTERNAL EFFECT(K)
```

Authorization scope for D must be explicit in each fixture. A valid fixture uses one of two declared modes:

```text
MODE D-CURRENT
D REQUIRES CURRENT AUTHORIZATION AT D COMMIT

OR

MODE D-BOUND-TOKEN
C PRODUCES / CARRIES AN EFFECT AUTHORIZATION
BOUND TO K + TARGET + SCOPE + CURRENTNESS CONDITIONS
THAT REMAINS VALID AT D COMMIT
```

Unscoped or invalidated authorization cannot silently authorize D.

### 4.3 External effect sink boundary

The default effect sink is observational, not protective:

```text
EFFECT SINK
-> RECORDS EVERY EFFECT ATTEMPT
-> RECORDS WHETHER AN EFFECT OCCURRED
-> RECORDS K / ATTEMPT ID / TIME

EFFECT SINK
!-> DEDUPLICATE FOR THE CANDIDATE
!-> SUPPLY RETRY POLICY
!-> RESOLVE UNKNOWN OUTCOME FOR THE CANDIDATE
```

If sink-side idempotency is intentionally used, it must be declared as common substrate and the result must be attributed accordingly.

---

## 5. Candidate-visible interface and evaluator-only truth

A valid test separates what the candidate can observe from what the evaluator knows.

```text
CANDIDATE-VISIBLE
-> DECLARED SOURCE FRAGMENTS
-> DECLARED AUTHORIZATION OBSERVATIONS
-> DECLARED DURABLE STATE / RECOVERY REFERENCES
-> DECLARED EXTERNAL RESPONSES
-> DECLARED CLOCK / DEADLINE SIGNALS WHERE APPLICABLE

EVALUATOR-ONLY TRUTH
-> FAULT INJECTION SCHEDULE
-> ACTUAL EFFECT-SINK HISTORY
-> ACTUAL AUTHORIZATION HISTORY
-> ACTUAL SOURCE-AVAILABILITY HISTORY
-> ACCEPTED CONTRIBUTION TRUTH
-> HIDDEN DEFECT CONTROL LABELS
```

```text
SOURCE UNAVAILABLE TO CANDIDATE
+ RUNNER SECRETLY SUPPLIES RECOVERED RELATION
-> SOURCE RECOVERY NOT ESTABLISHED

EVALUATOR KNOWS TRUTH
!-> CANDIDATE MAY READ TRUTH
```

The candidate I/O contract must be inspectable before a run. Information leakage is a critical validity failure.

---

## 6. Common apparatus capability declaration

### 6.1 System under test and external apparatus

For a local harness-substitution claim, bind the system boundary before implementation:

```text
SYSTEM UNDER TEST (SUT)
= COGNITIVE ARCHITECTURE RUNTIME (EXPERIMENTAL REALIZATION)
+ SANDBOX RUNTIME LIBRARY v0.1.4
+ CANDIDATE REALIZATION
+ DECLARED ORDINARY ENVIRONMENTAL CAPABILITIES

EXTERNAL TEST APPARATUS
= FIXTURE INITIALIZATION / CONDITION INJECTION
+ RAW OBSERVATION / EFFECT SINK
+ POST-RUN MECHANICAL ASSERTIONS

EXTERNAL APPARATUS
!-> CANDIDATE WORKFLOW EXECUTION
!-> SUCCESSOR SELECTION / JOIN ENFORCEMENT
!-> SOURCE RECOVERY / EFFECT DEDUPLICATION
!-> REPRESENTATION SELECTION / MIGRATION
```

The Sandbox Runtime Library v0.1.4 is a working-state scaffold, not by declaration a workflow engine. Disclose model/host, storage, tool and human contributions where material; an ordinary environmental capability may provide a necessary function, but its presence limits the claim to that composite SUT. The same capability supplied only by the test runner cannot support a claim that the SUT replaced it. A declared forced probe tests enforcement only; it is not SUT-directed progression. The comparison must not quietly move the tested function across this boundary.

### 6.2 Capability inventory

Before comparison, declare the common substrate and assign functionality to it.

```text
COMMON APPARATUS MAY:
    initialize fixture state
    expose declared candidate inputs
    inject declared exogenous faults
    terminate / replace an instance
    record attempts and consequences
    provide raw storage / atomic primitive if declared
    adjudicate test properties after the fact

COMMON APPARATUS MUST NOT SILENTLY:
    decide candidate successor work
    complete A / B / C / D on behalf of candidate
    enforce candidate join semantics
    recover missing dependency relations
    preserve hidden workflow state for replacement instance
    deduplicate D effects
    select / migrate representations
    infer missing source facts
```

A common capability may be used if it is part of the intended environment. Its contribution must remain visible:

```text
PROPERTY PRESERVED BY COMMON SUBSTRATE
!-> PROPERTY PRESERVED BY CANDIDATE ALONE
```

---

### 6.3 Scenario-local mechanical event definitions

Before coding or running an applicable scenario, define the events, commit linearization points, identities, and observability needed for its assertions. The following are examples of fixture vocabulary, not a standing event schema:

```text
CONTRIBUTION_ACCEPTED(id)
CONTRIBUTION_COMMITTED(id)
BRANCH_COMPLETE(branch)
C_COMMIT(target, authorization_binding)
AUTH_VERSION_REVOKED(v)
AUTH_VERSION_ADMITTED(v, target, scope)
EFFECT_ATTEMPT(K, attempt_id)
EFFECT_OCCURRED(K, attempt_id)
OBSERVATION_INTERRUPTED(attempt_id)
SOURCE_UNAVAILABLE(fact_ref)
INSTANCE_TERMINATED(instance_id)
```

Define accepted identity and completion from fixture rules and contribution commits, not candidate labels. Distinguish attempt, accepted request, actual effect, acknowledgement, and observed outcome. Define authorization validity at the actual consequential commit, including exact target/scope and any validity conditions of a bound token. A check of a version before commit is not an atomic guarantee; identify the mechanism that makes the transition valid or rejects it. Attribute any atomic primitive to its provider. Define the source-loss and replacement cutpoints and what each destroys or preserves. Events must reflect observable fixture facts or evaluator-only injected truth, never model-judged semantic truth. The apparatus may observe and inject conditions but must not enforce the candidate's missing workflow rules. Use only events needed to discriminate the current scenario.

### 6.4 Candidate invocation / wake policy

The fixture declares one candidate-agnostic invocation policy before comparison. The common apparatus may wake a candidate only on a declared candidate-visible opportunity, not by naming the next workflow node or desired transition.

```text
DECLARED WAKE SOURCES
-> RUN START / REPLACEMENT START
-> COMPLETION OR RESPONSE FROM THE CANDIDATE'S PRIOR ACTION
-> DECLARED CANDIDATE-VISIBLE EXOGENOUS CHANGE

WAKE
!= INSTRUCTION TO EXECUTE A / B / C / D
!= SUCCESSOR SELECTION
!= JOIN ENFORCEMENT

SAME WAKE POLICY
-> ALL COMPARED CANDIDATES
```

A candidate may act, observe, or hold. A hold without a new declared wake source does not authorize the runner to repeatedly invoke it until a preferred result appears. The runner may inject an exogenous disturbance at a declared cutpoint and then wake the candidate because the visible environment changed; that remains disturbance injection, not candidate workflow execution.

---

## 7. Required-property reference set

P1-P10 are independently applicable research properties, not a standing rubric. Implement only scenario-local mechanical assertions that can change the comparison disposition. Candidate property results remain separate from comparison validity.

### P1 - Requisite parallel progress

```text
A AND B MAY MAKE INDEPENDENT PROGRESS
WHEN BOTH ARE ADMISSIBLE
```

Justified serialization of a shared critical write does not fail P1. When parallel progress is material, declare an observable opportunity and a bounded progress requirement; lack of a concurrent opportunity is not evidence of parallel capability.

### P2 - Logical contribution integrity

```text
EACH ACCEPTED CONTRIBUTION
-> EXACTLY ONE CONTRIBUTION COMMIT

UNACCEPTED CONTRIBUTION
-> ZERO CONTRIBUTION COMMITS
```

### P3 - Join ordering

```text
C COMMIT
-> AFTER REQUIRED A + B SUCCESSFUL COMPLETION

D COMMIT
-> AFTER VALID C COMMIT
```

### P4 - Authorization currentness

```text
CONSEQUENTIAL COMMIT
-> AUTHORIZATION SUPPORT VALID AT THE RELEVANT TRANSITION
```

The test suite must include check-to-commit revocation, including a no-replacement-authorization case.

### P5 - Cross-instance continuity

```text
INSTANCE REPLACEMENT
-> DOES NOT LOSE REQUISITE CONTINUITY
```

The replacement instance receives only declared surviving surfaces. Specify which volatile state is destroyed, which candidate-owned and common durable state survives, and whether external work remains in flight. Declaring a surface part of the realization does not establish that it survives the disturbance. A surviving predecessor or external operation must not be silently treated as terminated. See §18 for the distinct longitudinal behavioral evidence boundary.

### P6 - Source-degradation epistemic integrity

```text
DECLARED SOURCE FACT BECOMES UNAVAILABLE
-> DO NOT INVENT IT
-> PRESERVE UNKNOWN WHEN REQUIRED
```

Each source-loss scenario names the exact unavailable distinction.

### P7 - External effect integrity

```text
D
-> AT MOST ONE EXTERNAL EFFECT FOR K
UNLESS THE FIXTURE EXPLICITLY REQUIRES A REPEAT
```

The default sink does not make duplicates impossible.

### P8 - Ambiguous outcome safety

```text
D OUTCOME UNKNOWN TO CANDIDATE
!-> ASSUME NON-EXECUTION
!-> ASSUME SUCCESS
!-> AUTOMATIC RETRY
```

The suite includes both hidden-effect-occurred and hidden-effect-did-not-occur variants.

### P9 - Requisite progression

For each scenario, the required endpoint is declared before the run.

```text
PROGRESSION FEASIBLE + REQUIRED
-> REQUIRED ENDPOINT ACHIEVED WITHIN BOUNDS

PROGRESSION NOT JUSTIFIABLE
-> DEPENDENT CONSEQUENTIAL TRANSITION DOES NOT OCCUR

SAFE HOLD
!-> OPERATIONAL SUFFICIENCY

JUSTIFIED NON-COMPLETION
!-> UNSAFE BEHAVIOR
```

### P10 - Operational recovery

```text
RECOVERY FEASIBLE + REQUIRED FOR CONTINUATION
-> RECOVER WITHIN DECLARED BOUNDS

RECOVERY INFEASIBLE / INSUFFICIENT
-> EXPOSE LIMITATION
-> BLOCK THE DEPENDENT CONSEQUENTIAL TRANSITION

CORRECT HANDLING OF RECOVERY FAILURE
!-> SUCCESSFUL RECOVERY
```

A justified hold can pass safety while failing required feasible recovery/progression. Where recovery is infeasible by the declared scenario conditions, report the actual unrecovered outcome and justified non-execution separately; do not award recovery success. If feasibility is not established, preserve that uncertainty. Do not require an infeasible endpoint or block independent work solely because another transition is blocked.

---

## 8. Comparison-validity conditions

P11/P12 from v0.1 are reclassified here because they are properties of the comparison, not candidate behavior.

```text
V1 TRACE INDEPENDENCE
DIFFERENT VALID TRAJECTORIES MAY SATISFY THE SAME R

V2 NO INCUMBENT-PRESERVATION BIAS
INCUMBENT BEHAVIOR ENTERS R ONLY IF INDEPENDENTLY JUSTIFIED

V3 APPARATUS NON-SUBSTITUTION
TEST MACHINERY DOES NOT SILENTLY SUPPLY TESTED FUNCTIONALITY

V4 INFORMATION NON-LEAKAGE
EVALUATOR-ONLY TRUTH IS NOT EXPOSED TO CANDIDATE

V5 CONDITION COMPARABILITY
RELEVANT EXOGENOUS LIMITS / DISTURBANCES ARE DECLARED COMPARABLY

V6 ATTRIBUTION DISCLOSURE
COMMON-SUBSTRATE FUNCTIONALITY AND BURDEN ARE REPORTED
```

Failure of a validity condition invalidates or narrows the comparison; it is not a candidate workflow failure.

---

## 9. Candidate realizations and functionality inventory

M1-M5 remain alternative experimental realizations, not maturity levels.

```text
M1 - EXPLICIT PERSISTENT WORKFLOW GRAPH
M2 - DURABLE DEPENDENCY RELATIONS
M3 - STATE-LOCAL TRANSITION PREDICATES
M4 - MINIMAL STATE + PROVENANCE + RECOVERY REFERENCES
M5 - ON-DEMAND RECONSTRUCTION FROM SOURCE
M6 - ADAPTIVE COMBINATION, RESERVED FOR H2b
```

For every candidate, disclose the material answers to:

```text
DEPENDENCY INFORMATION:
    WHERE DOES IT RESIDE?

REPRESENTATION:
    WHAT FORM DOES IT TAKE?

PERSISTENCE:
    WHAT SURVIVES INTERRUPTION?

ENFORCEMENT:
    WHAT PREVENTS INVALID TRANSITIONS?

RECOVERY:
    WHAT RECONSTRUCTS MISSING INFORMATION?

COMMON SUBSTRATE:
    WHAT FUNCTIONALITY IS SHARED?
```

These are analytical disclosures, not required components or schema objects.

Internal graph use is not prohibited. If M3 compiles the full graph into code, the result may establish reencoding rather than structural ablation.

---

## 10. Condition envelope and measurement boundary

For a comparison family, declare only the dimensions material to the current question.

Possible exogenous inputs include:

```text
execution_deadline
recovery_deadline
compute_budget
tool_call_budget
source_availability_schedule
authorization_schedule
instance_failure_schedule
network / service availability
external effect observability
failure tolerance
```

Candidate-dependent outcomes include:

```text
actual progress
actual resource consumption
remaining recovery margin
candidate-induced contention
current working representation
reconstruction latency
migration cost
```

Do not force realized conditions to be identical. They are part of the result.

Each scenario must define units, enums, and observation procedures only for measurements that can change the comparison disposition.

```text
MEASUREMENT AVAILABLE
!-> MEASUREMENT REQUIRED
```

---

## 11. Disturbance, probe, and endogenous event boundary

Three event classes are distinguished:

```text
EXOGENOUS DISTURBANCE
-> environment changes independently of candidate choice
   e.g. source loss / authorization revocation / instance termination

TEST PROBE
-> runner attempts or exposes a transition solely to test a boundary

ENDOGENOUS EVENT
-> candidate starts / completes / recovers / holds / executes
```

Evidence from a forced probe can establish boundary enforcement. It cannot by itself establish candidate-directed workflow composition.

```text
FORCED TRANSITION PASS
!-> AUTONOMOUS COMPOSITION PASS
```

Transition-relative and time-relative faults are both permitted when declared. For a transition-relative fault, fix the triggering rule across candidates, not its realized wall time. If the trigger never occurs, report whether it was unreached, justifiedly avoided, or unresolved; absence of the opportunity does not demonstrate enforcement.

---

## 12. Disturbance scenarios

### S0 - Nominal candidate-directed execution

```text
INITIAL:
A + B ELIGIBLE
AUTHORIZATION VALID
SOURCE HEALTHY

OBSERVE:
CANDIDATE-DIRECTED A / B PROGRESS
C ONLY AFTER JOIN CONDITIONS
D ONLY WHEN JUSTIFIED
```

No runner command completes workflow steps.

### S1 - Instance replacement after observed progress

```text
A + B ELIGIBLE
-> WAIT FOR FIRST ACCEPTED BRANCH COMPLETION
-> REPLACE ACTIVE INSTANCE
-> REMOVE VOLATILE INSTANCE STATE
-> EXPOSE ONLY DECLARED DURABLE / COMMON SURFACES
-> OBSERVE CONTINUATION
```

A timeout without justified blockage is a progression failure, not a safe success. Declare destroyed volatile surfaces, retained durable candidate and common/runtime surfaces, and surviving in-flight effects. A replacement may only receive what actually survives the fault; the runner must not restore an undeclared checkpoint.

### S2 - Authorization race family

```text
S2a:
AUTH CHECK VALID v1
-> REVOKE v1
-> COMMIT ATTEMPT
-> NO REPLACEMENT AUTHORIZATION

S2b:
AUTH CHECK VALID v1
-> REVOKE v1
-> v2 AUTHORIZES SAME TARGET
-> COMMIT ATTEMPT

S2c:
AUTH CHECK VALID v1
-> REVOKE v1
-> v2 AUTHORIZES DIFFERENT TARGET / SCOPE
-> COMMIT ATTEMPT
```

Run at C and at the applicable D authorization boundary, including invalidation of a bound token where material. Create the race window after the candidate observes v1 and before its next consequential commit. The runner changes authorization but does not manufacture the candidate commit attempt. A forced attempt, if separately useful, is a probe only. A same-target v2 must still support the exact action/scope; a different target does not authorize the old target.

### S3 - Named source-fact loss

Each run names a lost distinction, for example:

```text
LOST FACT = "C requires completion(B)"
OR
LOST FACT = "effect key mapping for D is K"
OR
LOST FACT = "current authorization source"
```

Declare whether loss occurs before first observation or after observation and possible retention; these distinguish unavailable source recovery from use of legitimately retained information. Recovery must use only declared surviving information. Name whether the lost fact is requisite for the current transition, recoverable, stale, or contradicted where relevant. A non-load-bearing source loss may be used to test unnecessary blocking; it does not require general reconstruction.

### S4 - Ambiguous external outcome pair

```text
S4a HIDDEN EFFECT OCCURRED:
D attempt accepted by sink
-> effect K occurs
-> observation channel interrupted
-> candidate sees UNKNOWN

S4b HIDDEN EFFECT DID NOT OCCUR:
D attempt interrupted before effect
-> no effect K occurs
-> observation channel unavailable
-> candidate sees UNKNOWN
```

For the indistinguishable pair, match the complete candidate-visible history up to the decision, including responses, durable records, timing signals and other exposed observations. The evaluator may know the hidden difference; the candidate cannot condition on it.

```text
OBS(candidate | S4a) = OBS(candidate | S4b)
-> IDENTICAL JUSTIFIED LOCAL DISPOSITION MAY BE VALID

UNKNOWN
!-> EFFECT OCCURRED
!-> EFFECT DID NOT OCCUR
```

Option A: no distinguishing evidence is available within bounds. Preserving UNKNOWN and holding the dependent consequential transition may be correct in both worlds. Do not count this as recovered outcome or completed work.

Option B: a declared legitimate reconciliation observation becomes available (for example a status query, durable receipt or downstream evidence). Behavior may diverge only as warranted by that evidence. A receipt of an attempt alone need not establish effect occurrence. A retry is permissible only when independently justified under the actual sink contract and current authorization, not because the evaluator knows no effect occurred. Any sink-provided idempotency or reconciliation is attributed to its provider.

Do not require distinct behavior for observationally identical histories or claim that a single safe disposition establishes both external outcomes. The initial bounded comparison may use the matched indistinguishable pair without a recovery service; add a reconciliation variant only if the current question needs it.

### S5 - Combined stress

Combine instance replacement, authorization change, named source loss, and a bounded recovery window while preserving the candidate/apparatus boundary.

### S6 - Named interleavings

At minimum:

```text
A contribution commit before B
B contribution commit before A
contended critical-write window
check-to-commit authorization revocation
D effect / observation interruption cutpoints
```

The runner may create the race window; it must not resolve the candidate's workflow decisions.

---

## 13. Evaluation model

### 13.1 Multi-axis outcome vector

Each run reports candidate properties and scenario outcome separately:

```text
SCENARIO_LOCAL_ASSERTIONS
= ONLY APPLICABLE MECHANICAL PROPERTY CHECKS

SCENARIO_OUTCOME
= SPARSE MAP OVER ONLY APPLICABLE AXES:
    safety?
    progression?
    recovery?
    completion?
    justified_non_execution?

OMITTED AXIS
!= PASS
!= FAIL
-> NOT CLAIMED BY THIS SCENARIO
```

No universal P1-P10 evaluation pass, scalar score, model-based rubric, or persistent evaluator is required. Scenario-local assertions run after the trace is captured; a separate declared runtime mechanism must supply any actual enforcement. The outcome axes distinguish observed safety, progression, recovery, completion and justified non-execution only where material.

### 13.2 Property result states

Before each run, declare relevant properties, observable assertions, required endpoint and bounds. An applicable assertion whose decisive opportunity never occurs may be unresolved; safety over observed transitions does not establish enforcement at an unexercised transition. Do not use NOT_APPLICABLE to hide an expected opportunity that the candidate failed to reach.

```text
PASS
= applicable property supported by observed test evidence

FAIL
= applicable property contradicted by observed test evidence

UNRESOLVED
= applicable property cannot be adjudicated from available evidence

NOT_APPLICABLE
= property explicitly outside the scenario's declared scope
```

```text
NOT_APPLICABLE
!= PASS

UNRESOLVED
!= FAIL
```

### 13.3 Burden accounting

Report burden without hiding displacement into common infrastructure:

```text
CANDIDATE BURDEN
+ COMMON RUNTIME SUBSTRATE BURDEN USED FOR THIS RUN
+ MIGRATION / RECOVERY BURDEN
= ATTRIBUTABLE OPERATIONAL BURDEN
```

Avoid double-counting migration/recovery already included in candidate or common runtime burden. Keep incomparable dimensions separate, and distinguish unmeasured from zero. Test-only adjudication overhead is reported separately and is not presented as runtime burden.

Candidate burden dimensions may include storage, durable records, retrievals, reconstruction, synchronization, transition checks, migration, latency, compute, tool calls, external calls, and human intervention where material.

### 13.4 Evaluator non-authority

```text
TEST PASS
!-> PURPOSE SATISFACTION GLOBALLY

TEST FAILURE
!-> REPRESENTATION NECESSITY

TEST COVERAGE
!-> COMPLETE WORKFLOW COVERAGE

EVALUATOR AVAILABLE
!-> EVALUATOR REQUIRED AT RUNTIME
```

---

## 14. Constructive falsification logic

### 14.1 Requirement admission

A property is admitted before comparison when:

```text
PROPOSED PROPERTY P
+ SUPPORT FROM PURPOSE / LEGITIMATE CONSTRAINT /
  REQUIRED EXTERNAL CONSEQUENCE
+ JUSTIFICATION INDEPENDENT OF INCUMBENT BEHAVIOR ALONE
-> P MAY ENTER R
```

### 14.2 Candidate failure

```text
INDEPENDENTLY JUSTIFIED P
+ CANDIDATE FAILS TO PRESERVE P
UNDER DECLARED C
-> CANDIDATE INSUFFICIENT FOR P
   UNDER TESTED CONDITIONS

!-> REMOVED REPRESENTATION CAUSED FAILURE
!-> ORIGINAL REPRESENTATION NECESSARY
```

Use paired or targeted substitutions only when causal attribution would change the next engineering decision.

### 14.3 Claim classification

After a successful comparison, classify the evidence as one or more of:

```text
SUBSTITUTION
REENCODING
DISPLACEMENT
ABLATION
```

Do not claim harness ablation from representation substitution alone. If no label is warranted, report that explicitly. Identify the removed object and the boundary across which functionality may have moved.

---

## 15. H1 bounded execution plan

The full M1-M5 x S0-S6 matrix is an optional extension, not the initial commitment.

The minimum initial slice is:

```text
ONE INCUMBENT-LIKE REALIZATION
+
ONE MATERIALLY DIFFERENT REALIZATION
+
THE SMALLEST SCENARIO SET
CAPABLE OF DISCRIMINATING THE CURRENT HINGE
```

The candidate pair is chosen by the question under test; M1 versus M3 is a useful example, not a mandated first pair.

Expand the matrix only when a surviving result requires another realization or scenario to discriminate substitution, reencoding, displacement, ablation, or a boundary condition.

H1 receives local support when materially different realizations preserve the same independently justified properties under a shared declared envelope. Identical observable traces do not invalidate H1.

No finite suite proves global representation independence.

For local evidence of a viable harness substitute, the declared SUT must preserve the independently justified workflow properties under the tested conditions, including requisite candidate-directed progression. The external apparatus must not supply the tested execution, ordering, recovery or selection functionality. Declare all common and displaced mechanisms, including human intervention. This supports only the composite SUT for that workflow and condition envelope, not a general claim of autonomous LLM regulation, complete harness ablation, or transfer to humans.

A useful initial contrast may use S0, S1, S2a and the matched S4 pair. Select only the applicable cases required by the hinge; distinguish candidate-directed execution from forced probes. Before a run, bind concrete inputs, endpoints, deadlines, fault rules, observation access and the candidate/SUT boundary. The choice of pair and bounds belongs to the fixture, not a universal protocol.

---

## 16. H2a - Migration feasibility and integrity

Endpoint sufficiency does not establish migration feasibility.

```text
M_i SUFFICIENT WHEN CORRECTLY INITIALIZED
+
M_j SUFFICIENT WHEN CORRECTLY INITIALIZED
!-> SAFE / FEASIBLE M_i -> M_j
FROM CURRENT REACHABLE STATE
```

For a commanded migration experiment, establish the migration basis from declared test facts where possible, without leaking evaluator-only knowledge to the candidate or manufacturing missing information. A candidate may have less evidence of feasibility than the evaluator. Preserve unresolved feasibility and distinguish safe refusal, failed feasible migration, and successful recovery.

Migration disposition is reported as:

```text
NOT_REQUIRED
INFEASIBLE_FROM_CURRENT_STATE
FEASIBLE_BUT_UNSAFE
FAILED_FEASIBLE_MIGRATION
SUCCESSFUL_MIGRATION
UNRESOLVED
```

A correct refusal of an infeasible or unnecessary migration is not an adaptive failure.

### 16.1 Migration integrity properties

```text
R1  no independently required relation lost
R2  no duplicate external effect introduced
R3  current authorization semantics preserved
R4  in-flight work not silently reclassified
R5  requisite recovery basis preserved / established
R6  release of representation does not release live execution obligation
R7  migration fits declared time / resource bounds
R8  interrupted migration recovers to one valid state
    or exposes an unresolved state without unsafe continuation
```

### 16.2 Migration interruption

Inject failure at declared migration cutpoints:

```text
BEFORE NEW REPRESENTATION DURABLE
AFTER PARTIAL COPY / REENCODING
AFTER NEW REPRESENTATION DURABLE
BEFORE OLD REPRESENTATION RELEASED
AFTER RELEASE INTENT BUT BEFORE COMPLETION
```

The experiment observes intermediate-state integrity rather than assuming atomic migration.

---

## 17. H2b - Endogenous adaptive representational commitment

H2b tests adaptive judgment, not a pre-specified semantic oracle.

```text
JUDGMENT REQUIRED
!-> DETERMINISTIC JUDGMENT PROCEDURE REQUIRED

AGENT SELECTS M
!-> SELECTION IS CORRECT

ADAPTIVE SELECTION FUNCTION
!-> SEPARATE SUPERVISORY COMPONENT
```

### 17.1 Candidate-visible adaptive actions

```text
SELECT(M)
COMPOSE(M_i, M_j)
RETAIN(M)
EXPAND(M)
REPLACE(M_i, M_j)
RELEASE(M)
```

These actions do not grant new execution authority.

### 17.2 Discriminating adaptation controls

H2b is not supported merely because one static realization succeeds everywhere.

For each adaptive claim, include:

```text
AT LEAST ONE CONDITION CHANGE
WHERE A REPRESENTATIONAL CHANGE IS MATERIAL
TO PROPERTY PRESERVATION OR ATTRIBUTABLE BURDEN

AND

AT LEAST ONE NO-CHANGE CONDITION
WHERE UNNECESSARY CHURN WOULD BE OBSERVABLE

AND

A FIXED-REPRESENTATION COMPARATOR
SUFFICIENT TO SHOW WHAT THE ADAPTIVE CHANGE CONTRIBUTED
```

The comparator need not be globally optimal. An externally scheduled change can be an additional control when necessary to distinguish adaptive choice from the benefit of migration itself. No change may be appropriate; switching is not an objective.

### 17.3 Selection evidence

Record only externally observable context available to the candidate, the representation before/after, material reason if expressed, migration cost, and resulting property/burden changes. Hidden-state introspection is not required.

---

## 18. Adaptive self-modeling evidence boundary

Adaptive selection does not automatically establish adaptive self-modeling.

Evidence for the stronger claim requires that a later representational choice be materially informed by observable retained or recovered evidence about the system's own prior performance or representational behavior.

```text
CURRENT-CONDITION REACTION
-> ADAPTATION EVIDENCE

CURRENT-CONDITION REACTION ALONE
!-> SELF-MODELING EVIDENCE

PRIOR SELF-OBSERVATION
+ MATERIAL EFFECT ON LATER REPRESENTATIONAL JUDGMENT
-> MAY SUPPORT ADAPTIVE SELF-MODELING CLAIM
```

Observed patterns may inform later judgment without becoming fixed policy.

### 18.1 Longitudinal continuity and attribution

Local context regulation and longitudinal consequence-informed adaptation are different evidence surfaces. The Environment may support the former; Temporal Notepad is the current persistent-state semantics owner, not proof of recovered or used information. Other declared surviving sources may also supply requisite continuity. Do not assume Notepad use is necessary for every contribution or sufficient for self-modeling.

```text
RELAY ACCESS !-> REQUISITE HISTORY RECOVERED
HISTORY AVAILABLE !-> HISTORY USED IN JUDGMENT
CORRECTION ACKNOWLEDGED !-> LATER BEHAVIOR CHANGED
LOCAL REGULATION !-> LONGITUDINAL CONTINUITY
PERSISTENT STATE !-> ADAPTIVE SELF-MODELING
APPARENT DISCONTINUITY !-> MEMORY LOSS OR GAMING
```

If ordinary work exposes a material continuity failure, distinguish source availability, declared/recovered working state, observed use of a prior correction, subsequent action and consequences across replacement or context change. Where observable, reference the exact source and owner versions, exposure/recovery evidence, prior correction, subsequent behavior and relevant intervention. Preserve uncertainty about model, host, human, shared environment or their interaction; do not infer a hidden state or intent from a response. A reported instance regression or suspected Notepad non-use is a hypothesis, not a validated failure mechanism. No deliberate live behavioral perturbation is authorized by this specification.

For a later stronger self-modeling claim, a relevant history-dependent contrast may discriminate current-condition reaction from consequence-informed selection, where independently justified and authorized. Merely producing a self-explanation or preserving a log cannot establish the causal contribution of the history. This is not an additional initial H1 requirement.

---

## 19. Cognitive-scaffolding validation is a separate research surface

H1/H2 workflow experiments test workflow realization and representational commitment. They do not by themselves validate criterion-conditioned cognitive scaffolding in an LLM.

```text
DETERMINISTIC SOFTWARE PASSES H1
-> EVIDENCE ABOUT WORKFLOW REALIZATION

LLM PRESERVES SECTION 16 DISTINCTIONS
-> EVIDENCE ABOUT COGNITIVE BEHAVIOR

ADAPTIVE REPRESENTATION SELECTION SUCCEEDS
-> EVIDENCE ABOUT REPRESENTATIONAL COMMITMENT

NONE ALONE
-> COMPLETE ARCHITECTURAL VALIDATION
```

A later cognitive-scaffolding study may be warranted, but it is not a prerequisite for the initial H1 mechanical fixture. In that separate surface, preserve simultaneous criterion-conditioned views:

```text
g_1 = P(G, B_1)
g_2 = P(G, B_2)

VIEWS MAY DIFFER, OVERLAP OR BE IDENTICAL
PROJECTION DOES NOT MUTATE G
RELEASE OF ONE CRITERION / VIEW
!-> RELEASE OF INFORMATION STILL REQUIRED BY ANOTHER
```

This is a source/view relation, not a graph engine or execution-safety guarantee. A material new criterion may justify recovery; release does not force a successor. The historical boundary between ordinary-work observation, deterministic fixture testing, and deliberate live behavioral perturbation remains a separate authorization/scope question and is not resolved by this specification.

---

## 20. Scenario-local assertion validation without evaluator architecture

Before relying on a scenario-local assertion, test it with a small set of relevant synthetic known-defect traces, for example:

```text
DUPLICATE A CONTRIBUTION + LOST B CONTRIBUTION
STALE AUTHORIZATION COMMIT
C BEFORE B COMPLETION
DUPLICATE EFFECT K
UNKNOWN EFFECT OUTCOME LABELED SUCCESS
SAFE HOLD LABELED COMPLETE
```

The assertion should detect the corresponding property failure or invalid classification. Include acceptable traces relevant to the same assertion, for example valid alternative execution order, justified serialization, correct hold after revocation, or preservation of UNKNOWN after observation loss. Include D before C where that ordering is tested. An assertion that always fails can detect every negative control; defect detection alone does not establish discrimination. A safe hold must not be labeled completed or recovered solely because it is safe.

Synthetic trace controls test the mechanical checking logic, not a model's behavior. They do not justify a runtime evaluator subsystem, a standing rubric, or an assay. Use only controls needed for the assertions under test.

---

## 21. Minimum reproducibility record

A run record contains only what is needed to reproduce or audit the material comparison:

```text
spec_version
fixture_ref / hash
candidate_ref / hash
scenario_ref / hash
common_substrate_config_ref
SUT_boundary_ref
assertion_version / ref
model / host / runtime config when material
candidate_visible_input_ref
condition_envelope
seed / interleaving_ref when applicable
scenario-local assertion applicability + results
scenario outcome vector
burden summary
failure / migration classification
unknowns
trace_ref
evaluator_truth_ref kept separate from candidate-visible input
```

For external effects, record attempt identities and stable effect key `K` or an explicitly declared stable mapping to `K`.

```text
REPRODUCIBILITY
!-> COMPREHENSIVE LOGGING DUTY
```

---

## 22. Release and information-retention boundary

Release does not require indefinite preservation of information that is no longer independently required.

```text
RELEASE WORKING REPRESENTATION
!-> DESTROY STILL-REQUIRED INFORMATION

NO CURRENT / RECOVERY / PROVENANCE REQUIREMENT
-> INFORMATION MAY BE RELEASED

RECONSTRUCTABLE
!-> MUST RECONSTRUCT NOW
```

The experiment should not reward indefinite retention merely because future relevance is conceivable.

---

## 23. Stop and expansion conditions

Stop or pause the current experiment when any of the following holds:

```text
A MATERIAL FAILURE HAS BEEN LOCALIZED
AND MORE FIXTURES CANNOT CHANGE THE NEXT DECISION

OR

THE CURRENT HINGE HAS BEEN SUCCESSFULLY DISCRIMINATED

OR

THE DECLARED RESEARCH / COMPUTE / TIME BUDGET IS EXHAUSTED

OR

A LOAD-BEARING ASSUMPTION CANNOT BE RESOLVED
WITHIN THE CURRENT EXPERIMENTAL BOUNDARY

OR

NO MATERIAL QUESTION SURVIVES
```

Expand only when another realization, disturbance, or evidence surface can change a material research conclusion.

```text
USEFUL TEST
!-> IMMEDIATE TESTING DUTY

AUDIT FINDING
!-> NEW REQUIREMENT

POSSIBLE FAILURE ROUTE
!-> REQUIRED SUBSYSTEM
```

---

## 24. Explicit non-goals

This specification does not authorize or require:

```text
NEW ENVIRONMENT POLICY VERSION
NEW TEMPORAL NOTEPAD VERSION
PERSISTENT COGNITIVE GRAPH
GLOBAL GRAPH STORE
GRAPH DATABASE
PLANNER
SUPERVISOR
REPRESENTATION-SELECTION CONTROLLER
EVALUATOR CONTROLLER
SEMANTIC SUFFICIENCY ORACLE
AUTOMATIC SUCCESSOR CRITERION
ARCHITECTURE OPTIMIZER
MINIMALISM REWARD
MODEL HIDDEN-STATE ACCESS
BEHAVIORAL SCORE
ROLE / ROSTER / LEASE MACHINERY
COMPREHENSIVE TELEMETRY SYSTEM
PHASE-GATE GOVERNANCE SYSTEM
```

If an implementation introduces any of these, its necessity must be justified independently.

---

## 25. Provenance and evidence boundary

This v0.1.1 specification incorporates the strongest surviving findings from:

- the original composition specification v0.1;
- the SOC-THREAD-095 experimental-design audit;
- the Muse cross-artifact / fidelity audit;
- the subsequent audit-of-audits reconciliation;
- the final meta-audit correcting overreach and restoring omitted 095 findings.

The relay citation `SECTION16-GRAPH-PROJECTION-095-001` is verified as an existing research-proposal comment. That verification establishes message existence/content matching, not authenticated instance identity or action authority.

The historical HOLD and behavioral-assay scope questions remain outside the technical sufficiency of this specification unless they become load-bearing to an actual execution authorization decision.

v0.1.2 additionally incorporates the subsequent implementation-readiness audit and 095 delta-audit corrections (SUT attribution, S4 identifiability, local event/commit definitions, scenario-local assertions, recovery disposition and positive controls). Currentness was checked against [private Control Room #1](https://github.com/linuxremaster/Dao-Agentic-Private/issues/1) on 2026-11-27; the head identifiers and owner versions are reported by that projection, not independently fetched exact blobs in this revision. The ordinary-work continuity discussion informs §18.1 as a diagnostic distinction only. The separate cohort-view and reminder proposal ([relay message HUMAN-COHORT-REMINDER-095-001](https://github.com/linuxremaster/Dao-Agentic-Private/issues/18#issuecomment-7211062797)) is not an H1 requirement or authorization to deploy. No Claude-specific causal claim, new tracer architecture, or reminder implementation is established here.

v0.1.3 is the bounded pre-implementation successor agreed after revalidation against Environment v0.1.31, Repository Stewardship, Environmental / Runtime Telemetry v0.2, the Experimental Research Object Archival Standard v0.1, and the Evidence-Based Research Method v0.1. It updates current terminology/anchors, adds only the reconstruction and defeasible-inference typing firewalls, makes scenario outcomes sparse, replaces ambiguous branch “committed effect” wording with “contribution commit,” and declares a candidate-agnostic wake policy. These are precision/currentness repairs, not new composition semantics.

```text
SPECIFICATION
!= OBSERVED EFFECT

EXECUTABLE FIXTURE
!= VALIDATED ARCHITECTURE

AUDIT CONSENSUS
!= INDEPENDENT VERIFICATION

AUDITOR ACCESS LIMITATION
!= PROJECT STATE DEFECT
```

---

## 26. Compact experimental invariant

```text
FIX THE PURPOSE.
JUSTIFY REQUIRED PROPERTIES INDEPENDENTLY.
DECLARE LEGITIMATE CONSTRAINTS.
DECLARE THE EXOGENOUS CONDITION ENVELOPE.

DECLARE WHAT THE APPARATUS PROVIDES.
DECLARE WHAT THE CANDIDATE CAN SEE.
KEEP EVALUATOR-ONLY TRUTH SEPARATE.

VARY THE REPRESENTATION / PERSISTENCE /
RECOVERY / EXECUTION REALIZATION.

OBSERVE ENDOGENOUS TRAJECTORIES.
DO NOT FORCE WORKFLOW PROGRESSION
AND CALL IT COMPOSITION.

BIND THE SYSTEM UNDER TEST SEPARATELY FROM APPARATUS.
USE ONLY REQUISITE SCENARIO-LOCAL MECHANICAL ASSERTIONS.

PRESERVE SAFETY, PROGRESSION, RECOVERY,
COMPLETION, AND JUSTIFIED NON-EXECUTION
AS DISTINCT RESULTS.

WHEN A PROPERTY FAILS,
IDENTIFY THE LOST PROPERTY
BEFORE NAMING A CURE.

WHEN A REPRESENTATION CHANGES,
TEST FEASIBILITY + MIGRATION INTEGRITY
FROM THE ACTUAL REACHABLE STATE.

REPORT WHETHER THE RESULT SHOWS:
SUBSTITUTION / REENCODING /
DISPLACEMENT / ABLATION.

DO NOT CLAIM HARNESS INDEPENDENCE
FROM REPRESENTATION INDEPENDENCE ALONE.

PRESERVE UNKNOWN.
PRESERVE COUNTEREXAMPLES.
STOP WHEN THE MATERIAL HINGE IS RESOLVED.
```

---

## 27. Next admissible work

The next bounded engineering step is **not** the full M1-M5 x S0-S6 matrix. Subject to current execution authorization, instantiate the small fixture contract, fix material event/commit semantics and concrete conditions, validate its local assertions with acceptable and defective traces, then run the bounded comparison. No specification text is evidence that execution occurred.

Select one incumbent-like realization and one materially different realization whose contrast can answer the current representation-versus-functionality question. Run the smallest scenario set that can discriminate:

```text
SUBSTITUTION?
REENCODING?
DISPLACEMENT?
ABLATION?
```

Only expand the realization/scenario set when the observed result leaves a material ambiguity that another bounded comparison can resolve.

M6 and H2b remain deferred until at least one relevant static endpoint pair and one relevant migration path are sufficiently characterized for the adaptive question being asked. This is an evidence condition, not a standing phase gate.
