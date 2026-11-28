# Dao Agentic — Experimental Research Object Archival Standard v0.1

**Status:** SHARED RESEARCH / ARCHIVAL INTEROPERABILITY STANDARD  
**Scope:** Experimental artifacts and completed/frozen research runs  
**Owner surface:** `research/standards/EXPERIMENTAL_RESEARCH_OBJECT_ARCHIVAL_STANDARD_v0.1.md`  
**Authority boundary:** Research-object preservation and repository/archive interoperability only. This document does not modify Environment or Temporal Notepad semantics, create an archival controller, create a role, authorize unrelated mutation, require public disclosure, or establish scientific validity.

## 1. Purpose

Dao Agentic preserves experimental implementations, datasets, results, limitations, negative results and provenance as research objects rather than inventing a project-specific archival format.

The minimal adopted stack is:

```text
RESEARCH OBJECT DESCRIPTION
→ RO-Crate 1.3

EXECUTION PROVENANCE
→ Process Run Crate 0.6
  WHERE EXECUTION PROVENANCE IS AVAILABLE / APPLICABLE

PACKAGE COMPLETENESS + FIXITY
→ BagIt 1.0 / RFC 8493

DISCOVERABILITY / INTEROPERABILITY / REUSE DIRECTION
→ FAIR PRINCIPLES

ADDITIONAL PROVENANCE RELATIONS
→ W3C PROV
  ONLY WHERE EXISTING RO-Crate / Schema.org / profile terms are insufficient
```

Use established vocabulary before project-specific metadata.

```text
EXISTING STANDARD TERM
→ PREFER STANDARD TERM

PROJECT-SPECIFIC RELATION
→ ADD ONLY WHEN A LOAD-BEARING DISTINCTION
  CANNOT BE REPRESENTED SUFFICIENTLY BY THE ADOPTED STANDARDS
```

## 2. Adopted and deferred standards

### Adopt now

1. **RO-Crate 1.3** — metadata representation for the research object.
   - Versioned conformance URI: `https://w3id.org/ro/crate/1.3`
   - Metadata file: `ro-crate-metadata.json`
   - Base vocabulary: Schema.org / JSON-LD as defined by RO-Crate.

2. **Process Run Crate 0.6** — conditional profile for execution provenance.
   - Use when a computational experiment/run can be described from available evidence.
   - Do not fabricate execution times, agents, inputs, outputs, software versions or parameters that were not retained.
   - Profile URI: `https://w3id.org/ro/wfrun/process/0.6`

3. **BagIt 1.0 / RFC 8493** — outer archival package for payload completeness and fixity.
   - Required BagIt declaration and payload manifest semantics apply.
   - Dao Agentic uses SHA-256 as the minimum repository-compatible payload/tag fixity algorithm.
   - SHA-512 MAY additionally be supplied.

4. **FAIR principles** — design guidance for findability, accessibility, interoperability and reuse.
   - Accessibility does not imply public access.
   - Authentication, authorization and private storage remain compatible with the project privacy boundary.

5. **W3C PROV** — reference vocabulary for provenance relations not already expressed adequately by RO-Crate / Schema.org / an adopted profile.
   - Prefer existing profile vocabulary before adding PROV terms.
   - No graph database is required.

### Defer until justified

- **OCFL** — consider if versioned archival-object storage requirements outgrow Git/BagIt/ordinary private storage.
- **PREMIS** — reference for preservation metadata if long-term preservation events/agents/rights require greater formalization.
- **OAIS** — reference model only; no OAIS infrastructure requirement.
- **DataCite** — use when publication/citation/identifier requirements justify it.

```text
REFERENCE STANDARD
↛ IMPLEMENTATION DUTY

DEFERRED STANDARD
↛ REJECTED STANDARD
```

## 3. Minimal archive package profile

For a completed/frozen experimental artifact, the preferred archival package is:

```text
<experiment-id>/
├── bagit.txt
├── bag-info.txt
├── manifest-sha256.txt
├── tagmanifest-sha256.txt
└── data/
    ├── ro-crate-metadata.json
    └── <preserved experiment payload>
```

`data/` is the RO-Crate root for the attached research object. The existing experiment payload MAY retain its internal directory structure unchanged beneath `data/`.

The original source package or exact source bytes MUST remain recoverable. Creating an archival package does not authorize destructive replacement of the source artifact.

```text
SOURCE ARTIFACT
→ PRESERVE

ARCHIVAL PACKAGE
→ DERIVED PRESERVATION REPRESENTATION

ARCHIVAL PACKAGE
!= SOURCE REWRITE
```

A ZIP/TAR representation of a completed bag MAY be used for transport after the BagIt/RO-Crate directory is created and validated.

## 4. Minimum RO-Crate requirements

`data/ro-crate-metadata.json` MUST be valid flattened/compacted JSON-LD using:

```json
"@context": "https://w3id.org/ro/crate/1.3/context"
```

It MUST describe:

