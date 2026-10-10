# UC-06: Calculate P&L and performance metrics

> Diagram alias: `PerformanceMetrics` · Product area: Portfolio intelligence · Delivery stage: **Later/gated: no precise result until all required inputs are complete**

## Purpose

Calculate method-labeled historical metrics from complete normalized transaction and valuation inputs.

## Contract

**Primary actor:** UC-04 performance view.

**Trigger:** UC-04 requests a supported metric for a date range.

**Preconditions:**

- Activity coverage is verified for the interval.
- Required prices, fees, dividends, corporate actions, FX and opening/closing positions are available or their omissions are explicitly accepted by a defined method.

**Inputs:**

- Normalized activities, position snapshots, valuation series, corporate actions, FX series, period, currency, and selected metric method.

**Outputs:**

- MetricResult containing method/version, amount/return, period, currency, coverage and warnings.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-04.

## Main success flow

1. Validate the input coverage matrix and reconcile position quantities across events.
2. Select a documented calculation method for realized P&L, unrealized P&L, or total return.
3. Apply fees, dividends, splits, and currency conversion in deterministic code.
4. Calculate only metrics whose required inputs pass completeness checks.
5. Return value with method, period, inputs, data coverage, currency, and as-of.

## Alternate and failure flows

- If any required input is missing or inconsistent, return `insufficient_data` with named gaps.
- If corporate-action adjustment cannot be reconciled, do not emit a precise total-return value.
- If FX is missing, return native-currency metrics only where the method permits.

## Functional requirements

- **FR-UC-06-01:** Require a named calculation method and sufficient input coverage before returning a numeric metric.
- **FR-UC-06-02:** Return exact missing-data reasons instead of false precision.

## Rules and constraints

- Not MVP.
- Do not collapse realized P&L, unrealized P&L, and total return into one unlabeled number.
- No forecast, risk score, tax result, or return promise.

## Dependencies and failure containment

- **Internal:** UC-05 activity records
- **Internal:** Portfolio reconciliation
- **Internal:** Deterministic performance calculator
- **Internal:** Versioned performance-method registry; select the initial cost-basis/return methodology before implementation.
- **External port:** MarketDataPort for adjusted prices, corporate actions and FX; BrokerageReadPort for complete activities and positions.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a missing dividend/corporate-action input required by the selected method, when calculation runs, then the result is insufficient_data, not a partial unlabeled return.
- Given a complete fixture ledger, when P&L is calculated, then the output matches the method-specific golden calculation and includes the method/version.

## Applicable shared requirements

[`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-API-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
