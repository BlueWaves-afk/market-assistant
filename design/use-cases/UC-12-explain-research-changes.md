# UC-12: Explain changes since prior research

> Diagram alias: `CompareResearch` · Product area: Research and discovery · Delivery stage: **Later: requires saved dossier/version selection and new evidence retrieval**

## Purpose

Explain how the latest evidence and analysis differ from a selected earlier research snapshot.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor requests an update or comparison for a previously researched company.

**Preconditions:**

- A prior owner-scoped SavedDossier or ResearchRun is selected.
- The same canonical instrument can be resolved for the new run.

**Inputs:**

- Owner, prior dossier/run ID and version, instrument, comparison date/window, question, source allowlist.

**Outputs:**

- Comparison result with baseline version, current run ID, added/changed/unchanged evidence, claim deltas, and unresolved gaps.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; includes UC-09 and UC-13; UC-13 requires UC-11.

## Main success flow

1. Load the selected prior immutable snapshot and show its as-of date.
2. Invoke UC-09 for evidence newer than or otherwise relevant to that snapshot.
3. Invoke UC-13 to compare source IDs/hashes and claim changes.
4. Separate newly published evidence, removed/unavailable sources, changed claim status, and changes in model interpretation.
5. Return a dated change summary with links to both prior and current evidence.

## Alternate and failure flows

- If no earlier snapshot exists, offer a new UC-08 research run rather than inventing a baseline.
- If no new evidence is found, report no new source records in the checked window, not “nothing changed in the company.”
- If the model/workflow version changed, label that separately from changes in underlying evidence.

## Functional requirements

- **FR-UC-12-01:** Tie every change statement to a baseline/current source or claim ID.
- **FR-UC-12-02:** Show both comparison timestamps and distinguish evidence changes from model-version changes.

## Rules and constraints

- No implicit periodic monitoring; this is user-triggered.
- Do not state that an event caused a market outcome unless the source packet supports that relationship.

## Dependencies and failure containment

- **Internal:** UC-09 evidence collection
- **Internal:** UC-13 dossier comparison
- **Internal:** UC-11 SavedDossier repository
- **Internal:** Research diff/synthesis service
- **External port:** EvidenceSourcePort; ResearchModelPort only for explanation.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a prior dossier and one new disclosure, when compared, then the new disclosure is identified with its published/retrieved dates and prior baseline version.
- Given no new sources in the configured window, when compared, then the result reports the checked window and does not assert that no company change occurred.

## Applicable shared requirements

[`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-AI-01`](../REQUIREMENTS.md), [`NFR-SEC-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
