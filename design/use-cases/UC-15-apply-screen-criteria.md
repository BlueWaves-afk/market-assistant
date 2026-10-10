# UC-15: Apply selected universe and criteria

> Diagram alias: `ApplyCriteria` · Product area: Screening · Delivery stage: **Later: deterministic criteria language and universe provider required**

## Purpose

Validate and compile the investor’s selected universe and criteria into a deterministic, explainable query.

## Contract

**Primary actor:** UC-14 screen workflow.

**Trigger:** UC-14 submits a screen definition.

**Preconditions:**

- The criterion schema and supported field registry are versioned.
- Every field has known units, null behavior, and source policy.

**Inputs:**

- Universe identifier/version, criterion AST, operators, values/units, as-of period, null policy.

**Outputs:**

- Validated ScreenDefinition, normalized criteria explanation, required fields, and schema/universe versions.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-14.

## Main success flow

1. Validate supported universe, exchange, instrument types, and maximum size.
2. Validate each field/operator/value against the versioned schema and units.
3. Reject criteria with ambiguous units, unsupported fields, or hidden model-generated values.
4. Compile to a deterministic predicate and return a normalized description plus required data fields.
5. UC-14 executes the predicate and records the schema version.

## Alternate and failure flows

- If any criterion is invalid, return field-specific validation errors and do not partially run the screen.
- If the user requests an unsupported natural-language criterion, ask them to choose a supported explicit field/value.
- If a universe changes after selection, preserve the frozen version for the in-progress run.

## Functional requirements

- **FR-UC-15-01:** Reject the whole invalid definition with actionable validation details; never silently drop a criterion.
- **FR-UC-15-02:** Return a normalized criteria representation suitable for audit and reproduction.

## Rules and constraints

- Criteria are user-selected and visible; no inferred objective or model ranking.
- Evaluation/null semantics must be stable and versioned.

## Dependencies and failure containment

- **Internal:** Criterion schema registry
- **Internal:** Universe registry
- **Internal:** Criteria compiler
- **External port:** InstrumentUniversePort supplies the frozen security universe; MarketDataPort/EvidenceSourcePort supply fields. Licensing, coverage, and field definitions are explicit gates.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a criterion with an unsupported unit, when compiled, then it is rejected before any provider query.
- Given a valid criterion definition, when compiled twice under the same schema version, then the normalized predicate is identical.

## Applicable shared requirements

[`NFR-API-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
