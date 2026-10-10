# UC-07: Review broker-published research

> Diagram alias: `BrokerResearch` · Product area: Portfolio intelligence · Delivery stage: **Later/gated: provider, content rights, and attribution contract required**

## Purpose

Read broker-authored research while preserving its author, publication context, access rights, and distinction from Market Partner analysis.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor requests a specific broker report or opens broker research for an instrument.

**Preconditions:**

- A supported BrokerResearchPort provider is configured for the owner.
- The requested report is within the provider’s access and display rights.

**Inputs:**

- Owner, instrument, broker/provider selector, optional report ID/date range, and requested display fields.

**Outputs:**

- Attributed broker report metadata and permitted content/link; entitlement and freshness status.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Standalone investor use case; provider is separate from UC-16 brokerage account linking.

## Main success flow

1. Authorize the owner and provider entitlement.
2. Fetch reports through BrokerResearchPort, distinct from brokerage holdings access.
3. Normalize report ID, author/broker, publication/update time, instrument, title, and permitted content/link.
4. Display broker content in a clearly separate panel with attribution and date.
5. If Market Partner analysis is also shown, label its provenance separately.

## Alternate and failure flows

- If no provider or permission exists, state that broker research is unavailable; do not fabricate or substitute generated analysis.
- If content is link-only, show the attributed link and do not copy restricted text.
- If report is stale, show its publication/update date and do not call it current.

## Functional requirements

- **FR-UC-07-01:** Every displayed broker report identifies the provider, author where available, publication date, and access/source label.
- **FR-UC-07-02:** Keep report content out of Market Partner-generated claims unless each statement is separately cited and labeled.

## Rules and constraints

- Not MVP. SnapTrade account connectivity does not imply broker-research entitlement.
- No paid/restricted content redistribution without provider permission.

## Dependencies and failure containment

- **Internal:** BrokerResearchPort and attribution renderer
- **Internal:** Owner entitlement check
- **External port:** BrokerResearchPort; provider not yet selected. API, licensing, user entitlement, and display/redistribution terms are required.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given no research provider entitlement, when the feature is requested, then it reports unavailable and creates no broker-style report.
- Given an entitled report, when rendered, then attribution and publication time remain visible and distinct from Market Partner analysis.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
