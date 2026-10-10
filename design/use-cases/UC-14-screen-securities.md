# UC-14: Screen securities by sector or user criteria

> Diagram alias: `Screen` · Product area: Screening · Delivery stage: **Later: user-selected universe; no AI conviction ranking**

## Purpose

Filter an explicitly selected security universe using visible, reproducible criteria and show matches plus data gaps.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor asks to screen a sector/universe or opens the screen builder.

**Preconditions:**

- Universe selection and criterion definitions are explicit.
- Data fields have approved source and freshness metadata.

**Inputs:**

- Owner, exchange/universe IDs, sector filters, criteria definition, as-of/period, inclusion policy for missing values.

**Outputs:**

- ScreenRun with universe version, criteria, per-instrument outcomes, source timestamps, and unknown reasons.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; includes UC-09 and UC-15.

## Main success flow

1. Select and freeze the universe version for this run.
2. Invoke UC-15 to validate/compile criteria.
3. Fetch required data fields through approved EvidenceSourcePort/MarketDataPort adapters.
4. Evaluate filters deterministically for each instrument.
5. Return matched, unmatched, and unknown sets with field provenance, freshness, and exclusion reasons.

## Alternate and failure flows

- If no universe source is configured, ask the investor to provide/select a supported universe; do not create a market-wide list implicitly.
- If a field is missing/stale, classify that instrument as unknown for that criterion, not a failure or non-match.
- If criteria exceed supported operators/fields, explain the unsupported item and do not approximate it with a model.

## Functional requirements

- **FR-UC-14-01:** Persist the exact universe/criteria/data versions so the result can be reproduced.
- **FR-UC-14-02:** Show unknown/missing data separately from matched/unmatched securities.

## Rules and constraints

- Not MVP. No personalized stock picks, AI ranking, conviction score, buy/hold/sell labels, or trade suggestions.
- Results are filters, not recommendations; order data is not part of the screening path.

## Dependencies and failure containment

- **Internal:** UC-15 criteria validator/compiler
- **Internal:** Deterministic screen evaluator
- **Internal:** Instrument directory
- **External port:** InstrumentUniversePort for the selected universe and EvidenceSourcePort/MarketDataPort for approved, attributed fields with coverage and freshness.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given three instruments and explicit numeric criteria, when screened against fixed fixture data, then the deterministic result matches the expected set and shows per-field sources.
- Given a missing criterion value for one instrument, when screened, then that instrument is unknown for the criterion rather than silently excluded as a non-match.

## Applicable shared requirements

[`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-API-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
