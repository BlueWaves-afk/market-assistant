# UC-08: Research selected companies

> Diagram alias: `Research` · Product area: Research and discovery · Delivery stage: **MVP: one selected NSE/BSE cash-equity company per run**

## Purpose

Produce an evidence-bounded research dossier that presents supported findings, the strongest countercase, disagreements, and unknowns without recommending an action.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor asks a company-specific question or selects a company to research.

**Preconditions:**

- A canonical instrument has been resolved; ambiguous company names were clarified.
- Approved evidence sources and research model configuration are available, or the run is explicitly in fixture mode.

**Inputs:**

- Company phrase or canonical instrument, investor question, optional source time window, owner/session context.

**Outputs:**

- ResearchRun with source IDs, typed claims, supported case, countercase, disagreements, unknowns, freshness, and run ID.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Parent use case; includes UC-09 and UC-10; optionally extended by UC-11 after an explicit save action.

## Main success flow

1. Resolve company/instrument deterministically; ask for clarification if multiple securities match.
2. Invoke UC-09 to retrieve a bounded, dated source packet.
3. Invoke UC-10 to analyze that exact packet and validate claim citations.
4. Persist an immutable research-run snapshot and provenance metadata.
5. Return concise voice text and structured evidence cards, including gaps and source freshness.
6. Offer UC-11 only as an explicit later-phase user save action; the MVP run snapshot is not a saved library entry.

## Alternate and failure flows

- If the instrument is ambiguous, stop and ask; do not choose based on popularity.
- If source coverage is sparse or stale, return a partial dossier with unknowns or fail the run; do not infer facts.
- If the model or validator fails, return a safe error/run status and retain validated source metadata only.

## Functional requirements

- **FR-UC-08-01:** The run records the exact source packet and validates every claim reference against it.
- **FR-UC-08-02:** The response distinguishes reported facts, calculations, interpretations, and unknowns.

## Rules and constraints

- MVP supports one selected company per run and approved source packet only.
- No BUY/HOLD/SELL, target price, conviction score, ranking, personal position advice, or generated trade parameters.

## Dependencies and failure containment

- **Internal:** UC-09 evidence collection
- **Internal:** UC-10 sourced findings
- **Internal:** Company directory/resolver
- **Internal:** ResearchRun repository
- **Internal:** MCPHostPort exposing the `research_company` task tool
- **External port:** ResearchModelPort (Bedrock) for live research; fixture model responses for development only.
- **External port:** EvidenceSourcePort for fixture/allowlisted disclosures.
- **External port:** InstrumentUniversePort for canonical instrument resolution; MVP adapter is a curated local fixture.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given an ambiguous company phrase, when research starts, then no tool fetch or analysis occurs until the investor selects the instrument.
- Given a source packet, when the run completes, then every cited claim points to a source in that run and no recommendation field is returned.

## Applicable shared requirements

[`NFR-AI-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
