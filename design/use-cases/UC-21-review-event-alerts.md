# UC-21: Review event alerts

> Diagram alias: `ReviewAlerts` · Product area: Monitoring · Delivery stage: **Later: requires active scanning and persisted alert records**

## Purpose

Let the investor inspect, understand, and manage alerts with the source and comparison context that caused each alert.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor opens the alert inbox or selects an alert notification.

**Preconditions:**

- Owner identity is resolved.
- Alerts belong to that owner and have a persisted source/dossier comparison.

**Inputs:**

- Owner, filter/status, time range, page cursor, selected alert ID.

**Outputs:**

- Alert list/detail, source comparison, status, and read/dismiss result.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; reviews candidates created by UC-20 and delivered by UC-22.

## Main success flow

1. Load owner-scoped alerts and unread/read/dismiss states.
2. Sort by detected time and show instrument, rule, reason, source date, freshness, and baseline version.
3. On selection, load the cited source and comparison detail.
4. Allow mark-read or dismiss actions; preserve the immutable alert record.
5. Offer a link to a new UC-08 research run, not a trade action.

## Alternate and failure flows

- If a source link is no longer available, retain alert metadata/hash and show source unavailable.
- If an alert was retracted as duplicate or source error, show its corrected status and reason.
- If the alert ID is not owned by the current principal, return not found.

## Functional requirements

- **FR-UC-21-01:** Display the source, date, rule, baseline, and reason for every alert.
- **FR-UC-21-02:** Mark-read/dismiss operations are owner-scoped and idempotent.

## Rules and constraints

- An alert is a prompt to review evidence, not an investment recommendation.
- Do not show raw account/portfolio data in alert details unless separately requested and authorized.

## Dependencies and failure containment

- **Internal:** Alert repository
- **Internal:** UC-13 comparison detail
- **Internal:** Owner-scoped query service
- **External port:** EvidenceSourcePort for source links/content; no notification provider is needed to review an in-app alert.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given an alert candidate, when opened, then its supporting source IDs, dates, and comparison reason are visible.
- Given a different owner’s alert ID, when requested, then no alert content is revealed.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
