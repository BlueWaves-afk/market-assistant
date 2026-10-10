# UC-24: Calculate hypothetical exposure

> Diagram alias: `HypotheticalExposure` · Product area: Paper trading · Delivery stage: **MVP: deterministic and descriptive; no sizing advice**

## Purpose

Calculate the arithmetic effect of an investor-supplied quantity and limit price on the available portfolio snapshot.

## Contract

**Primary actor:** UC-23 paper-order preview or investor exposure query.

**Trigger:** A preview or explicit exposure query supplies a hypothetical transaction.

**Preconditions:**

- A PortfolioSnapshot is available or the user accepts a position-value-only calculation.
- Order side, quantity, price, and currency are explicit and validated.

**Inputs:**

- Snapshot ID, instrument, side, quantity, limit price, currency, valuation/as-of, inclusion policy.

**Outputs:**

- HypotheticalExposureResult with order value, before/after position exposure, optional percentages, formula, and coverage.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-23; related to current metrics UC-03.

## Main success flow

1. Validate snapshot ownership, scope, completeness, and instrument mapping.
2. Compute estimated order value using fixed-precision arithmetic.
3. Apply the signed hypothetical change to the selected position/account without mutating holdings or submitting an order.
4. Recompute name/sector allocation only when the denominator and needed valuations are complete.
5. Return before/after values, formula, data coverage, and as-of labels.

## Alternate and failure flows

- If no current value is available, return order value and mark before/after percentage unavailable.
- If currency conversion or sector classification is missing, show per-currency/unknown-sector totals and suppress unsupported aggregate.
- If sell quantity would create a short position, reject when holdings are known; do not recommend an alternative quantity.

## Functional requirements

- **FR-UC-24-01:** Use the exact user-supplied terms and preserve input snapshot/time in the result.
- **FR-UC-24-02:** Return each aggregate only when the denominator is complete and its currency basis is consistent.

## Rules and constraints

- No portfolio state changes; calculation is descriptive and not a recommendation.
- Never use binary floating-point for currency; missing values are not zero.
- Denominator is included valued holdings only, with the simulated order notional added/subtracted as defined in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); label it “invested holdings exposure.”

## Dependencies and failure containment

- **Internal:** UC-02 PortfolioSnapshot
- **Internal:** UC-03 exposure calculator
- **Internal:** Fixed-precision money/rounding utility
- **External port:** MarketDataPort only for required valuation/FX not included in the snapshot; absent data yields partial/unavailable.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a fixture snapshot and a buy order, when calculated, then the output equals the deterministic before/after formula and does not mutate the snapshot.
- Given missing total portfolio valuation, when percentage exposure is requested, then percentage is unavailable while order value remains visible.

## Applicable shared requirements

[`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-API-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
