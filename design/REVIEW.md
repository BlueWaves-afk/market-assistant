# Consistency, constraints, and dependency review

**Review date:** 10 October 2026

**Scope:** Full use-case target, individual UC specs, C4/HLD, shared contracts, and documented MVP boundary.

**Result:** The design set is internally consistent for implementation planning. MVP behavior is separated from later features. External integration gates are explicit and have fail-closed or fixture/disabled behavior.

## Coverage and structural checks

- The PlantUML diagram contains **30 use cases**; there is exactly one UC spec file for each diagram alias.
- All specs contain purpose, actor/trigger, preconditions, input/output, success/failure postconditions, main flow, alternate/failure behavior, functional requirements, constraints, dependencies, acceptance criteria, and shared requirement references.
- UC IDs and diagram aliases are indexed in [`TRACEABILITY.md`](TRACEABILITY.md). FR IDs are unique; NFR references point to the shared [`REQUIREMENTS.md`](REQUIREMENTS.md) register.
- Include/extend relationships are reflected in both traceability and the relevant UC specs. The optional “save dossier” extension now points from UC-11 to UC-08, matching UML `extend` direction.

## Cross-document consistency findings and resolutions

| Finding | Resolution in the design |
|---|---|
| The architecture used “dossier” for both a research-run result and a user-saved library item. | [`DOMAIN_CONTRACTS.md`](DOMAIN_CONTRACTS.md) distinguishes immutable `ResearchRun` provenance (MVP) from explicit, versioned `SavedDossier` (UC-11, later). HLD/README now call MVP persistence a research-run snapshot. |
| The source use case said “market data,” while the MVP source packet is official company/exchange evidence and does not promise live quotes. | UC-09 and `EvidenceSourcePort` define bounded primary disclosures for MVP. Price/fundamental/FX feeds are a separate `MarketDataPort` and remain unavailable until provider, freshness, and rights are verified. |
| Security identity/universe discovery needed a provider boundary separate from research evidence and valuation feeds. | `InstrumentUniversePort` now supplies the seeded demo instrument in MVP and a versioned, licensed universe in later screening/discovery; ambiguous or unsupported instruments fail closed. |
| Portfolio performance could appear computable from account activity alone. | UC-04–06 require complete activity, valuation, fees, dividends, corporate-action, and FX inputs; missing coverage returns `insufficient_data`. SnapTrade’s daily refresh is never labeled real-time. |
| SnapTrade account linking could be mistaken for access to broker-authored research or order placement. | UC-07 uses a separate `BrokerResearchPort`; UC-16 is read-only; UC-25 uses a separate Upstox sandbox `PaperExecutionPort`. No universal or live broker trading is specified. |
| Portfolio overview could overstate MVP breadth. | UC-01/03 are explicitly MVP-limited to values/exposure supported by a single complete or labeled-partial snapshot. Performance and P&L remain later. |
| Order preview, submit, modify, and cancel could share an ambiguous confirmation path. | UC-23 creates immutable preview only; UC-25 uses UC-26 exact-preview validation; UC-28/29 create change previews; UC-30 confirms the exact current order state. All external mutation is sandbox-only and idempotent/reconciled. |
| Performance and screening could depend on undefined calculations or field meanings. | UC-06 gates P&L on a versioned methodology; UC-14/15 gate screening on a versioned field/operator/unit registry. These decisions are explicit before those features start. |
| The hackathon permits MCP 2025-11-25 or later, while the documented integration path uses `initialize`. | For this submission, architecture, README, HLD, and dependency design pin 2025-11-25. The newer 2026-07-28 MCP semantics remove the initialization handshake; any upgrade is an explicit protocol migration, not a floating dependency. |

## Dependency closure

There are **no undeclared logical/provider dependencies** in the 30 use-case designs. Each provider is behind a named port, with ownership, stage, readiness, and failure behavior in [`DEPENDENCIES.md`](DEPENDENCIES.md). Optional integrations do not leak into core use-case contracts.

Explicit gates remain, and are not represented as already solved:

- **MVP:** Bedrock account/model/region and cost limit; selection and terms review for live evidence sources; Upstox sandbox credentials and supported instrument/order/status endpoints; exact MCP SDK version compatible with the pinned protocol.
- **Optional MVP:** brokerage account authorization. Fixture mode is the default; live accounts remain disabled until identity, scope, secret storage, freshness, and revocation are verified.
- **Later:** broker-research rights/provider; market-price, corporate-action, and FX coverage for P&L/screening; scheduler; verified notification provider and consent; multi-user identity and production secret storage; sandbox modify/cancel capability.

Each gate has one of two outcomes: use the documented fixture for local/demo paths where that is valid, or keep the capability disabled and return a truthful unavailable/partial result. No feature silently substitutes another provider, account, source, or stale value.

## Constraint and requirement audit

- **Research:** source IDs must come from the same validated packet; unknowns and freshness are visible; no recommendation/action field.
- **Portfolio:** owner-scoped read-only holdings, masked account labels, explicit fixture/live mode, deterministic fixed-precision arithmetic, no missing-as-zero behavior.
- **Order lifecycle:** cash-equity limit orders only in MVP; exact immutable terms; separate confirmation; preview expiry; idempotency; sandbox host allowlist; uncertain result reconciled before retry.
- **Monitoring:** later phase only; requires a saved baseline, source cursor, deduplication, explicit rule, and consent recheck before delivery.
- **Security/privacy:** no provider credentials in the client, prompts, or ordinary logs; owner checks and least privilege are cross-cutting requirements.
- **Accessibility:** text and keyboard paths remain available when voice recognition fails; critical fields are visible before confirmation.

## Implementation readiness

- **Implemented locally:** all 30 use cases have a fixture/simulator path or return the explicit unavailable state described in [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md).
- **Provider-gated:** Bedrock credentials and model permissions, live sources/licensing, SnapTrade OAuth and token lifecycle, broker research, performance data, scheduler, email/push consent and delivery, and Upstox sandbox behavior/mappings remain disabled until verified.
- **Not audited here:** production authentication, deployment infrastructure, operational monitoring, retention policy, and provider account behavior. The implementation status records the checks completed and the remaining gates.

## Verification performed

The design audit matched all 30 diagram aliases to 30 specs; checked 60 unique FR IDs, all 13 NFRs, all 13 dependency ports, required sections, 275 local Markdown links, and an acyclic include/extend graph. Markdown code fences are balanced. The implementation status records build checks separately and does not claim external provider access has been verified.
