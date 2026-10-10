# Dependency ports and readiness

This table closes the design-level dependency graph. A use case depends on an owned application port, not directly on a provider SDK. External access remains a named readiness gate; if the gate is not met, the defined fallback is used or the feature stays disabled.

| Port / boundary | Used by | Provider/adapters | MVP readiness and fallback | Later-phase gate / failure behavior |
|---|---|---|---|---|
| `IdentityContextPort` | All owner-scoped reads/writes | Local demo principal; future identity provider | Fixture-only principal, one local operator; do not enable real account linking on an unauthenticated shared deployment | Real multi-user auth, authorization, account ownership, and session expiry required before live brokerage linking |
| `SecretStorePort` | Brokerage, Bedrock, Upstox, notification adapters | Local environment secrets for team development; managed secret store for deployment | No secrets in fixtures; if a credential is absent, that provider path is disabled | Production secret lifecycle/rotation and access audit required before production use |
| `MCPHostPort` | UC-01, UC-08, UC-23, UC-25, UC-27 public task tools | Pinned official MCP SDK implementing hackathon-required 2025-11-25 Streamable HTTP contract | Required runtime protocol path; MCP `initialize`, `tools/list`, `tools/call` demonstrated; exact SDK/version pinned | Protocol migration is a separately reviewed change; do not mix 2026-07-28 stateless semantics with the 2025-11-25 flow |
| `ResearchModelPort` | UC-08, UC-10, UC-12, UC-13, UC-20, and conversation response | Amazon Bedrock Converse adapter | Live Bedrock access/model/region and spend cap are explicit gates; deterministic fixture responses allowed for local contract/UI development, not represented as live model work | If unavailable at runtime, report research unavailable; no fabricated fallback dossier |
| `EvidenceSourcePort` | UC-08–UC-10, UC-12–UC-14, UC-20–UC-22 | Versioned fixture packet; allowlisted official exchange/issuer sources; future licensed providers | Fixture packet guarantees demo; source fetch must preserve published/retrieved date and hash | Source terms, rate limits, coverage, and provider allowlist must be approved; partial results are labeled; no arbitrary/unbounded scraping |
| `InstrumentUniversePort` | UC-08, UC-14, UC-15, UC-23 | Curated local instrument fixture for the selected demo security; future licensed exchange/security-master provider | MVP supports only seeded, verified NSE/BSE instruments; unknown or ambiguous instruments are rejected/clarified | Market-wide coverage, exchange identifiers, sector taxonomy, corporate actions, update cadence, and redistribution rights must be selected before screening or broad discovery |
| `MarketDataPort` | UC-01, UC-03, UC-06, UC-15, UC-24 | Fixture valuation; a separately selected licensed price/FX/fundamental adapter | MVP only uses supplied fixture/provider values; no unsupported live quote promise | Full portfolio valuation, P&L, screening metrics, and market price claims remain disabled until freshness, corporate action, FX, and coverage semantics are verified |
| `BrokerageReadPort` | UC-01, UC-02, UC-05, UC-16, UC-17 | Fixture provider; optional SnapTrade adapter | Fixture mode is complete and default; SnapTrade access is optional and not required for MVP | Provider application/consent, scopes, account capabilities, freshness, revocation, retention, and per-user isolation must be proven before activation |
| `BrokerResearchPort` | UC-07 | No provider selected; distinct adapter contract | UC-07 disabled in MVP; never substitute model-generated content as broker-authored research | Provider API/content rights, authentication, author/date metadata, redistribution/display terms, and freshness must be approved |
| `PaperExecutionPort` | UC-23, UC-25, UC-27–UC-30 | Upstox sandbox adapter only | Preview works locally; submit/status are enabled only after sandbox access and exact instrument/endpoint verification | Any provider error is mapped to explicit failure or `SUBMISSION_UNKNOWN`; no live endpoint, no automatic retry after ambiguous submit |
| `SchedulerPort` | UC-18, UC-20, UC-22 | Internal scheduled job or selected external scheduler | Not needed for MVP; all monitoring use cases disabled | Job ownership, time zone, retries, deduplication, lease/locking, and observability must be selected before scan activation |
| `NotificationPort` | UC-19, UC-22 | No email/push provider selected | Not needed for MVP; no notification collection or dispatch | Verified destination, explicit opt-in, unsubscribe/revoke, delivery receipts, retry/dedupe and sensitive-content policy required |
| `PersistencePort` | UC-08, UC-11–UC-13, UC-16–UC-22, UC-23, UC-25–UC-30 | SQLite fixture/local repository in MVP; managed relational store later | Local state and fixtures; persist the research-run snapshot and immutable order preview/state needed by the MVP | Transactions, concurrency, tenant scope, backup/deletion, schema migration and retention must be verified before multi-user deployment |

## Product/data decisions that must be pinned before their feature starts

- **Performance semantics (UC-04–UC-06):** select and version cost-basis and return methodologies; define inclusion of fees, taxes, dividends, corporate actions, FX, and incomplete periods. Until then, only activity display is possible; no P&L total is emitted.
- **Screen fields/universe (UC-14–UC-15):** version the supported field/operator/unit registry and source semantics; no model interpretation can fill missing fields.
- **Materiality (UC-20–UC-22):** define deterministic event classes and thresholds; a model may help phrase a reason but cannot turn an unsupported event into a material alert.
- **Data retention (UC-11, UC-16–UC-22, UC-25–UC-30):** define deletion, archive, audit-tombstone, and provider-cache behavior before multi-user deployment. Disconnect immediately disables credentials; retained paper-order and research records remain separate data classes.

## Dependency rules

1. Core use-case logic consumes these ports and typed domain records; provider SDK types do not cross into domain or UI contracts.
2. Optional providers cannot be treated as present merely because configuration exists. Perform capability checks at startup and per operation.
3. No external dependency is an implicit prerequisite: the relevant UC spec names the port and its disabled/partial/fallback behavior.
4. An adapter may not silently switch providers, use a different account, or downgrade data freshness.
5. Development fixture mode is not a substitute for claiming a live external integration.

## MVP integration gates

These are explicit implementation gates, not hidden dependencies:

- **Evidence:** select and retain a valid fixture packet; verify source access/terms for any live fetch.
- **Bedrock:** confirm account, region, model permission, timeout, and cost cap before demo use.
- **Upstox sandbox:** confirm credentials, supported cash-equity instrument, order submission, and status lookup. If any fails, do not claim order submission; preserve preview-only behavior.
- **Live portfolio read:** optional. Keep fixture path as the primary judge path unless authorization and account isolation are proven.
- **Application security:** real account links remain off until identity and secret-store gates are met.