1. the RO-Crate Metadata Descriptor;
2. the Root Data Entity;
3. any additional Data Entities or Contextual Entities required to understand/reuse the preserved experiment.

The metadata descriptor MUST include, at minimum:

```json
{
  "@id": "ro-crate-metadata.json",
  "@type": "CreativeWork",
  "about": {"@id": "./"},
  "conformsTo": {"@id": "https://w3id.org/ro/crate/1.3"}
}
```

The Root Data Entity MUST be a `Dataset` and MUST include a `datePublished`. It SHOULD include a human-readable `name`, `description`, and an accurate license/access description.

Dao Agentic's minimum research-object metadata SHOULD also preserve, where available:

- experiment identifier and version;
- research purpose / question;
- implementation/software artifacts;
- input datasets/source references;
- output/result artifacts;
- methodology or execution instructions;
- exact source/package hashes;
- predecessor / baseline references;
- limitations and known negative results;
- environment/runtime requirements;
- test/evaluation result references;
- contributor/agent attribution when established;
- access/privacy conditions;
- supersession/revision relations where applicable.

Unknown fields remain unknown.

```text
MISSING PROVENANCE
→ RECORD AS UNKNOWN / UNAVAILABLE

MISSING PROVENANCE
↛ INVENT METADATA
```

## 5. Process Run Crate profile

Apply Process Run Crate 0.6 when retained execution evidence is sufficient to describe a run.

Where declared, the Root Data Entity MUST declare the Process Run Crate profile in the manner required by the profile, and the run should identify the executed software (`instrument`) plus supported inputs (`object`) and outputs (`result`).

Use `CreateAction` / profile-native relations for actual executions. Do not create an execution activity merely because files coexist in one experiment package.

```text
FILES PRESENT
↛ EXECUTION ESTABLISHED

TEST OUTPUT PRESENT
+ BOUND EXECUTION EVIDENCE
→ MAY DESCRIBE PROCESS RUN
```

## 6. Provenance vocabulary

Prefer this order:

```text
RO-Crate / Schema.org
→ adopted RO-Crate profile terms
→ W3C PROV where needed
→ project-specific term only if necessary
```

Useful W3C PROV correspondences include:

```text
source / artifact
→ prov:Entity

experiment execution
→ prov:Activity

contributor / executing actor
→ prov:Agent

derivation
→ prov:wasDerivedFrom

input consumption
→ prov:used

generated result
→ prov:wasGeneratedBy

revision
→ prov:wasRevisionOf
```

These are representational relations, not authority or causal truth.

## 7. BagIt requirements

Each archived research object MUST be a complete BagIt 1.0 bag before it is called `PACKAGE VALID`.

At minimum:

```text
bagit.txt
→ BagIt-Version: 1.0
→ Tag-File-Character-Encoding: UTF-8

data/
→ complete payload

manifest-sha256.txt
→ every payload file exactly once under the SHA-256 manifest

tagmanifest-sha256.txt
→ every retained tag file intended for tag fixity
```

`bag-info.txt` SHOULD include, when available:

- `Bagging-Date`;
- `External-Identifier`;
- `External-Description`;
- `Payload-Oxum`.

BagIt completeness/fixity is independent of RO-Crate semantic metadata quality.

## 8. Repository / storage integration

Shared standards live in the shared repository. Sensitive experimental payloads do not become public merely because their archival standard is shared.

```text
SHARED
→ archival standard/specification
→ public-safe research-object metadata conventions
→ interoperability requirements

PRIVATE WHEN REQUIRED
→ transcripts
→ private corpora
→ sensitive databases
→ private provenance
→ restricted experiment payloads
```

Recommended repository topology:

```text
research/
├── standards/
│   └── EXPERIMENTAL_RESEARCH_OBJECT_ARCHIVAL_STANDARD_v0.1.md
└── experiments/
    └── <domain>/
        └── <experiment-id>/
            └── <archival object or recoverable reference>
```

The `research/experiments/` tree is an archival/research-history surface, not the active candidate-development surface.

```text
testing/
→ active candidates / experiments still under ordinary-use testing

research/experiments/
→ completed / frozen / superseded experimental evidence
  or recoverable references to private archival objects

verification/
→ repository/release verification, lineage and reconstruction evidence

telemetry/
→ passive longitudinal observations
```

Large or access-restricted research objects MAY reside in private Drive or another suitable private store if the repository contains a durable recoverable reference plus sufficient identity/fixity/provenance metadata.

```text
ARCHIVE AVAILABLE
↛ AUTOLOAD DUTY
↛ RETRIEVAL DUTY
↛ CURRENTNESS
↛ AUTHORITY
```

## 9. Archive admission boundary

An experiment MAY be archived when preservation is useful and one of the following holds:

- a bounded experiment/run is complete;
- a candidate is frozen or superseded;
- an implementation is being reconstructed/replaced and its evidence would otherwise become difficult to recover;
- negative results are materially informative;
- ordinary work demonstrates a preservation/discoverability need.

