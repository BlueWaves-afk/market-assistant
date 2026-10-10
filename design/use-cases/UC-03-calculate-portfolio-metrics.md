# UC-03: Calculate portfolio metrics

> Diagram alias: `PortfolioMetrics` · Product area: Portfolio intelligence · Delivery stage: **MVP-limited: deterministic exposure metrics; broader analytics later**

## Purpose

Calculate transparent current name/sector exposure from one normalized portfolio snapshot.

## Contract

**Primary actor:** Portfolio overview or exposure workflow.

**Trigger:** UC-01 or an investor query requests portfolio allocation/exposure.

**Preconditions:**

- A PortfolioSnapshot is available.
- Each included market value has a currency and as-of timestamp; any conversion rate is identified.

**Inputs:**

- Snapshot ID, optional instrument/sector, calculation currency, inclusion policy, valuation values and timestamps.

**Outputs:**

- MetricResult records with metric name, amount/unit, denominator, method, snapshot ID, coverage and freshness.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-01; UC-24 is the hypothetical counterpart.

## Main success flow

1. Validate snapshot owner, coverage, units, and duplicate position policy.
2. Convert values only when an approved, timestamped FX value is supplied.
3. Calculate instrument and sector totals using fixed-precision arithmetic.
4. Calculate percentages only when the denominator is complete for the declared scope.
5. Return value, formula, included/excluded positions, coverage, and as-of metadata.

## Alternate and failure flows

- If a denominator position is missing value, return a partial total and suppress a complete-portfolio percentage.
- If currencies cannot be converted with an approved FX rate, report per-currency totals or unavailable.
- If no position maps to a sector, show unknown sector; do not infer it.

## Functional requirements

- **FR-UC-03-01:** Compute totals from the exact snapshot and expose the formula/coverage used.
- **FR-UC-03-02:** Use fixed-precision monetary arithmetic and a documented rounding rule for presentation.

## Rules and constraints

- No model performs or edits arithmetic.
- MVP metrics are exposure/allocation only; no return, risk, forecast, ranking, or recommendation.
- Label denominator-based percentages as “invested holdings exposure”; do not imply cash, liabilities, or unlinked accounts are included.

## Dependencies and failure containment

- **Internal:** UC-02 normalized snapshot
- **Internal:** Deterministic exposure calculator
- **Internal:** Instrument/sector classification table with provenance
- **External port:** MarketDataPort for valuation/FX when not supplied by fixture/provider; absent values stay unavailable.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given known position values, when exposure is calculated, then totals and percentages match hand-calculated expected values.
- Given any position value required for the denominator is absent, when portfolio percentage is requested, then it is marked partial/unavailable rather than treating the missing value as zero.

## Applicable shared requirements

[`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-API-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
