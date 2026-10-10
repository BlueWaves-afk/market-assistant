# UC-11: Save a research dossier

> Diagram alias: `SaveDossier` · Product area: Research and discovery · Delivery stage: **Later: user-managed, versioned dossier library**

## Purpose

Save a completed research run as an owner-controlled, versioned reference without changing the original run or sources.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor explicitly selects Save on a completed research result.

**Preconditions:**

- The selected ResearchRun is complete or marked as a valid partial result.
- The current owner is authorized to save that run.

**Inputs:**

- Owner ID, run ID, user-entered title/notes/tags, optional collection.

**Outputs:**

- SavedDossier ID/version and summary of source coverage, freshness, and run reference.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Optional extension of UC-08; prerequisite for UC-12, UC-13, and UC-20.

## Main success flow

1. Verify run ownership, validation status, and source references.
2. Show what will be saved and any partial/stale evidence flags.
3. On explicit save, create a SavedDossier record referencing the immutable run and source packet versions.
4. Assign dossier ID and version; preserve created/saved timestamps and model/workflow version.
5. Return the saved reference and provide a way to archive/delete it under retention policy.

## Alternate and failure flows

- If the run is not validated or belongs to another owner, reject without creating a dossier.
- If storage fails, report save failure and keep the original run available; do not show a success state.
- If the user edits title/notes, save those as metadata only; never rewrite research claims or source snapshots.

## Functional requirements

- **FR-UC-11-01:** Create a saved dossier only after an explicit user action and preserve an immutable run/source reference.
- **FR-UC-11-02:** Prevent cross-owner save/read and detect duplicate save requests idempotently.

## Rules and constraints

- Not MVP: per-run provenance persistence does not imply an explicit saved dossier library.
- Saving does not endorse findings or convert the dossier to a recommendation.

## Dependencies and failure containment

- **Internal:** ResearchRun repository
- **Internal:** SavedDossier repository with owner/version scoping
- **Internal:** Retention/archive policy
- **External port:** PersistencePort; IdentityContextPort for owner isolation.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a validated run and explicit save action, when persistence succeeds, then a new versioned owner-scoped dossier references that exact run.
- Given a network retry of the same save action, when processed twice, then one dossier version is created.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