Archiving does not imply promotion, acceptance or validation.

```text
ARCHIVED
!= CURRENT
!= ADOPTED
!= VALIDATED
!= AUTHORITATIVE
```

## 10. Correction and versioning

Do not silently rewrite an archived research object to make history cleaner.

A material correction, rerun, migration or superseding interpretation SHOULD produce a new version/object or an explicit correction record that preserves the prior object and relationship.

Preservation-format migrations MAY produce a successor package if the source object remains recoverable and the migration relationship is explicit.

## 11. Validation layers

Keep these layers separate:

```text
BAG COMPLETE
→ required package elements/payload present

BAG VALID
→ declared checksums verify

RO-CRATE CONFORMS
→ metadata satisfies RO-Crate/profile requirements

EXPERIMENT EXECUTES
→ implementation can be run in a stated environment

EXPERIMENT REPRODUCED
→ reported run/result reproduced

SCIENTIFIC CLAIM SUPPORTED
→ evidence supports the claim
```

Therefore:

```text
PACKAGE VALID
!= EXPERIMENT REPRODUCED
!= SCIENTIFIC CLAIM VALIDATED
```

A package validator, checksum pass or metadata validator MUST NOT be promoted into a behavioral evaluator or scientific-validity oracle.

## 12. Current specimen — Retrieval Successor v0.1

The supplied private Retrieval Successor v0.1 artifact was inspected as the first conformance specimen. Exact artifact identity/fixity and private payload details remain private provenance rather than shared-standard requirements.

Observed preserved evidence includes:

- exact experimental README and run instructions;
- implementation and tests;
- SQLite research corpus;
- evaluation data and summary;
- migration verification;
- internal SHA-256 manifest;
- baseline code/results/vocabulary;
- recorded 12/12 mechanical test pass.

The artifact explicitly classifies part of its SQLite research corpus as private and not suitable for public-repository publication.

### Current conformance disposition

```text
SOURCE PRESERVATION / INTERNAL FIXITY
→ PRESENT

RO-CRATE METADATA
→ ABSENT

BAGIT DECLARATION / MANIFESTS
→ ABSENT

PROCESS RUN CRATE PROFILE
→ ABSENT

THEREFORE
→ NOT YET A RO-CRATE / BAGIT ARCHIVAL OBJECT
```

This is not a defect in the experimental result. The ZIP predates adoption of this archival standard.

The artifact is structurally suitable for non-destructive archival conversion:

```text
ORIGINAL ZIP
→ PRESERVE UNCHANGED

EXTRACT EXACT BYTES
→ PLACE UNDER BagIt data/

ADD
→ data/ro-crate-metadata.json
→ BagIt tag files/manifests

VALIDATE
→ package/profile conformance

STORE
→ private archive

INDEX
→ durable repository reference
```

No experimental payload bytes need to be semantically reorganized to adopt the standard.

Open-source RO-Crate and BagIt validators SHOULD be used for final package conformance when available. This v0.1 repository adoption records the required profile and the specimen mapping; it does not claim third-party-validator execution in an environment where those validators were unavailable.

## 13. Relationship to Repository Stewardship

This standard operationalizes experimental-evidence preservation without replacing `policy/repository_stewardship.md`.

```text
REPOSITORY STEWARDSHIP
→ preserve source / provenance / recoverability / currentness

RO-CRATE
→ interoperable research-object description

BAGIT
→ package completeness / fixity

PROCESS RUN CRATE
→ execution provenance where supported

FAIR
→ interoperability / discovery / reuse direction
```

Repository Stewardship remains the current owner for repository-maintenance requirements. This document owns only the project archival interoperability profile for research objects.

## 14. Stop boundary

Initial adoption is sufficient when:

```text
SHARED STANDARD
→ present and mirrored

EXPERIMENTAL ARTIFACT
→ can be mapped without destructive source rewrite

PRIVACY BOUNDARY
→ preserved

VALIDATION LAYERS
→ kept distinct

NO CUSTOM ARCHIVE FORMAT
NO GRAPH DATABASE
NO ARCHIVAL CONTROLLER
NO STANDING EVALUATOR
```

Do not add OCFL, PREMIS, OAIS infrastructure, a custom metadata ontology or automated archival controller until a concrete preservation requirement makes it load-bearing.

## References

- RO-Crate Metadata Specification 1.3: https://w3id.org/ro/crate/1.3
- Process Run Crate 0.6: https://w3id.org/ro/wfrun/process/0.6
- BagIt 1.0 / RFC 8493: https://www.rfc-editor.org/rfc/rfc8493.html
- FAIR principles: https://www.go-fair.org/fair-principles/
- W3C PROV-O: https://www.w3.org/TR/prov-o/
- OCFL 1.1: https://ocfl.io/1.1/spec/
- PREMIS: https://www.loc.gov/standards/premis/
- OAIS: ISO 14721:2025
- DataCite Metadata Schema: https://schema.datacite.org/