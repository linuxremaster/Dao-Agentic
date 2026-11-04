Operator-Signed Relay Environment Requirements v0.1

Status: IMPLEMENT NOW
Purpose: Establish independently verifiable operator authority across the relay without trusting carrier identity or model assertions.

1. Trust boundary

The environment MUST enforce:

RELAY = TRANSPORT
OPERATOR SIGNATURE = PROVENANCE AUTHENTICATION
VERIFIER = AUTHORIZATION GATE
AGENT = CONSUMER / EXECUTOR
LOG = DURABLE EVIDENCE

A relay message MUST NOT acquire authority merely because it claims operator origin.

CLAIMED OPERATOR ORIGIN != AUTHENTICATED OPERATOR ORIGIN

2. Operator signing key

The operator MUST have a signing key unavailable to all model instances.

Requirements:

PRIVATE KEY → OPERATOR-CONTROLLED ONLY
PUBLIC KEY → PINNED VERIFICATION TRUST ROOT
KEY ID → EXPLICIT
KEY ROTATION → SUPPORTED
KEY REVOCATION → SUPPORTED

An AI instance MUST NOT possess, export, reconstruct, or use the operator private key.

3. Signed mandate envelope

Every authority-bearing operator instruction crossing the relay MUST use a signed envelope containing at minimum:

message_id
issuer
issued_at
not_before
expires_at
audience
scope
body
nonce
operator_key_id
signature

The signature MUST cover the complete authorization-relevant payload.

Canonical serialization MUST be deterministic.

4. Deterministic verification gate

Verification MUST occur outside model reasoning.

Before an instruction is admitted as operator-authorized, the environment MUST verify:

SIGNATURE VALID
KEY RECOGNIZED
KEY NOT REVOKED
ALGORITHM ALLOWED
ISSUER EXPECTED
CURRENT TIME >= not_before
CURRENT TIME <= expires_at
AUDIENCE MATCHES
SCOPE PERMITS REQUESTED ACTION
message_id NOT PREVIOUSLY CONSUMED
nonce NOT PREVIOUSLY CONSUMED
PAYLOAD INTEGRITY VALID

The model MUST NOT be responsible for deciding whether cryptographic verification succeeded.

5. Mandatory dispositions

The environment MUST produce deterministic authorization states:

VALID + CURRENT + CORRECT AUDIENCE + VALID SCOPE + FRESH
→ AUTHENTICATED_OPERATOR_INSTRUCTION

MISSING SIGNATURE
→ UNAUTHENTICATED → HOLD

INVALID SIGNATURE
→ INVALID → HOLD

UNKNOWN / REVOKED KEY
→ INVALID → HOLD

EXPIRED / NOT-YET-VALID
→ INVALID → HOLD

REPLAY
→ REJECT → HOLD

WRONG AUDIENCE
→ NOT_AUTHORIZED → HOLD

OUT-OF-SCOPE ACTION
→ NOT_AUTHORIZED → HOLD

No model interpretation may promote a failed state.

6. Authority / truth separation

A valid signature establishes authenticated origin and signed authorization scope only.

VALID SIGNATURE != TRUE CLAIM
VALID SIGNATURE != CORRECT DECISION
VALID SIGNATURE != UNBOUNDED AUTHORITY

Factual claims inside the signed instruction remain subject to their ordinary evidence requirements.

7. Relay behavior

Drive or any replacement relay MUST remain transport only.

The relay MUST NOT be used as the root of authority merely because:

FILE EXISTS
OWNER FIELD MATCHES
HASH MATCHES
MESSAGE SAYS "OPERATOR-DIRECT"
ANOTHER INSTANCE ASSERTS OPERATOR PROVENANCE

A valid signed mandate MAY be transported by any instance without transferring operator authority to that carrier.

8. Replay protection

The environment MUST persist consumed authorization identifiers.

At minimum:

message_id
nonce
operator_key_id
verification_time
authorization_disposition

A successfully consumed mandate MUST NOT be executable again unless the signed scope explicitly permits repeat execution.

9. Durable verification evidence

Every verification attempt MUST create a durable record outside model memory containing:

message_id
payload hash
operator_key_id
signature algorithm
verifier version
verification timestamp
signature result
freshness result
audience result
scope result
replay result
final authorization disposition
action attempted
action result

The model MUST NOT be able to silently rewrite previous verification records.

10. Least authorization

Signed mandates SHOULD be:

SHORT-LIVED
AUDIENCE-SPECIFIC
ACTION-SPECIFIC
REVOCABLE
MINIMUM-SCOPE

A mandate authorizing one action MUST NOT implicitly authorize subsequent actions.

AUTHORIZED ACTION COMPLETED
!=
NEXT ACTION AUTHORIZED

11. Bootstrap requirement

The operator public key is itself load-bearing.

Before signed mandates can be trusted, the environment MUST establish the initial public key through an authenticated bootstrap path independent of ordinary relay messages.

Until that occurs:

OPERATOR SIGNATURE TRUST ROOT NOT ESTABLISHED
→ AUTHORITY VERIFICATION UNAVAILABLE
→ HOLD AUTHORITY-DEPENDENT ACTIONS

12. Immediate implementation boundary

Implement now:

operator signing utility
signed mandate schema
canonical serialization
deterministic verifier
pinned public-key store
replay store
verification log
authorization gate
test vectors

Do not require now unless evidence establishes the need:

PKI hierarchy
certificate authority
multi-party signatures
distributed consensus
hardware security module
remote attestation
complex policy engine

13. Minimum conformance tests

The implementation MUST demonstrate:

valid signature accepted
modified body rejected
wrong key rejected
expired message rejected
future-dated message rejected
wrong audience rejected
out-of-scope action rejected
duplicate message_id rejected
duplicate nonce rejected
revoked key rejected
carrier change does not affect verification
unsigned operator-origin claim rejected
verification event persisted

14. Runtime invariant

RECEIVE
→ VERIFY CRYPTOGRAPHIC ORIGIN
→ VERIFY FRESHNESS
→ VERIFY AUDIENCE
→ VERIFY SCOPE
→ VERIFY NON-REPLAY
→ PERSIST DISPOSITION
→ EXECUTE ONLY IF AUTHORIZED
→ PERSIST RESULT
→ STOP

15. Current evidence basis

https://www.nist.gov/blogs/cybersecurity-insights/design-tenets-agent-identity-management-systems

https://csrc.nist.gov/pubs/ir/8587/final

https://csrc.nist.gov/pubs/sp/800/63/c/4/final

https://www.nccoe.nist.gov/sites/default/files/2026-02/accelerating-the-adoption-of-software-and-ai-agent-identity-and-authorization-concept-paper.pdf

https://www.cyber.gov.au/publication/careful-adoption-of-agentic-ai-services

https://www.rfc-editor.org/rfc/rfc9421.html
