# UC-NN: Use-case name

> Diagram alias: `Alias` · Product area: ... · Delivery stage: ...

## Purpose

State the user-visible outcome and the boundary of this use case.

## Contract

- **Primary actor:** ...
- **Trigger:** ...
- **Preconditions:** ...
- **Inputs:** Include units, owner/scope, defaults (or explicitly state no defaults), and freshness where relevant.
- **Outputs:** Include data shape, source/mode, status, and freshness.
- **Success postcondition:** State what changed and what is persisted, or state that the operation is read-only.
- **Failure postcondition:** State what did not change and how partial/unknown outcomes are represented.
- **Related use cases:** Diagram include/extend relationships and supporting services.

## Main success flow

Number actor/system steps. Name the application capability or port at each boundary.

## Alternate and failure flows

Cover ambiguity, no data, stale/partial data, auth failure, timeout/rate limit, validation failure, retry, and uncertain mutation where applicable.

## Functional requirements

- `FR-UC-NN-01`: One observable, testable behavior.

## Rules and constraints

State scope, safety, data-quality, privacy, and stage restrictions.

## Dependencies and failure containment

List owned internal components and named external ports. State readiness gate and fallback/disabled behavior for each provider.

## Acceptance criteria

Use Given/When/Then checks that do not depend on model judgment alone.

## Applicable shared requirements

Reference relevant `NFR-*` identifiers, shared data contracts, and dependency matrix.
