# UC-04: Review trade history and performance

> Diagram alias: `Performance` · Product area: Portfolio intelligence · Delivery stage: **Later; blocked on complete, authorized history and valuation coverage**

## Purpose

Review a time-bounded account activity history and derived performance with explicit completeness and freshness.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor selects a date range and asks to review activity or performance.

**Preconditions:**

- Owner has an authorized account or explicitly selected fixture account.
- The requested period and timezone are explicit.

**Inputs:**

- Owner, account scope, start/end date, instrument filter, display currency, and metric selection.

**Outputs:**

- Chronological activity list, completeness interval, optional performance result, source labels, and as-of time.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Parent use case; includes UC-05 and UC-06.

## Main success flow

1. Resolve account scope and date window.
2. Invoke UC-05 for activities and UC-06 for eligible derived metrics.
3. Deduplicate activities by provider ID and normalize dates, fees, currencies, and corporate-action references.
4. Check coverage for the full requested interval and all selected accounts.
5. Render raw activity and supported metrics separately, with provider freshness and method labels.

## Alternate and failure flows

- If history begins after the requested start date, show the covered interval and do not annualize or extrapolate.
- If daily-refreshed activity is behind, label the data delayed and show its provider timestamp.
- If the data is insufficient for performance, retain activity view and explain missing inputs.

## Functional requirements

- **FR-UC-04-01:** Show the exact covered period and provider update time.
- **FR-UC-04-02:** Separate provider-reported activity from calculated performance and suppress unsupported metrics.

## Rules and constraints

- Not part of hackathon MVP.
- Activity timestamps are not assumed real-time; daily cached activity must never be described as live.

## Dependencies and failure containment

- **Internal:** UC-05 account activities
- **Internal:** UC-06 performance calculator
- **Internal:** Activity normalizer and deduplicator
- **External port:** BrokerageReadPort; licensed MarketDataPort for prices/FX/corporate actions. Provider history limits and freshness must be disclosed.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given incomplete activity coverage, when history is requested, then the missing interval is visible and no complete-period P&L is shown.
- Given daily cached records, when displayed, then the update time is shown and no real-time claim appears.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
