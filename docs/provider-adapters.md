# Provider adapters

Provider adapters connect deterministic authority decisions to external side effects.

## Invariant

```text
UNTRUSTED CALLER INPUT
→ SELECT REGISTERED ADAPTER
→ ADAPTER DERIVES ACTION / TARGET / SCOPE
→ EXACT POLICY DECISION
→ PERSIST DECISION
→ IF DENY: ZERO PROVIDER CALLS
→ PERSIST AUTHORIZED_PENDING
→ PROVIDER PREFLIGHT
→ EXACT PROVIDER MUTATION
→ PERSIST PROVIDER RESULT
→ STOP
```

The caller never supplies executable code to the action broker.

## Registry

`js/adapters/registry.js` is static code. Current IDs:

- `relay-publish-v1`
- `github-merge-v1`

Unknown IDs are rejected.

Adding a new provider action therefore requires a code change, tests, CI, review/merge authorization, and deployment configuration. A relay message cannot dynamically register an adapter.

## GitHub merge

The GitHub adapter accepts only:

- pull request number
- expected head SHA

It derives:

- `action = MERGE`
- `target = PR-<number>@<expected-head-sha>`
- `scope = DAO_GITHUB_REPOSITORY`

The repository comes from trusted deployment configuration, not the caller.

Before mutation, the adapter reads the PR and checks:

- PR is still open
- provider head SHA exactly equals the authorized SHA
- provider base repository matches the configured repository when returned

The merge request repeats the same expected SHA.

Required deployment secrets/configuration:

```text
DAO_GITHUB_REPOSITORY=owner/repo
DAO_GITHUB_TOKEN=<provider credential>
DAO_GITHUB_MERGE_METHOD=merge
```

The token must be available to the trusted adapter service, not to the untrusted agent process.

## Connector limitation

A local adapter cannot constrain a separate ChatGPT connector/tool that holds its own provider credential. If the agent retains direct GitHub mutation tooling, it can bypass the local broker.

Production containment therefore requires one of:

- remove direct mutation capability from the agent and expose only the trusted adapter service, or
- make the connector/provider itself enforce the same signed mandate and policy protocol.

This limitation is architectural and must not be hidden by local conformance tests.
