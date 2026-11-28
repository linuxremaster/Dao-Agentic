# Dao Agentic — Evidence-Based Research Method v0.1

**Status:** SHARED RESEARCH METHODOLOGY / EVIDENCE-SELECTION REQUIREMENT  
**Scope:** Research and development questions concerning the Cognitive Architecture Runtime, its mechanisms, expected effects, experiments, simulations, and naturalistic development observations.  
**Authority boundary:** Research-method guidance only. This document does not own Environment or Temporal Notepad semantics, create action authorization, require a standing evaluator, or create a runtime controller.

## 1. Purpose

Dao Agentic uses an evidence-based research method to minimize intuition-driven architecture, redundant experimentation, and project-specific conceptual drift.

The method adapts established Evidence-Based Software Engineering (EBSE) practice: formulate answerable questions, find the best available evidence efficiently, critically appraise validity and applicability, use supported results in practice, and evaluate only what remains materially unresolved.

~~~text
INTUITION
→ MAY GENERATE A QUESTION / SEARCH TERM / CANDIDATE EXPLANATION

INTUITION
↛ EVIDENCE
↛ ESTABLISHED EFFECT
↛ IMPLEMENTATION REQUIREMENT
↛ CAUSAL ATTRIBUTION
↛ ACTION AUTHORIZATION
~~~

Research evidence may justify a working prior or design decision only at the scope actually supported.

## 2. Normalize terminology before searching

Project-specific vocabulary must not become an accidental search boundary.

~~~text
PROJECT TERM / LOCAL SHORTHAND
→ MAP TO ESTABLISHED SCIENTIFIC / ENGINEERING TERM(S)
→ INCLUDE MATERIAL SYNONYMS / ADJACENT TAXONOMIES
→ SEARCH

LEXICAL NOVELTY
↛ CONCEPTUAL NOVELTY

NO ADEQUATE ESTABLISHED TERM
→ RETAIN PROJECT TERM AS AN EXPLICIT COMPOSITE / DISTINCTION
→ SEARCH ITS COMPONENT CONSTRUCTS
~~~

This extends the repository's existing scientific-interoperability direction: established terminology is preferred where it preserves the distinction; project-specific language remains only when established terminology would collapse a load-bearing distinction.

## 3. Evidence-first selection sequence

For a load-bearing empirical or engineering question:

~~~text
QUESTION
→ NORMALIZE TAXONOMY / TERMINOLOGY
→ FORMULATE ANSWERABLE CLAIM OR UNCERTAINTY
→ SEARCH BEST AVAILABLE EXTERNAL EVIDENCE
→ SEEK SUPPORT + COUNTEREVIDENCE + BOUNDARY CONDITIONS
→ APPRAISE VALIDITY / RELEVANCE / TRANSFERABILITY
→ APPLY ONLY AT SUPPORTED SCOPE
~~~

This complements Environment v0.1.31 evidence-search semantics and does not replace them.

~~~text
ONLINE
= ACCESS MODE

ONLINE
↛ EVIDENCE CLASS
↛ QUALITY
↛ TRANSFERABILITY
~~~

A web-accessible source is candidate evidence. Its epistemic weight depends on what claim it can support, how it was produced, whether it is current enough, and whether its context transfers to the present question.

## 4. Reuse evidence before creating a new research experiment

~~~text
ADEQUATE + RELEVANT + TRANSFERABLE EXTERNAL EVIDENCE
→ USE THAT EVIDENCE
→ DO NOT RUN A LOCAL RESEARCH EXPERIMENT
   SOLELY TO REDISCOVER THE SAME EFFECT
~~~

A new local experiment is justified only when it can resolve a material uncertainty that the available evidence does not resolve, such as:

- transfer to the project's materially different environment;
- an interaction between mechanisms not covered by prior evidence;
- a project-specific implementation consequence;
- a contradiction, missing boundary condition, or unresolved causal alternative;
- a current provider / model / tool behavior that has materially changed since the source evidence.

~~~text
EVIDENCE EXISTS
↛ LOCAL TRANSFER ESTABLISHED

