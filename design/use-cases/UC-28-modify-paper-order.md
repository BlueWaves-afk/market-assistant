# UC-28: Modify a paper order

> Diagram alias: `ModifyOrder` · Product area: Paper trading · Delivery stage: **Later/sandbox gate: modify capability and eligible provider state required**

## Purpose

Prepare a proposed change to an eligible sandbox order without applying it until a separate confirmation.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor requests a change to an open/eligible sandbox order.

**Preconditions:**

- Order belongs to the owner and UC-27 provides a current eligible provider state.
- Provider capability confirms modification is supported for this instrument/order type.

**Inputs:**

- Owner, internal/provider order ID, requested new limit/quantity fields, observed provider state/version.

**Outputs:**

- ChangePreview ID, before/after terms, observed order state, expiry, and sandbox label.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; includes UC-30; depends on UC-27.

## Main success flow

1. Load exact order and refresh current status.
2. Validate requested fields and supported changeable fields.
3. Create immutable ChangePreview containing old/new values, provider order ID, observed version/status, expiry, and request hash.
4. Show the complete before/after terms and require UC-30 confirmation.
5. Do not call modify endpoint before confirmation.

## Alternate and failure flows

- If order is terminal, status is stale, or provider says it is not modifiable, reject with reason.
- If requested fields are unchanged, return no-op without provider mutation.
- If preview expires or provider state changes, invalidate and require a new change preview.

## Functional requirements

- **FR-UC-28-01:** Never modify an order until a separate UC-30 confirmation passes against the current state.
- **FR-UC-28-02:** Invalidate a change preview when provider order revision/status differs from what was displayed.

## Rules and constraints

- Not MVP. No provider modify call in this use case.
- Change preview is independent of the original order and is invalidated by any status/terms change.

## Dependencies and failure containment

- **Internal:** UC-27 order state
- **Internal:** ChangePreview repository/state machine
- **Internal:** UC-30 confirmation handler
- **External port:** PaperExecutionPort with verified sandbox modify capability for the selected order.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given an eligible order, when a change is requested, then a before/after preview is stored and the provider modify endpoint is not called.
- Given provider state changed after preview, when confirmation is later attempted, then the change is rejected as stale.

## Applicable shared requirements

[`NFR-ORD-01`](../REQUIREMENTS.md), [`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
