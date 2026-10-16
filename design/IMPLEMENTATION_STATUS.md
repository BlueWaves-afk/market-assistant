# Implementation status

**Updated:** 16 October 2026
**Scope:** Local judging build of the 30 designed use cases. The app defaults to synthetic fixtures and a local SQLite store. “Implemented” below means the designed behavior has an executable local path, or returns the designed explicit unavailable state when a provider/data gate is closed. It does not mean a production provider is connected.

## Use-case coverage

| UC | Local implementation | Provider or scope boundary |
|---|---|---|
| UC-01 Review portfolio overview | Portfolio page and `/api/portfolio/overview` compose the fixture snapshot and supported exposure metrics. | Synthetic accounts only; metrics remain partial when a valuation is missing. |
| UC-02 Read linked holdings | Portfolio page and `/api/portfolio/holdings` show active fixture positions with account alias, freshness, and missing-value flags. | Real account authorization is not implemented. |
| UC-03 Calculate portfolio metrics | Fixed-precision exposure calculations by security and sector. | P&L, cash, liabilities, FX, and unlinked accounts are not inferred. |
| UC-04 Review trade history and performance | Activities and performance availability are shown in the portfolio workspace. | Complete performance history is unavailable; no return is fabricated. |
| UC-05 Read account activities | Synthetic activity fixture is filtered to active sample accounts. | No broker activity feed is connected. |
| UC-06 Calculate P&L and performance metrics | The service returns a typed unavailable result listing missing inputs. | Calculation stays disabled until transaction, fee, dividend, corporate-action, valuation, and FX coverage is complete. |
| UC-07 Review broker-published research | The service returns an explicit unavailable result distinct from Market Partner analysis. | No broker-research provider or content rights are configured. |
| UC-08 Research selected companies | Web workflow and MCP `research_company` create a research run for one selected demo company. | The local packet is synthetic and currently exists only for NORTHSTAR; other symbols return explicit packet-unavailable. Live issuer research is not configured. |
| UC-09 Collect dated evidence | Bounded source adapter loads dated, hashed fixture records and excerpts. | Live-source collection and licensing review remain outstanding. |
| UC-10 Produce sourced findings | LangGraph runs independent specialist and bull/bear analyses, validates excerpt IDs, and returns claims, countercase, disagreements, and unknowns. | Sarvam is configured as the local demo model provider; actual request and token totals are attached to each research run. Fixture mode remains available when provider access is disabled. |
| UC-11 Save research dossier | User can save, list, compare, and archive versioned local dossiers. | Local demo owner only; no multi-user identity. |
| UC-12 Explain research changes | New runs are compared with a prior dossier baseline and explain source-set changes. | Conclusion changes require reading the underlying evidence; the app does not output a trade direction. |
| UC-13 Compare evidence with dossier | Content hashes classify new, unchanged, and removed sources. | The local packet is synthetic and intentionally small. |
| UC-14 Screen securities | Discovery screen applies explicit criteria to the versioned demo universe. | No broad or licensed security universe is available. |
| UC-15 Apply screen criteria | Deterministic typed field/operator evaluation returns matches and exclusion reasons. | Only documented fixture fields and units are supported. |
| UC-16 Connect brokerage account | Connections UI can add clearly labeled simulated sample accounts. | SnapTrade OAuth and real account linking are disabled. |
| UC-17 Revoke account access | User can revoke a simulated account; portfolio/activity reads omit revoked accounts. | Real provider token revocation is not implemented. |
| UC-18 Configure watchlist alerts | Monitoring UI stores a watchlist rule against a selected, saved research-dossier baseline. Unsupported classes/source types are rejected. | Manual fixture scans and in-app delivery only; no scheduler. |
| UC-19 Set alert preferences | Preferences accept in-app mode and reject email/push until delivery providers and consent exist. | No email or push destination is collected or contacted. |
| UC-20 Scan watched companies | User-triggered scan compares event content hashes with the rule's saved-dossier source set and deduplicates alerts. | Synthetic event feed only; no scheduler or external source polling is configured. |
| UC-21 Review event alerts | Alerts can be listed, marked read, dismissed, and opened with source title/date, reason, source ID, and baseline version. | Alert evidence is synthetic. |
| UC-22 Deliver event alerts | In-app delivery updates local alert state. | Email/push delivery is disabled. |
| UC-23 Preview a paper order | User enters every term; the service creates an immutable five-minute preview. | Default is local simulation; sandbox requires verified configuration and a mapped instrument. |
| UC-24 Calculate hypothetical exposure | Fixed-precision scenario arithmetic uses the selected account's fixture positions. | Unknown holdings remain unavailable; sandbox sells are blocked because sandbox holdings are not linked. |
| UC-25 Confirm and submit a paper order | Preview-bound, one-time confirmation creates an idempotent local paper order. | Optional adapter is restricted to the Upstox sandbox origin and uses an explicit enable/verify gate; no live endpoint exists. |
| UC-26 Validate order confirmation | Exact preview state, expiry, one-time confirmation grant, and idempotency key are checked before acceptance. | UI confirmation is separate; no confirmation tool is exposed to any model provider. |
| UC-27 Check paper-order status | Local order history is readable; sandbox status refresh and tag reconciliation are implemented behind the provider gate. | Provider response/state mappings must be verified before enabling sandbox mode. |
| UC-28 Modify paper order | User can create and separately confirm a local change preview. | Upstox sandbox modify is disabled pending endpoint and state-machine verification. |
| UC-29 Cancel paper order | User can create and separately confirm a local cancellation preview. | Upstox sandbox cancel is disabled pending endpoint and state-machine verification. |
| UC-30 Confirm order change | Exact change terms, order version, expiry, one-time confirmation grant, and idempotency are checked for local simulation. | No sandbox mutation is exposed. |

