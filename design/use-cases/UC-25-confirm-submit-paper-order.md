# UC-25: Confirm and submit a paper order

> Diagram alias: `SubmitPaper` · Product area: Paper trading · Delivery stage: **MVP/sandbox gate: separate confirmation and tested Upstox sandbox capability required**

## Purpose

Submit only the exact, unexpired paper-order preview that the investor explicitly confirms.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor confirms a displayed UC-23 preview through a separate UI action or unambiguous confirmation bound to that preview ID.

**Preconditions:**

- Preview is PREVIEWED, unexpired, and owned by the investor.
- Sandbox account and endpoint are verified; live endpoint configuration is impossible.

**Inputs:**

- Preview ID, explicit confirmation action/token, owner/session, idempotency key.

**Outputs:**

- Sandbox order ID and normalized provider state, or explicit rejected/unknown/failure result.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; includes UC-26; follows UC-23 and enables UC-27.

## Main success flow

1. Receive a confirmation action separate from the original order request.
2. Invoke UC-26 to validate owner, preview hash, expiry, state, sandbox-only mode, and one-time token.
3. Persist SUBMITTING with idempotency key before the provider call.
4. Submit the immutable normalized order through PaperExecutionPort to Upstox sandbox only.
5. Persist provider order ID/status and return a clearly labeled paper-order receipt.

## Alternate and failure flows

- If confirmation is ambiguous, absent, stale, or the preview changed/expired, submit nothing.
- If provider rejects, persist REJECTED with safe provider error code.
- If timeout occurs after request transmission, mark SUBMISSION_UNKNOWN and reconcile by provider/idempotency reference before retry.

## Functional requirements

- **FR-UC-25-01:** Submit only if UC-26 returns valid and the order remains PREVIEWED at commit time.
- **FR-UC-25-02:** A repeated confirmation for the same preview returns the existing result and never creates a second order.

## Rules and constraints

- No direct/generic place-order tool and no live endpoint.
- An LLM response or conversational enthusiasm is not confirmation; confirmation is a deterministic user event tied to preview ID.

## Dependencies and failure containment

- **Internal:** UC-23 immutable preview
- **Internal:** UC-26 validation
- **Internal:** Order state machine
- **Internal:** Idempotency/reconciliation service
- **Internal:** MCPHostPort exposing the `confirm_paper_order` task tool
- **External port:** PaperExecutionPort: verified Upstox sandbox account, instrument, endpoint, and status lookup.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given an expired or altered preview, when confirmation is attempted, then no sandbox request is made.
- Given a valid preview and explicit confirmation, when provider accepts it, then exactly one sandbox order ID is stored and displayed with “no real money.”

## Applicable shared requirements

[`NFR-ORD-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
