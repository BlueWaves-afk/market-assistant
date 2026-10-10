# UC-18: Configure watchlist and alert rules

> Diagram alias: `ConfigureAlerts` · Product area: Monitoring · Delivery stage: **Later: saved dossier, source coverage, and monitoring gates required**

## Purpose

Maintain a user-owned watchlist and explicit event rules that can later be evaluated against approved evidence.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor adds/removes a company or edits alert settings.

**Preconditions:**

- Owner identity is resolved.
- Each instrument can be deterministically resolved and supported by the selected source policy.

**Inputs:**

- Owner, canonical instrument, watchlist operation, rule type/threshold/source classes, schedule/timezone.

**Outputs:**

- Versioned WatchlistEntry and AlertRule plus active/pending status.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; includes UC-19; configuration enables UC-20 and UC-22.

## Main success flow

1. Resolve and confirm the instrument.
2. Validate the requested rule type, values/units, event source class, and schedule.
3. Persist the watchlist entry and rule version with owner and timestamps.
4. Display a human-readable summary of what will be monitored and what is not covered.
5. Allow the investor to pause/delete a rule independently of account connections.

## Alternate and failure flows

- If an instrument is ambiguous, ask for selection; create no entry.
- If a requested event source is not supported, reject that rule while preserving unrelated valid entries.
- If no scheduler is configured, save the rule as inactive/pending and state that scans are not running.

## Functional requirements

- **FR-UC-18-01:** Every active rule has an owner, supported source classes, explicit thresholds, timezone, and enabled state.
- **FR-UC-18-02:** Deactivation stops future scan scheduling without deleting historical alerts.

## Rules and constraints

- No automated order or recommendation can be attached to a rule.
- Rules are user-owned, explicit, and visible; unsupported coverage is not implied.

## Dependencies and failure containment

- **Internal:** Watchlist repository
- **Internal:** Rule schema/validator
- **Internal:** Instrument resolver
- **Internal:** UC-19 alert preferences
- **External port:** PersistencePort; scheduler/provider capability is not required to save a draft but required to activate scans.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given an unsupported event class, when a rule is saved, then it is rejected with no active hidden rule.
- Given no scheduler capability, when a valid rule is saved, then it is labeled pending/inactive and no scan is claimed.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
