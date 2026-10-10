# UC-30: Confirm order change or cancellation

> Diagram alias: `ConfirmChange` · Product area: Paper trading · Delivery stage: **Later/sandbox gate: explicit confirmation of an immutable change preview**

## Purpose

Apply only the exact, unexpired modification or cancellation the investor has just reviewed.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor explicitly confirms a UC-28 modification preview or UC-29 cancellation preview.

**Preconditions:**

- ChangePreview belongs to the owner, is unexpired, and is in PENDING_CONFIRMATION.
- The provider state/version still matches the state displayed to the investor.

**Inputs:**

- Owner, change preview ID/hash, explicit confirmation token/action, idempotency key.

**Outputs:**

- Provider change/cancel acknowledgment and normalized order state, or explicit stale/rejected/unknown result.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-28 and UC-29; reuses the exact-preview validation principle in UC-26.

## Main success flow

1. Invoke UC-26-style deterministic validation for owner, preview hash, expiry, sandbox-only config, and one-time token.
2. Refresh provider order status and compare with observed version/status.
3. Atomically claim the action and persist SUBMITTING_CHANGE or SUBMITTING_CANCEL.
4. Call only the verified Upstox sandbox modify/cancel capability.
5. Persist provider acknowledgment and updated state; return exact outcome.

## Alternate and failure flows

- If status/version changed, preview expired, confirmation is ambiguous, or provider capability is absent, submit nothing.
- If provider timeout occurs after transmission, mark outcome unknown and reconcile before retry.
- If provider rejects, preserve original state and report safe reason; do not represent a failed cancel as cancelled.

## Functional requirements

- **FR-UC-30-01:** Check current provider state immediately before the mutation and bind idempotency to the change preview.
- **FR-UC-30-02:** Never auto-retry an ambiguous external mutation without reconciliation.

## Rules and constraints

- Not MVP. Confirmation must be a separate, exact, user action.
- No direct mutation from the model or from the initial modify/cancel utterance.

## Dependencies and failure containment

- **Internal:** UC-26 validation policy
- **Internal:** UC-28/UC-29 immutable ChangePreview
- **Internal:** UC-27 provider state
- **Internal:** Idempotency/reconciliation service
- **External port:** PaperExecutionPort with sandbox-only, verified modify/cancel capability.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given order state changed since preview, when confirmed, then no provider mutation occurs and a refreshed preview is required.
- Given valid confirmed cancel and provider acknowledgment, when returned, then state changes to cancel-pending/cancelled only according to the provider response.

## Applicable shared requirements

[`NFR-ORD-01`](../REQUIREMENTS.md), [`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
