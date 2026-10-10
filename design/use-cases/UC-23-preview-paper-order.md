# UC-23: Preview a paper order

> Diagram alias: `Preview` · Product area: Paper trading · Delivery stage: **MVP: cash-equity sandbox preview; submission is separate**

## Purpose

Show the exact user-entered sandbox order fields, estimated value, and supported hypothetical exposure before any order is submitted.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor explicitly requests a paper-order preview and supplies the required fields.

**Preconditions:**

- A supported cash-equity instrument and sandbox account alias are selected.
- Owner context and portfolio mode are known; positions may be fixture-only.

**Inputs:**

- Canonical ticker/exchange, buy or sell, positive whole-share quantity, positive limit price, sandbox account alias; optional user-selected portfolio scope.

**Outputs:**

- OrderPreview ID, exact order terms, estimated value, available hypothetical exposure, expiry, account alias, sandbox label.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; includes UC-02 and UC-24; produces the preview consumed by UC-25 and UC-26.

## Main success flow

1. Validate instrument, exchange, side, quantity, price precision, account alias, and sandbox capability.
2. For a sell, require a complete holdings snapshot for the selected account and reject quantities above the available position; if holdings cannot be verified, do not create a sell preview.
3. Invoke UC-02 and UC-24 for available holdings and hypothetical exposure.
4. Create immutable OrderPreview with exact normalized fields, request hash, expiry, mode=sandbox, and idempotency key.
5. Show all fields, estimated value, data freshness/coverage, and “Paper order — no real money”; ask for separate confirmation.

## Alternate and failure flows

- If the ticker or exchange is ambiguous/unsupported, ask the investor to choose or stop.
- If portfolio data is incomplete, show order value but mark exposure unavailable/partial. A sell preview is blocked unless sellable quantity can be verified; a buy preview may continue with exposure marked partial/unavailable.
- If price/quantity/account fields are missing or invalid, request correction; do not fill them from model output.

## Functional requirements

- **FR-UC-23-01:** Create an immutable preview and require a new preview after any field changes.
- **FR-UC-23-02:** Display exact fields and freshness/coverage before confirmation; no submit side effect is allowed.

## Rules and constraints

- Preview never calls Upstox order submission.
- No live mode, derivatives, short selling, market orders, AI-selected quantity, or AI-selected price in MVP.

## Dependencies and failure containment

- **Internal:** UC-02 holdings
- **Internal:** UC-24 hypothetical exposure
- **Internal:** OrderPreview state machine
- **Internal:** Instrument/sandbox capability registry
- **Internal:** MCPHostPort exposing the `preview_paper_order` task tool
- **External port:** InstrumentUniversePort verifies that the selected instrument is canonical and supported.
- **External port:** PaperExecutionPort capability check; Upstox sandbox adapter is used only after confirmation.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a valid cash-equity request, when previewed, then the UI shows the exact normalized terms and no provider order exists.
- Given an attempted sell greater than available owned quantity, when holdings coverage is complete, then preview is rejected with the supported quantity limit.

## Applicable shared requirements

[`NFR-ORD-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
