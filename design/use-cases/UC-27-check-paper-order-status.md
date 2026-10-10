# UC-27: Check paper-order status

> Diagram alias: `OrderStatus` · Product area: Paper trading · Delivery stage: **MVP/sandbox gate: status endpoint and provider status mapping must be verified**

## Purpose

Show the latest known sandbox status of an owner’s paper order without mutating it.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor opens order history or asks for the status of a sandbox order.

**Preconditions:**

- Order belongs to the owner and has a provider order ID, or is an explicitly local preview/failure state.
- Provider status capability is available for remote status refresh.

**Inputs:**

- Owner ID, internal order ID/provider order ID, optional refresh flag.

**Outputs:**

- Normalized order status, order terms, sandbox marker, provider timestamp, and freshness.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; follows UC-25 and supplies state required by UC-28/UC-29.

## Main success flow

1. Authorize order ownership and retrieve stored normalized state.
2. If status refresh is requested and supported, query PaperExecutionPort by provider order ID.
3. Normalize provider status, timestamp, and any pending/unknown state.
4. Persist the observation without changing the original order terms.
5. Display sandbox mode, status source, last checked time, and next permitted actions.

## Alternate and failure flows

- If provider status is temporarily unavailable, show last known state with stale timestamp and retryable error.
- If order state is SUBMISSION_UNKNOWN, reconcile before offering another submit action.
- If provider returns an unknown status value, preserve raw enum only in redacted diagnostics and show “unmapped/pending.”

## Functional requirements

- **FR-UC-27-01:** Return only owner-scoped order status and show the last successful provider query time.
- **FR-UC-27-02:** Preserve unknown states as unknown; never map them to filled/completed by default.

## Rules and constraints

- Read-only query; no hidden modify/cancel/submit action.
- Do not imply fill/execution when provider status is accepted/open/pending.

## Dependencies and failure containment

- **Internal:** Order repository
- **Internal:** Status mapper
- **Internal:** Owner authorization
- **Internal:** MCPHostPort exposing the `get_paper_order_status` task tool
- **External port:** PaperExecutionPort/Upstox sandbox order-status capability; endpoint/retention must be verified.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a provider timeout, when status is requested, then the last known state is shown as stale and no order is resubmitted.
- Given an unknown provider status code, when normalized, then it is shown as unmapped/pending rather than filled.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
