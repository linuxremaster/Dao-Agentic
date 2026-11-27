# Dao Agentic — Repository Stewardship

**Status:** CORE PROJECT PRINCIPLE / OPERATIONAL REPOSITORY-MAINTENANCE REQUIREMENT

Stewardship preserves source, provenance, recoverability, historical distinctions and currentness; reconciles accepted shared changes; verifies distribution; exposes blockers and uncertainty; and prevents silent loss. It complements non-destructive projection: a working view does not replace its richer source, and requisite source information must remain recoverable longitudinally. This is not an additional Environment or Temporal Notepad semantic rule.

## Shared requirements and privacy boundary

Core stewardship requirements must survive distribution. Private evidence, transcripts, sensitive provenance and coordination records may remain private. Classification is by semantic content, not merely the containing artifact. Extract public-safe shared requirements from private evidence without publishing that evidence. A shared update is incomplete while required distribution or verification is unresolved; record the blocker rather than claiming closure. No additional action authorization, permanent steward role or standing evaluator is created.

## Operational requirement — repository updates

Applies to authorized mutations of the project repositories, including private development and distribution of accepted shared artifacts to the public mirror. This is repository-maintenance discipline, not Environment/Temporal Notepad semantic policy, a new authority source, or a runtime obligation. Read-only work does not trigger it. The required outcomes are mandatory where applicable; equivalent mechanisms may satisfy them without reproducing the historical packaging ceremony.

1. **Bind and inspect the exact baseline.** Identify the current commit and affected source bytes/hashes before mutation. Compare the requested change to the current source; distinguish semantic, implementation, documentation, packaging, state, telemetry and provenance changes. Do not duplicate existing functionality or silently incorporate unrelated work.
2. **Make a bounded change.** Change the relevant source, not its derivative. Regenerate affected derivatives and update material references/checksums; independently version distinct artifacts. Preserve explicitly required historical information, source relationships, observations and recovery paths before removing or replacing an active surface. A disposable runtime is not disposable research history.
3. **Preserve reconstruction evidence.** For changed semantic sources retain an immediate explicit diff and verify forward and reverse application against the exact endpoint bytes. For other tracked changes an exact, recoverable Git patch and bound endpoints may suffice; retain a separate diff when needed for lineage or independent reconstruction. Do not rewrite historical diffs. Byte changes without semantic version changes still require recoverable provenance.
4. **Detect omissions.** For package/tree replacements or removals, compare expected and actual filesets, account for additions/removals/intentional omissions, and verify retained or archived material is actually recoverable. A hash, missing-file note or unreferenced commit alone is not durable retention. Do not proceed with destructive loss of requisite history; preserve it first or expose the unresolved recovery limitation.
5. **Verify the affected claim and publish coherently.** Check changed bytes, applicable tests, regenerated derivatives and checksum coverage at the relevant scope. Bind writes to the reviewed predecessor; use an atomic commit or another conflict-safe transition; do not overwrite intervening work. Read back the resulting change. Accepted shared changes must reach the public mirror in accordance with the existing distribution rule; private-only material remains private with an explicit omission reason. Record the actual result, residual uncertainty and any failed or omitted check. A proposed change, successful diff, checksum match or merge is not behavioral validation.
6. **Preserve corrections and stop.** Append material corrections/supersession with provenance rather than silently cleaning history. Do not turn maintenance into a standing evaluation, controller, score, or duty to inspect unrelated surfaces. Stop when the update and its applicable verification/recovery/distribution requirements are satisfied.

```text
EXACT BASELINE + BOUNDED DELTA
→ RECONSTRUCTABLE SUCCESSOR
→ VERIFIED INTEGRITY / RECOVERABLE HISTORY
→ CONFLICT-SAFE PUBLICATION

PATCH / INTEGRITY / RECONSTRUCTION
!= VALIDATED COGNITIVE EFFECT
```
