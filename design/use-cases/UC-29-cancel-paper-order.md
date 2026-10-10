# UC-29: Cancel a paper order

> Diagram alias: `CancelOrder` · Product area: Paper trading · Delivery stage: **Later/sandbox gate: cancel capability and eligible provider state required**

## Purpose

Prepare cancellation of an eligible sandbox order without cancelling it until a separate confirmation.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor requests cancellation of an open/eligible sandbox order.

**Preconditions:**

- Order belongs to the owner and UC-27 provides a current eligible provider state.
- Provider capability confirms cancellation is supported for this order.

**Inputs:**

- Owner, internal/provider order ID, observed provider state/version.

**Outputs:**

- Cancellation ChangePreview ID, target order terms/state, expiry, and sandbox label.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; includes UC-30; depends on UC-27.

## Main success flow

1. Load exact order and refresh current status.
2. Check that the provider order remains cancelable.
3. Create immutable cancel ChangePreview with order ID, observed state/version, expiry, and request hash.
4. Show which order is being cancelled and require UC-30 confirmation.
5. Do not call cancel endpoint before confirmation.

## Alternate and failure flows

- If order is filled, rejected, already cancelled, or status is unknown, do not send cancellation; explain current state.
- If provider state changes after preview, invalidate it and refresh.
- If order ID belongs to another owner, return not found without revealing details.

## Functional requirements

- **FR-UC-29-01:** Create a pending cancellation intent only; do not invoke provider cancellation in this flow.
- **FR-UC-29-02:** Require confirmation against the exact provider order ID and observed state.

## Rules and constraints

- Not MVP. Cancellation is a new consequential action and requires explicit confirmation.
- Do not claim cancellation succeeded until provider acknowledgment/status confirms it.

## Dependencies and failure containment

- **Internal:** UC-27 order state
- **Internal:** ChangePreview repository/state machine
- **Internal:** UC-30 confirmation handler
- **External port:** PaperExecutionPort with verified sandbox cancel capability for the selected order.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a cancelable order, when cancellation is requested, then the UI shows a cancellation preview and no provider call occurs.
- Given a terminal order, when cancellation is requested, then the request is rejected and the provider is not called.

## Applicable shared requirements

[`NFR-ORD-01`](../REQUIREMENTS.md), [`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
