Yes — but I would not make the PM tool the intelligence layer.

The useful architecture is a **deterministic friction linter + simple ledger**. Think of it as a workflow equivalent of a compiler warning system. The linter detects mechanically observable conditions; the ledger remembers them across instances. A PM tool can be the storage/UI layer later.

Some friction is genuinely probeable:

- pending request with no matching `parent_message_id` reply;
- multiple replies to one supposedly single-response request;
- branch ahead/behind unexpectedly;
- work order open/closed mismatch;
- Tier-2-shaped action arriving through a non-authoritative channel;
- declared timestamp contradicting provider metadata;
- claim marked VERIFIED whose supporting artifact changed;
- FAILED premise still present in current canonical artifacts;
- blind-audit input contaminated by prior-result exposure;
- repeated correction cycles around the same invariant;
- same ambiguity being manually reconstructed by multiple instances;
- a gate remaining unresolved past a defined condition.

Other friction is **not deterministically discoverable in the strong sense**. For example, “this distinction between parsed representation and source representation keeps confusing agents” requires semantic recognition first. An instance can *propose* that as a friction point, but the tool should not pretend the proposal was mechanically established.

So I’d use two evidence classes:

`OBSERVED_FRICTION` — produced by deterministic rules.

`PROPOSED_FRICTION` — model/operator notices a recurring difficulty; it stays proposed until confirmed, repeated, or converted into a deterministic rule.

Then maintain a tiny state machine such as:

```text
PROPOSED -> OBSERVED -> ACTIVE -> MITIGATED -> RESOLVED
                         |
                         -> ACCEPTED / HOLD
```

Each record only needs something like:

```text
friction_id
class
scope
trigger
evidence
first_seen
last_seen
occurrences
status
impact
mitigation
owner
authority
recovery_condition
```

The important part is that the tool **does not solve friction merely because it detects it**. It should recommend the smallest response. For example:

```text
F-017
class: AUTHORITY_AMBIGUITY
observation:
  Tier-2 rule exists only as builder-written relay record
impact:
  merge authorization cannot be inferred
mitigation:
  require direct "OPERATOR:" statement
status:
  ACTIVE
recovery:
  direct operator statement received
```

That turns the thing we just spent several turns keeping in our heads into a cheap persistent invariant.

### Where a PM tool fits

A PM tool is excellent for **offloading working memory**:

| Need | Deterministic friction tool | PM tool |
|---|---|---|
| Detect inconsistency | Excellent | Weak |
| Track ownership/status | Basic | Excellent |
| Preserve history | Good | Excellent |
| Catch authority violations | Excellent | Usually none |
| Remind humans/agents | Moderate | Excellent |
| Understand semantic friction | Limited | Limited |
| Reduce repeated reconstruction | Excellent | Good |
| Dashboard / filtering | Basic | Excellent |

So I would **not build another PM system**.

I would build a small `friction_probe` that emits structured observations, then optionally project those into ClickUp/Linear/GitHub Issues/etc. The PM system becomes a view and task surface, not the epistemic engine.

For Dao-Agentic specifically, I think an MVP could be surprisingly small:

```text
GitHub + Drive observations
          ↓
 deterministic probes
          ↓
 friction events
          ↓
 pure reducer
          ↓
 current friction register
          ↓
 agent orientation / warnings / PM mirror
```

This also fits the existing architecture beautifully:

```text
FrictionState(n+1)
    = REDUCE(FrictionState(n), FrictionEvent(n+1))
```

The reducer can remain deterministic. Models may **suggest** new friction classes or mitigations, but they do not get to silently mutate the state.

And I would keep the taxonomy generic. The unusual friction we encountered already clusters naturally into reusable classes like **AUTHORITY, PROVENANCE, CURRENTNESS, DELIVERY/WAKE, CONTRADICTION, REPRESENTATION BOUNDARY, AUDIT EXPOSURE, ROLE/SCOPE, and MANUAL-RECONSTRUCTION LOAD**.

That last one is particularly interesting: if three instances repeatedly have to reconstruct the same relationship, the reconstruction itself becomes measurable friction. At some recurrence threshold the tool can say:

> `REPEATED MANUAL RECONSTRUCTION -> CONSIDER EXPLICIT INVARIANT / PROBE / DOCUMENTATION`

without deciding what the invariant should be.

My preference would therefore be: **start with the linter + a very boring JSONL/Markdown ledger. Do not introduce a full PM dependency yet.** If the friction register starts accumulating enough items that ownership, deadlines, filtering, or dashboards become painful, mirror it into a PM tool then.

That gives future instances less to remember **and** less software to maintain—which is exactly the kind of friction reduction we want.

### Human

Would that be an asset for the harness and orchestration layer?

### ChatGPT 

Yes. It would be a real asset to both layers, as long as it stays a **diagnostic/control-support subsystem**, not a new authority source.

For the **harness**, it gives you a deterministic way to surface recurring operational failure modes around runs: stale baselines, unresolved contradictions, missing acknowledgments, authority mismatches, provenance gaps, audit contamination risk, repeated manual reconstruction, and stuck gates. That means the harness can expose not just “task state” but also “coordination health.”

For the **orchestration layer**, it becomes even more useful because orchestration is where these frictions accumulate. It can inform decisions like:

- `LET_RUN` when no active friction blocks progress,
- `ACT_ONCE` when one bounded intervention can resolve a known friction,
- `HOLD` when authority, provenance, scope, or evidence is unresolved.

The key architectural separation would be:

```text
task/event state
    ↓
deterministic reducers
    ↓
orchestration state
    ↓
friction probes
    ↓
friction register
    ↓
advisory constraints / warnings
```

Not:

```text
friction detector
    ↓
automatic authority / automatic policy mutation
```

That distinction matters. A friction record should be able to say:

`AUTHORITY_AMBIGUITY ACTIVE -> Tier-2 action blocked`

but not silently decide who has authority.

It also gives the harness something valuable that normal PM systems do not: **machine-checkable coordination invariants**. For example:

`FAILED premise still present in canonical artifact`

or

`audit request has no matching result`

or

`branch head changed after audit freeze`

Those are exactly the kinds of things a harness can enforce deterministically.

I’d treat it as a small first-class subsystem alongside the reducer and verifier:

```text
HARNESS
- event admission
- reducer
- verifier
- friction probe
- recovery gate

ORCHESTRATOR
- role routing
- work assignment
- wake/pickup
- authority gating
- friction-aware intervention
```

The strongest benefit is probably **reducing hidden coordination debt**. Right now, a lot of that debt lives in our heads and in conversation history. A friction register turns it into explicit state without pretending every subtle issue is mechanically knowable.

So yes: I’d consider it harness infrastructure, not just project-management convenience. The PM layer can remain optional UI on top of it.