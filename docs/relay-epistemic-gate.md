# Relay epistemic gate

The supported `relay-publish-v1` path requires exactly one machine-readable
`epistemic_trace_json:` line in every message before authorization or side effects.

The gate is intentionally stricter than "a citation exists":

- `SUPPORTED` external claims require a peer-reviewed, A/B-quality, directly supporting,
  `VERIFIED_PRIMARY` academic source.
- A qualifying academic source must already have a Google Drive RAG archive URL and an
  exact SHA-256. `PENDING_ARCHIVE` cannot support a `SUPPORTED` relay claim.
- `MIXED` requires qualifying direct and contradictory sources.
- `CONTRADICTED` requires qualifying contradictory evidence.
- `PENDING`, `EVIDENCE_GAP`, and `QUARANTINE` remain representable without citation
  padding.
- `PROJECT_STATE` uses verified primary project provenance instead of manufacturing an
  academic citation.
- A procedural relay explicitly declares `NO_SUBSTANTIVE_CLAIM`.

The adapter binds a digest of the validated trace into the authorization evidence IDs and
returns the normalized trace in the action result. The existing tamper-evident gateway
receipt chain therefore preserves claim/source telemetry with the mutation record.

## Boundary

This is an enforcement boundary for the **supported gateway relay publisher**, not a
semantic oracle and not Google Drive access control.

`NO_SUBSTANTIVE_CLAIM` is still a sender declaration; later environment/turn telemetry
may show that a sender misclassified a claim. Source metadata is structurally validated,
not independently resolved over the network by the adapter.

An instance with direct Google Drive writer capability can bypass the local publisher.
Hard Drive enforcement therefore requires deployment separation: remove direct relay
write capability from agent runtimes and expose only a constrained relay-writer
identity/service through the gateway.

Epistemic admission never grants action authority.
