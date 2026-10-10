# UC-02: Read linked holdings

> Diagram alias: `ReadHoldings` · Product area: Portfolio intelligence · Delivery stage: **MVP-fixture-first; authorized account reads optional and gated**

## Purpose

Return a normalized, read-only position snapshot for the selected owner/account scope.

## Contract

**Primary actor:** Portfolio overview, exposure calculator, or paper-order preview on behalf of the investor.

**Trigger:** A parent workflow needs current positions for display or deterministic exposure arithmetic.

**Preconditions:**

- Owner and account scope are resolved.
- For a real provider, an active connection with read-only holdings scope exists; otherwise fixture mode is explicit.

**Inputs:**

- Owner ID, optional internal account refs, canonical instrument filter, requested snapshot time, provider mode.

**Outputs:**

- PortfolioSnapshot with positions, source/mode, fetched_at, as_of, coverage, and per-account result state.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-01; included by UC-23. Supports UC-03 and UC-24.

## Main success flow

1. Select only accounts owned by the caller and authorized for the requested operation.
2. Fetch provider or fixture positions through BrokerageReadPort.
3. Normalize instruments, quantities, currencies, market values, timestamps, and completeness flags.
4. Mask provider account IDs and attach provider/mode labels.
5. Return the snapshot; do not mutate provider state.

## Alternate and failure flows

- If no real connection exists, return fixture only when the application/session is explicitly configured for demo mode and the UI labels it; otherwise return `no_connection`. A live-provider error never falls back to fixtures.
- If provider data is stale, return stale with timestamp; do not refresh into a false “live” label.
- If one account fails, return per-account statuses and mark combined coverage partial.

## Functional requirements

- **FR-UC-02-01:** Return only positions authorized for the owner and requested account scope.
- **FR-UC-02-02:** Preserve source timestamps and normalize provider errors without exposing raw provider payloads.

## Rules and constraints

- This use case is read-only. No orders, transfers, or account changes are permitted.
- MVP fixture records must be visibly labeled sample data.

## Dependencies and failure containment

- **Internal:** BrokerageReadPort adapter
- **Internal:** Owner/account authorization
- **Internal:** PortfolioSnapshot normalizer
- **External port:** Fixture provider; optional SnapTrade Personal/read-only provider.
- **External port:** IdentityContextPort and SecretStorePort for any live connection.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given fixture positions for two masked accounts, when holdings are read, then both appear with fixture labels and no provider account number.
- Given a revoked connection, when holdings are read, then no provider request is made and the result is disconnected.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-SEC-02`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
