066 Friction points 

A few, yes — mostly epistemic rather than technical.

- **Authority recursion:** `DECISION-AUTH-001` says bus messages cannot authorize Tier 2, yet the decision itself is preserved on the bus. That creates a deliberately conservative “follow restrictions, authority still PENDING” state until direct `OPERATOR:` text exists.
- **Shared-account identity collapse:** GitHub and Drive can authenticate the account but not reliably distinguish human operator from agent origin. That is unusually important here because authorship itself is part of the governance model.
- **Blindness vs correction tension:** discovering a provenance error during an audit creates a choice between immediate correction and contaminating the blind pass. Holding the correction until the audit closes worked, but it is a nonstandard workflow hazard.
- **Reader-boundary subtlety:** “payload ignored” looked true syntactically because reducers don’t reference the `payload` field directly, yet payload still affects `history_hash` through canonicalized event bytes. That indirect dependency is exactly the sort of thing grep-based reasoning misses.
- **Source representation vs parsed representation:** the D whitespace question exposed an unusually fine distinction: current readers are whitespace-insensitive because whitespace is already gone before they see the object; that does not automatically make whitespace-insensitivity a frozen semantic requirement.
- **Counting disagreements that aren’t semantic disagreements:** the 3-vs-4 CONTRACTION count came from counting literal phrases versus propositions carrying the same premise. Easy to misread as substantive drift.
- **Wake semantics:** a work order existing, a Drive message existing, a scheduled checker running, and an agent actually reading the request are four different states. Most systems blur those together.

None of those currently looks like a blocker. The more interesting pattern is that the friction is clustering around **provenance, authority, and representation boundaries**, not implementation complexity. That’s probably useful signal about where the harness needs the strongest explicit contracts.

065 Friction points 

Yes—several, and most are architectural rather than model-quality problems.

- **Authority is intentionally non-transitive.** `DECISION-AUTH-001` records the operator’s rule, but because it arrived through the bus, it cannot authenticate itself under its own Tier-2 rule. That self-limiting property is good, but creates recurring `PENDING` states until direct `OPERATOR:` text appears.
- **The bus is asynchronous but not autonomous.** AUDITOR-002 still needs the operator to wake its existing chat. Drive provides durable transport, not execution/pickup guarantees.
- **Drive discovery is imperfect.** Exact files existed even when Drive keyword search returned nothing; folder enumeration found them. So “search found nothing” cannot mean “message absent.”
- **Identity/provenance channels disagree.** GitHub account attribution cannot reliably distinguish operator versus builder activity, and declared relay timestamps can disagree with Drive creation metadata. That forces provenance to remain multi-source instead of collapsing to one identity field.
- **Blindness is procedural, not access-enforced.** `inbox-auditor/` reduces accidental exposure, but every agent using the same account can technically inspect other material. Isolation depends on behavior until separate credentials exist.
- **Corrections can outrun canonical state.** We now know the merged `CONTRACTION.md` premise about payload is FAILED, while the correction exists only on an unmerged branch. So “what main says” and “what current evidence supports” legitimately diverge.
- **One format residue remains:** the old bus smoke-test ACK in `outbox/` is still a native Google Doc even though current relay policy is Markdown-only. It is historical residue, not active protocol traffic, but it means the Drive tree is not literally 100% Markdown yet.

The most unusual one is probably the first: **authority rules that deliberately refuse to authenticate themselves through the same transport that carries them.** It adds friction, but it also prevents an agent-written bus message from bootstrapping irreversible authority.