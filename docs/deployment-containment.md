# Deployment containment

Repository controls are necessary but not sufficient for whole-environment enforcement.

## Privilege model

A production deployment should separate at least three trust domains:

```text
OPERATOR / SIGNER
  owns operator private key
  does not expose it to agent/verifier runtime

AGENT / CALLER
  may propose requests
  cannot write authority ledgers, verification logs, action receipts, or trust roots directly
  cannot invoke protected external side effects except through trusted adapters

VERIFIER / ACTION BROKER
  owns protected runtime state
  verifies signed mandates
  computes exact policy decisions
  runs registered action-specific adapters
  persists action results
```

The same-user Termux layout is useful for development and conformance but is not proof of production privilege separation.

## Operator private key placement

Do not keep the operator private key in the agent/runtime working tree.

For the current Termux development environment:

```sh
mkdir -p ~/.config/dao-agentic
chmod 700 ~/.config/dao-agentic
mv ~/Dao-Agentic/operator-private.pem ~/.config/dao-agentic/operator-private.pem
chmod 600 ~/.config/dao-agentic/operator-private.pem
```

Signing commands should then use:

```sh
--private ~/.config/dao-agentic/operator-private.pem
```

The repository `.gitignore` is defense in depth only; ignore rules do not make a key inaccessible to a process that can read the working tree.

## Preflight

```sh
node js/scripts/deployment_guard.js check \
  --repo-root . \
  --state-dir state \
  --trust-store config/operator-trust.json
```

A detected private-key filename inside the runtime tree or a group/world-writable protected path produces `HOLD`.

A clean result is `PASS_WITH_DEPLOYMENT_BOUNDARY`, not a claim of full containment.

## Shared ledger writer lock

Mandate admission, policy decisions, and reference action adapters use the same default lease-ledger lock:

```text
<lease-ledger>.lock
```

This removes the previous local-process race where mandate and policy writers used separate lock names. It remains a local cooperative lock, not distributed consensus.

## Trusted side-effect adapter

`js/scripts/authorized_relay_publish.js` is the first concrete reference adapter. Its destination is not caller-supplied; deployment must set an absolute `DAO_RELAY_OUTBOX` path before launching the adapter.

It:

1. reads the source message,
2. verifies the declared `message_id`,
3. computes SHA-256 over the exact source bytes,
4. derives target `<message_id>@sha256:<digest>`,
5. evaluates the exact `RELAY_PUBLISH` request,
6. persists the self-checking policy decision,
7. on denial: records `DENIED` and performs no copy,
8. on allow: records `AUTHORIZED_PENDING`,
9. copies bytes with no-overwrite semantics,
10. re-hashes the destination,
11. records success/error in the action evidence chain.

This structure prevents the caller from supplying an unrelated shell command while claiming a benign authorized action.

## Action evidence chain

`js/core/evidence_log.js` creates a SHA-256 hash chain over action receipts. Before the next reference action, the whole chain is verified.

Audit it directly:

```sh
node js/scripts/evidence_log.js verify state/action-receipts.jsonl
```

Hash chaining is **tamper-evident**, not tamper-proof. A process that can rewrite the complete log can also recompute the chain. Production deployments therefore still need privilege separation, append-only/immutable storage, or an external anchor.

## Remaining boundary

The repository does not currently force ChatGPT connector operations, GitHub API operations performed outside a trusted adapter, or arbitrary third-party actions through this local broker. Each protected external action surface needs an action-specific adapter/provider enforcement with the same invariant:

```text
DERIVE EXACT ACTION
→ POLICY DECISION
→ PERSIST DECISION
→ IF DENY: STOP
→ PERSIST AUTHORIZED_PENDING
→ EXECUTE
→ PERSIST ACTUAL RESULT
→ VERIFY / STOP
```


Example deployment-controlled destination:

```sh
export DAO_RELAY_OUTBOX="$HOME/dao-relay-outbox"
mkdir -p "$DAO_RELAY_OUTBOX"
chmod 700 "$DAO_RELAY_OUTBOX"
```

An untrusted caller must not be allowed to choose or rewrite this mapping in production; a supervisor/service configuration should own it.


## Trusted adapter registry

Protected actions now enter through a static trusted adapter registry.

The broker accepts:

```text
adapter_id
subject
request_id
adapter input
evidence IDs
```

It does **not** accept an arbitrary execution callback from the caller.

The selected registered adapter fixes the action type, derives the exact target/scope from validated input plus deployment-owned configuration, and owns execution. Unknown adapter IDs fail before an authority decision is created.

Current registered adapters:

```text
relay-publish-v1
github-merge-v1
```

## GitHub merge provider adapter

`github-merge-v1` derives:

```text
action = MERGE
target = PR-<number>@<expected-head-sha>
scope  = DAO_GITHUB_REPOSITORY
```

Deployment owns:

```text
DAO_GITHUB_REPOSITORY
DAO_GITHUB_TOKEN
DAO_GITHUB_MERGE_METHOD   # merge | squash | rebase
```

The caller cannot provide the repository or API URL as action input.

Execution performs a provider preflight read and requires the pull request to remain open at the exact signed/authorized head SHA before issuing the merge request with the same SHA. A changed provider head produces a persisted error receipt and no merge request.

The provider token is never included in the action receipt.

This adapter is a repository reference implementation. A production service should supply these environment values through a supervisor/secret store unavailable to the untrusted agent process.

## Important product/runtime boundary

This repository cannot intercept ChatGPT connector calls merely by existing locally. A ChatGPT GitHub/Drive/mail tool call made outside the protected adapter process bypasses this local enforcement path.

Therefore a deployment claiming enforced governance must either:

1. expose protected provider credentials **only** to the trusted adapter service and deny the agent direct provider credentials/tools, or
2. implement equivalent authorization enforcement in the provider/connector layer itself.

Until one of those is true, connector-level containment remains a deployment integration boundary rather than a repository property.