TRANSFER CLAIM
→ REQUIRES TRANSFER-RELEVANT SUPPORT
~~~

If the external evidence is sufficient for the present decision, further testing for reassurance alone is not required.

## 5. Research experiments are distinct from mechanical verification

Evidence reuse must not be misread as permission to leave local implementations mechanically unchecked.

~~~text
EXTERNAL RESEARCH EVIDENCE
→ MAY SUPPORT MECHANISM / EFFECT / DESIGN EXPECTATION

MECHANICAL VERIFICATION
→ CHECKS WHETHER OUR IMPLEMENTATION
  SATISFIES ITS DECLARED STRUCTURAL / CODE CONTRACT

MECHANICAL VERIFICATION
!= RESEARCH REPLICATION

PASSING UNIT / REGRESSION TEST
↛ EXTERNAL EFFECT REVALIDATED
↛ ARCHITECTURE VALIDATED
~~~

Examples of legitimate local mechanical verification include parsing, exact source binding, migration integrity, deterministic state transitions, checksum coverage, and regression protection for implemented behavior.

Do not build a behavioral assay merely because code was implemented.

## 6. When external evidence is insufficient

A bounded search that finds no adequate evidence does not prove that no evidence exists.

~~~text
NO ADEQUATE EVIDENCE FOUND
!= EVIDENCE DOES NOT EXIST
~~~

If the unresolved question is not load-bearing, preserve the uncertainty and continue admissible work.

If it is load-bearing, select the smallest research surface capable of discriminating the question.

### 6.1 Sandbox simulation

Use sandbox simulation when the relevant relationships can be represented sufficiently and simulation reduces cost, risk, or unnecessary production intervention.

~~~text
REPRESENTATION SUFFICIENT FOR QUESTION
+ SANDBOX CAN DISCRIMINATE MATERIAL OUTCOME
→ SIMULATION MAY BE PREFERRED

SIMULATION RESULT
→ EVIDENCE ABOUT THE SIMULATED MODEL / CONDITIONS
↛ AUTOMATIC PRODUCTION EFFECT
~~~

State assumptions, inputs, omitted interactions, and transfer limits explicitly. Do not tune the simulation so that it can only reproduce the preferred outcome.

### 6.2 Naturalistic production / ordinary necessary work

Use ordinary development or production observation when the real environment is itself load-bearing and simulation would remove interactions needed to answer the question.

~~~text
REAL ENVIRONMENT INTERACTION
= LOAD-BEARING TO QUESTION

+ ORDINARY NECESSARY WORK PROVIDES DISCRIMINATING SURFACE
+ CONSEQUENCE / RISK REMAINS ACCEPTABLE
→ OBSERVE NATURALISTICALLY
~~~

Observation should remain passive where no intervention is needed.

If the environment is deliberately manipulated to compare conditions, classify the work as a field experiment rather than ordinary observation.

~~~text
NATURALISTIC OBSERVATION
!= CONTROLLED EXPERIMENT
!= CAUSAL PROOF
~~~

## 7. Evidence type is question-dependent

No universal source ladder is sufficient for every question.

Examples:

- systematic reviews / meta-analyses may aggregate effect evidence;
- mapping or scoping reviews may establish terminology, research coverage, and evidence gaps without proving an effect;
- replicated or convergent primary studies may support a mechanism or boundary condition;
- formal standards and primary technical specifications may be the strongest evidence for protocol, format, or interface requirements;
- official provider documentation may establish current documented behavior but not necessarily empirical behavioral effects;
- naturalistic project data may provide strong local contextual evidence while remaining weak for broad generalization;
- grey literature, community reports, and anecdotal observations may identify hypotheses or field conditions but require proportional epistemic weight.

~~~text
SOURCE PRESTIGE
↛ AUTOMATIC SUFFICIENCY

SOURCE TYPE
→ MUST FIT CLAIM TYPE
~~~

## 8. Experiment-economy rule

Research burden is itself a project constraint.

~~~text
EXPERIMENT
+ NO MATERIAL INFORMATION GAIN
→ UNJUSTIFIED BURDEN

KNOWN EXTERNAL EVIDENCE
+ NO MATERIAL TRANSFER HINGE
→ REUSE EVIDENCE
→ STOP

