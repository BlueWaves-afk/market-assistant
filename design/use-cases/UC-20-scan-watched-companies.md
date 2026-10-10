# UC-20: Scan watched companies for new events

> Diagram alias: `ScanEvents` · Product area: Monitoring · Delivery stage: **Later/gated: scheduler, saved dossier versions, source coverage, and deduplication required**

## Purpose

Compare new approved evidence against each active watchlist baseline and create only traceable, deduplicated alert candidates.

## Contract

**Primary actor:** Monitoring scheduler or explicit investor request.

**Trigger:** A scheduled job or explicit “scan now” request starts a scan.

**Preconditions:**

- Watchlist rule is active and owner-scoped.
- UC-11 saved dossier baseline exists for comparisons, or the rule explicitly allows a first-run baseline.
- Scheduler/job lease and source policy are configured.

**Inputs:**

- Owner/watchlist IDs, schedule window, cursor, rule versions, baseline dossier versions, idempotency scan ID.

**Outputs:**

- ScanRun status, source coverage, new/unchanged counts, candidate alert IDs, and cursor.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Parent of conditional UC-22; includes UC-09 and UC-13; depends on UC-11.

## Main success flow

1. Acquire an idempotent scan lease and load active rules/preferences.
2. Invoke UC-09 for new evidence within each rule’s allowlist and bounded time window.
3. Invoke UC-13 against the saved baseline and classify added/changed/duplicate evidence.
4. Evaluate deterministic rule conditions; use any model materiality label only as a candidate requiring an auditable reason.
5. Persist scan cursor and candidate alert with source IDs, rule version, baseline version, reason, and dedupe key.
6. Invoke UC-22 only for a new material candidate and an enabled verified delivery preference.

## Alternate and failure flows

- If no baseline exists, save a baseline without generating “change” alerts unless the user explicitly requested initial alerts.
- If sources are unavailable, leave cursor safely retryable and do not mark the scan complete.
- If the same scan/event is retried, reuse the dedupe key and do not create duplicate alerts.

## Functional requirements

- **FR-UC-20-01:** Every alert candidate links to a source, rule version, and baseline dossier version.
- **FR-UC-20-02:** A failed or partial source fetch cannot advance a cursor past unprocessed evidence.

## Rules and constraints

- Not MVP. Scanning is not continuous unless a configured scheduler is active.
- A detected event is not investment advice, a recommendation, or an order.

## Dependencies and failure containment

- **Internal:** UC-09 evidence collection
- **Internal:** UC-11 saved baseline
- **Internal:** UC-13 comparison
- **Internal:** Watchlist/rule repository
- **Internal:** UC-22 delivery gate
- **External port:** SchedulerPort; EvidenceSourcePort; optional ResearchModelPort for bounded explanation.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given the same event and scan ID is retried, when scanning runs twice, then one candidate alert exists.
- Given an unavailable required source, when scan ends, then it remains partial/retryable and does not report no changes.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
