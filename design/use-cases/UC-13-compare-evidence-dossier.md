# UC-13: Compare new evidence with saved dossier

> Diagram alias: `CompareDossier` · Product area: Research and discovery · Delivery stage: **Later: shared deterministic comparison primitive for updates and monitoring**

## Purpose

Compare a new evidence packet against an immutable saved dossier version and return traceable deltas.

## Contract

**Primary actor:** UC-12 research comparison or UC-20 monitoring workflow.

**Trigger:** A parent workflow supplies a saved dossier version and a current evidence packet.

**Preconditions:**

- SavedDossier belongs to the owner and its source/version references are available.
- New EvidencePacket has passed UC-09 validation.

**Inputs:**

- Owner, dossier ID/version, new EvidencePacket IDs/hashes, comparison window, comparison policy version.

**Outputs:**

- DossierComparison with baseline version, new packet, source/claim deltas, comparability, and reason codes.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-12 and UC-20; depends on UC-11 and UC-09.

## Main success flow

1. Load immutable baseline claims and source records.
2. Match sources by canonical URL, content hash, source ID, instrument, and publication time.
3. Classify added, changed, removed/unavailable, duplicate, and unchanged sources.
4. Compare claim support/status against the new packet; leave claims unknown if evidence does not support a deterministic match.
5. Return deltas with evidence links and a policy/materiality result separate from the raw comparison.

## Alternate and failure flows

- If the baseline source content is unavailable, compare stored hashes/metadata and flag the limit.
- If the instrument or source period differs, reject or mark the comparison non-comparable.
- If evidence conflicts, return mixed/conflicting; do not resolve by majority vote or an unbounded model search.

## Functional requirements

- **FR-UC-13-01:** Every delta references baseline and/or current source IDs.
- **FR-UC-13-02:** Return an explicit non-comparable state rather than comparing mismatched instruments or periods.

## Rules and constraints

- Comparison never overwrites the saved dossier.
- Materiality is a separate result with a configured rule/version; “new” does not automatically mean material.

## Dependencies and failure containment

- **Internal:** UC-11 saved snapshots
- **Internal:** UC-09 EvidencePacket
- **Internal:** Versioned diff engine
- **Internal:** Optional materiality classifier
- **External port:** EvidenceSourcePort; ResearchModelPort is optional for concise natural-language explanation only.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a source with unchanged hash, when compared, then it is unchanged and no duplicate alert candidate is created.
- Given a changed source hash for the same canonical source, when compared, then both versions and the content change are recorded without overwriting baseline.

## Applicable shared requirements

[`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-AI-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