UNRESOLVED MATERIAL HINGE
→ SELECT SMALLEST DISCRIMINATING METHOD
→ OBSERVE
→ PRESERVE RESULT
→ STOP WHEN HINGE RESOLVES OR CEASES TO MATTER
~~~

Do not convert uncertainty into a standing benchmark, rubric, assay, score, or permanent test suite unless the continued mechanism is separately justified.

## 9. Relationship to existing Dao Agentic surfaces

~~~text
ENVIRONMENT
→ evidence / judgment / action semantics

EVIDENCE-BASED RESEARCH METHOD
→ chooses how research evidence is sought or generated

REPOSITORY STEWARDSHIP
→ preserves source / provenance / recoverability

TELEMETRY
→ passively records externally observable consequences

ARCHIVAL STANDARD
→ preserves completed / frozen / superseded research objects
~~~

None of these surfaces silently executes another.

This methodology does not change Environment v0.1.31, Temporal Notepad v0.1.14, the telemetry v0.2 observation contract, or repository action authorization.

## 10. Compact decision rule

~~~text
LOAD-BEARING QUESTION
        |
        v
NORMALIZE TERMINOLOGY
        |
        v
SEARCH / APPRAISE EXTERNAL EVIDENCE
        |
        +--> SUFFICIENT + TRANSFERABLE
        |       → USE EVIDENCE
        |       → MECHANICALLY VERIFY LOCAL IMPLEMENTATION IF NEEDED
        |       → NO DUPLICATE RESEARCH EXPERIMENT
        |
        +--> MATERIAL TRANSFER HINGE
        |       → BOUNDED LOCAL EVIDENCE ONLY FOR THAT HINGE
        |
        +--> NO ADEQUATE EVIDENCE
                |
                +--> SANDBOX REPRESENTATION SUFFICIENT
                |       → SIMULATE
                |
                +--> REAL ENVIRONMENT LOAD-BEARING
                |       → ORDINARY / PRODUCTION NATURALISTIC OBSERVATION
                |
                +--> NEITHER JUSTIFIED
                        → PRESERVE UNKNOWN / HOLD IF REQUISITE
~~~

## 11. References / methodological precedent

- Kitchenham, B. A., Dybå, T., & Jørgensen, M. (2004). Evidence-Based Software Engineering. ICSE 2004. DOI: https://doi.org/10.1109/ICSE.2004.1317449
- Dybå, T., Kitchenham, B. A., & Jørgensen, M. (2005). Evidence-based software engineering for practitioners. IEEE Software, 22(1), 58–65. DOI: https://doi.org/10.1109/MS.2005.6
- Kitchenham, B. et al. (2010). Systematic literature reviews in software engineering — A tertiary study. Information and Software Technology, 52(8), 792–805. DOI: https://doi.org/10.1016/j.infsof.2010.03.006
- ACM SIGSOFT Empirical Standards for Software Engineering. https://www2.sigsoft.org/EmpiricalStandards/docs/standards
- Runeson, P., & Höst, M. (2009). Guidelines for conducting and reporting case study research in software engineering. Empirical Software Engineering, 14, 131–164. DOI: https://doi.org/10.1007/s10664-008-9102-8
- Ralph, P. et al. Guidelines for Conducting Software Engineering Research / Who, What, How of Software Engineering Research. Research-method taxonomy distinguishing field, lab, simulation, and data strategies.
- Feldt, R. et al. (2024). Evidence Tetris in the Pixelated World of Validity Threats. WSESE. DOI: https://doi.org/10.1145/3643664.3648203

## 12. Stop boundary

~~~text
ESTABLISHED / TRANSFERABLE EVIDENCE
→ USE IT

NO ADEQUATE EVIDENCE
→ SIMULATE OR OBSERVE PRODUCTION ONLY WHEN LOAD-BEARING

LOCAL IMPLEMENTATION
→ VERIFY MECHANICALLY AS NEEDED

INTUITION
→ RESEARCH LEAD ONLY

NO NEW INFORMATION EXPECTED
→ STOP
~~~
