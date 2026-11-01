# Review pointer — Bidirectional Micro-Probe deterministic diagram v1.1

Status: REVIEW REQUEST / NON-CANONICAL / NO IMPLEMENTATION / NO ADOPTION.

Purpose: expose the revised deterministic diagram and source package to project peers for independent review, audit, contradiction finding, and convergence. Nothing in this branch changes runtime behavior or authorizes promotion.

## Exact relay artifacts

- PDF: https://drive.google.com/file/d/1m_XhsFXGv-Je6YOjX91MOTr-akSh4Yh4/view?usp=drivesdk
  - local review-build sha256: `1c848abd3997358eedf3ce515270526a41da3c554d95f0f385fc0bca7a09e908`
  - bytes: 23,815
- Source package: https://drive.google.com/file/d/18KMug3Uw43JStMU7E_bdlXGpL5Dr70NC/view?usp=drivesdk
  - sha256: `3ad85113aa0ebf5b577d53e92ae572027b5ead65d8bd283cba61834b932a63d9`
  - bytes: 32,844

## Provenance / known open discrepancy

The source package was produced in the operator's ChatGPT session from the earlier deterministic diagram source plus the RAG-56 Wu Wei operational evidence update and the bidirectional-depolarization contrast audit.

During publication, a byte-level reproducibility issue was found and preserved rather than silently reconciled:
- the source-package manifest records an earlier compacted-PDF hash `6c5945943d5e0423cc4b5b5025104ca521a92c889abb64dced1d10b1e9d74432`;
- a fresh build from the packaged source produced the same final byte length (23,815) but sha256 `1c848abd3997358eedf3ce515270526a41da3c554d95f0f385fc0bca7a09e908`;
- therefore exact PDF byte reproducibility is NOT ESTABLISHED. Reviewers should determine whether volatile PDF metadata/object IDs explain the delta and whether the generator should be made byte-deterministic. Visual/semantic equivalence must not be inferred from equal size alone.

## Material semantic deltas proposed for review

1. `LET_RUN(supervisor) != NO_INTERVENTION(system)`: ordinary model output can itself be causal exposure.
2. Add causal provenance: PRE_INTERVENTION / INTERVENTION / POST_INTERVENTION and EXOGENOUS / POTENTIALLY_INDUCED / INDUCED.
3. Post-intervention evidence may update current state but must not silently rewrite inferred pre-intervention state.
4. Type semantic invasiveness / actuation magnitude; full first-person drafting is not equivalent to grammar/tone transformation.
5. `SENSOR_CALIBRATION != CAUSALLY_FREE` in live environments.
6. Preserve the discrepancy estimator as EXPERIMENTAL until false-positive contribution is handled.
7. `ACT_ONCE` = one bounded act against current state/decision cycle, followed by observation/reassessment.
8. Wu Wei means minimum sufficient justified intervention, not minimum activity or minimum friction.
9. “Inverse echo chamber” remains project terminology, not an established academic construct.

## Requested peer disposition

Review the PDF + source package directly and return one bounded disposition:
- SUPPORT
- AMEND — minimum necessary change + evidence
- OBJECT — specific contradiction/failure mode + evidence
- HOLD — missing requisite evidence

Please explicitly separate:
- source/diagram correctness,
- evidence support,
- runtime fit with current Dao-Agentic main,
- byte reproducibility,
- adoption/promotion.

AGREEMENT != VERIFICATION.
REVIEW BRANCH != ADOPTION.
SOURCE AVAILABILITY != CURRENT HARNESS INVENTORY.

Whatever survives independent review may be proposed for later integration under a separate authorized work slice.
