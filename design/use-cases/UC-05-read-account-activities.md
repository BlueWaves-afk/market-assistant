# UC-05: Read account activities

> Diagram alias: `AccountActivities` · Product area: Portfolio intelligence · Delivery stage: **Later; provider history access and coverage gated**

## Purpose

Retrieve normalized, read-only broker activity records for a selected account and period.

## Contract

**Primary actor:** UC-04 performance view on behalf of the investor.

**Trigger:** UC-04 requests activity records.

**Preconditions:**

- Owner has an active account connection or selected fixture.
- The provider supports the requested activity scope.

**Inputs:**

- Owner, internal account ref, start/end timestamps, page cursor, instrument filter.

**Outputs:**

- ActivityRecord page, coverage/freshness, source provider, and next-page cursor.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-04.

## Main success flow

1. Authorize owner/account and confirm read-only scope.
2. Request the bounded page/window through BrokerageReadPort.
3. Normalize trade, dividend, fee, transfer, split, and other provider event types without inventing missing fields.
4. Deduplicate by stable provider activity ID and preserve provider freshness.
5. Return records, coverage range, pagination cursor, and provider status.

## Alternate and failure flows

- If history is not available or only partial, return coverage metadata and missing range.
- If provider refresh is daily, return the provider update timestamp and stale status when applicable.
- If the provider has no stable event ID, use a documented deterministic dedupe key and flag ambiguity.

## Functional requirements

- **FR-UC-05-01:** Preserve provider event IDs and timestamps and make pagination/coverage explicit.
- **FR-UC-05-02:** Do not represent missing event fields as zero or infer trade prices.

## Rules and constraints

- Read-only; do not submit, cancel, or modify orders.
- Provider activity is not necessarily a complete tax ledger or complete transaction history.

## Dependencies and failure containment

- **Internal:** BrokerageReadPort
- **Internal:** Activity normalizer
- **Internal:** Owner/account authorization
- **External port:** SnapTrade or another approved BrokerageReadPort adapter; current account-activities data may be delayed/cached.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given duplicate pages, when activity pages are combined, then a stable provider event appears once.
- Given a daily refreshed response, when returned, then freshness is labeled delayed/as-of with its timestamp.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
