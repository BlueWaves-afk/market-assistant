# UC-01: Review portfolio overview

> Diagram alias: `PortfolioOverview` · Product area: Portfolio intelligence · Delivery stage: **MVP-limited: current positions and exposure only; full analytics later**

## Purpose

Understand the available portfolio snapshot and its current allocation without presenting incomplete coverage as a complete portfolio.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor asks for a portfolio overview or opens the portfolio view.

**Preconditions:**

- An owner-scoped session exists.
- At least one fixture snapshot or authorized read provider is configured; live brokerage access is never assumed.

**Inputs:**

- Owner context, optional account scope, optional instrument/sector focus, display currency, and requested as-of point.

**Outputs:**

- Normalized position summary, supported exposure metrics, source/mode, as-of time, and completeness status.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Parent use case; includes UC-02 and UC-03.

## Main success flow

1. Resolve the owner and permitted account scope.
2. Invoke UC-02 to obtain normalized positions and freshness/coverage metadata.
3. Invoke UC-03 for only metrics supported by that snapshot.
4. Aggregate account labels and completeness flags; do not double-count duplicate instruments across accounts.
5. Show holdings and available metrics with provider mode, valuation time, and missing coverage.

## Alternate and failure flows

- If there are no linked accounts, offer the labeled demo fixture or state that no snapshot is available.
- If some positions lack valuations, show those positions and mark portfolio-level percentages partial or unavailable.
- If a provider fails, return its normalized failure state and any independently valid snapshot; never mix in an unrelated account.

## Functional requirements

- **FR-UC-01-01:** Compose a portfolio response only from positions and metrics for the resolved owner and one identified snapshot.
- **FR-UC-01-02:** Display data mode, coverage, and as-of time alongside every aggregate.

## Rules and constraints

- MVP overview is limited to current positions/exposure; it does not imply performance, P&L, all broker accounts, or real-time values.
- Metrics use the same snapshot and denominator; missing values are not zero.

## Dependencies and failure containment

- **Internal:** UC-02 Read linked holdings
- **Internal:** UC-03 Calculate portfolio metrics
- **Internal:** Portfolio query and aggregation service
- **Internal:** MCPHostPort exposing the MVP `get_portfolio_exposure` task tool
- **External port:** BrokerageReadPort; fixture provider is guaranteed, authorized provider optional.
- **External port:** MarketDataPort only when valuation is needed; otherwise return unavailable/partial.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a fixture with two accounts and one missing valuation, when the overview is requested, then supported totals are shown and the percentage is marked partial.
- Given a provider error, when the overview is requested, then no stale or other-owner data is presented as current.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