## Runtime surfaces

- React/Vite browser client under `apps/web`.
- FastAPI application under `apps/server/market_partner`, with JSON REST endpoints and a Streamable HTTP MCP endpoint at `/mcp`.
- The browser conversation host discovers and calls the local MCP server at runtime. Sarvam receives an explicit allowlist of research/read/preview tools; confirmation, account, alert, and persistence mutations stay behind the UI. Owner, account, and credential identifiers are removed from MCP tool results before sending context to a model provider. Conversation and research responses include Sarvam token-usage totals.
- SQLite state defaults to `.local/market-partner.sqlite3`; fixtures live in `fixtures/`. Both runtime state and credentials are ignored by Git.

## Configuration and gates

| Capability | Required before enabling | Current state |
|---|---|---|
| Sarvam | `SARVAM_ENABLED=true`, API subscription key, and supported model ID. | Stable chat-completion adapter handles assistant tool routing and research-agent calls. The local `.env` enables `sarvam-105b`. |
| Bedrock | `BEDROCK_ENABLED=true`, model ID, AWS SDK credential chain, region access, and model permissions. | Adapter is implemented as an optional provider; AWS access is not required for the local demo. |
| Upstox sandbox | `UPSTOX_SANDBOX_ENABLED=true`, `UPSTOX_SANDBOX_VERIFIED=true`, sandbox token, approved instrument tokens, and verified place/status/tag-reconciliation behavior. | Adapter is implemented but disabled by default. Fixture instrument tokens are null. |
| SnapTrade | Provider approval, OAuth/callback flow, encrypted token storage, owner authorization, freshness handling, and revocation. | Not integrated. Credentials alone do not show the capability as ready. |
| Live market/source data | Approved source and data licenses, canonical security mappings, freshness limits, and provenance. | Not configured; no fixture is represented as live information. |
| Email/push | Delivery provider, verified destination, consent, unsubscribe/revocation, and delivery idempotency. | Disabled. |
| Production multi-user deployment | Authentication, owner isolation, secret management, rate limits, persistent audit/retention policy, deployment hardening, and operational monitoring. | Out of this single-user judging build. |

## Known limits

- The application is a single-user local demo. Repository owner scoping is not a substitute for production authentication.
- Synthetic securities, source excerpts, prices, account activities, screening values, and events are invented. Replace the demo packet and mappings with approved, verified data before making issuer-specific claims.
- The Upstox adapter intentionally refuses any host except `https://sandbox.upstox.com`; it has not been enabled against provider credentials. A submission timeout is treated as unknown and reconciled by tag instead of retried.
- No real order, account, alert, or investment recommendation should be inferred from local demo state.

## Build checks completed

The implementation has been checked with the frontend production build, Python byte-compilation, and backend application import. These checks establish that the source compiles and the app imports; they do not verify external credentials, provider behavior, or end-to-end use-case outcomes.
