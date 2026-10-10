# UC-09: Collect dated evidence and market data

> Diagram alias: `Evidence` · Product area: Research and discovery · Delivery stage: **MVP-bounded: primary disclosure packet; live market/price data optional and gated**

## Purpose

Build a small, auditable, time-bounded evidence packet from allowlisted sources.

## Contract

**Primary actor:** Research workflow, comparison workflow, or monitoring workflow.

**Trigger:** A parent use case requests evidence for one instrument and declared purpose.

**Preconditions:**

- Instrument is canonical and source policy is configured.
- Requested source types and time window are within the workflow’s allowlist and limits.

**Inputs:**

- Canonical instrument, use-case purpose, source-type allowlist, time window, packet size limit, locale/currency if relevant.

**Outputs:**

- EvidencePacket of SourceRecords and bounded excerpts, with coverage, freshness and access-class metadata.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-08, UC-12, UC-14, and UC-20; source records support UC-22.

## Main success flow

1. Select the allowed source adapters for the purpose.
2. Fetch documents/records within configured limits and provider terms.
3. Capture publisher, source type, URL, publication time if known, retrieval time, content hash, and permitted excerpts.
4. Deduplicate identical content by canonical URL/hash and preserve conflicting versions as separate records.
5. Return the packet plus coverage, freshness, and unavailable-source metadata.

## Alternate and failure flows

- If a provider times out or rate-limits, return partial coverage with the failed source and retryability.
- If publication date is unknown, mark unknown and prevent a claim of recency.
- If licensing/terms do not allow storing content, retain only permitted metadata/excerpt/link.

## Functional requirements

- **FR-UC-09-01:** Every retained record includes source identity, timestamps/status, and access class.
- **FR-UC-09-02:** Bound source count, body size, and request duration; return explicit partial/unavailable metadata.

## Rules and constraints

- MVP source packet uses selected official exchange and issuer disclosures. Live quotes/fundamentals are not assumed by the phrase “market data.”
- No arbitrary broad scraping, hidden paid content, or prompt instructions from retrieved documents.

## Dependencies and failure containment

- **Internal:** Source registry
- **Internal:** Allowlist and packet builder
- **Internal:** Content hash/deduplication
- **Internal:** Evidence quality validator
- **External port:** EvidenceSourcePort: versioned fixture packet and approved public/official sources.
- **External port:** MarketDataPort is a separate optional provider; source rights and freshness must be verified.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given two versions of the same source with different hashes, when collected, then both versions are retained and dated rather than silently overwritten.
- Given one provider failure, when collection completes, then the packet marks the missing source and does not call itself complete.

## Applicable shared requirements

[`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-DATA-02`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md), [`NFR-AI-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
