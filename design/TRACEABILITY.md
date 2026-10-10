# Use-case traceability and delivery order

The IDs map one-to-one to aliases in [`docs/USE_CASES.puml`](../docs/USE_CASES.puml). The use-case spec files are under [`use-cases/`](use-cases/).

## Use-case inventory

| ID | Diagram alias | Use case | Stage | Specification |
|---|---|---|---|---|
| UC-01 | `PortfolioOverview` | Review portfolio overview | MVP-limited | [UC-01](use-cases/UC-01-review-portfolio-overview.md) |
| UC-02 | `ReadHoldings` | Read linked holdings | MVP-fixture-first | [UC-02](use-cases/UC-02-read-linked-holdings.md) |
| UC-03 | `PortfolioMetrics` | Calculate portfolio metrics | MVP-limited | [UC-03](use-cases/UC-03-calculate-portfolio-metrics.md) |
| UC-04 | `Performance` | Review trade history and performance | Later | [UC-04](use-cases/UC-04-review-trade-history-performance.md) |
| UC-05 | `AccountActivities` | Read account activities | Later | [UC-05](use-cases/UC-05-read-account-activities.md) |
| UC-06 | `PerformanceMetrics` | Calculate P&L and performance metrics | Later/gated | [UC-06](use-cases/UC-06-calculate-pnl-performance.md) |
| UC-07 | `BrokerResearch` | Review broker-published research | Later/gated | [UC-07](use-cases/UC-07-review-broker-research.md) |
| UC-08 | `Research` | Research selected companies | MVP, one company/run | [UC-08](use-cases/UC-08-research-selected-companies.md) |
| UC-09 | `Evidence` | Collect dated evidence and market data | MVP-bounded evidence | [UC-09](use-cases/UC-09-collect-dated-evidence.md) |
| UC-10 | `Findings` | Produce sourced findings and countercase | MVP | [UC-10](use-cases/UC-10-produce-sourced-findings.md) |
| UC-11 | `SaveDossier` | Save a research dossier | Later | [UC-11](use-cases/UC-11-save-research-dossier.md) |
| UC-12 | `CompareResearch` | Explain changes since prior research | Later | [UC-12](use-cases/UC-12-explain-research-changes.md) |
| UC-13 | `CompareDossier` | Compare new evidence with saved dossier | Later | [UC-13](use-cases/UC-13-compare-evidence-dossier.md) |
| UC-14 | `Screen` | Screen securities by sector or user criteria | Later | [UC-14](use-cases/UC-14-screen-securities.md) |
| UC-15 | `ApplyCriteria` | Apply selected universe and criteria | Later | [UC-15](use-cases/UC-15-apply-screen-criteria.md) |
| UC-16 | `Connect` | Connect brokerage accounts | Later/gated | [UC-16](use-cases/UC-16-connect-brokerage-account.md) |
| UC-17 | `Disconnect` | Disconnect or revoke linked account access | Later/gated | [UC-17](use-cases/UC-17-revoke-account-access.md) |
| UC-18 | `ConfigureAlerts` | Configure watchlist and alert rules | Later | [UC-18](use-cases/UC-18-configure-watchlist-alerts.md) |
| UC-19 | `AlertPreferences` | Set alert delivery preferences | Later/gated | [UC-19](use-cases/UC-19-set-alert-preferences.md) |
| UC-20 | `ScanEvents` | Scan watched companies for new events | Later/gated | [UC-20](use-cases/UC-20-scan-watched-companies.md) |
| UC-21 | `ReviewAlerts` | Review event alerts | Later | [UC-21](use-cases/UC-21-review-event-alerts.md) |
| UC-22 | `DeliverAlert` | Deliver event alert | Later/gated | [UC-22](use-cases/UC-22-deliver-event-alert.md) |
| UC-23 | `Preview` | Preview a paper order | MVP | [UC-23](use-cases/UC-23-preview-paper-order.md) |
| UC-24 | `HypotheticalExposure` | Calculate hypothetical exposure | MVP | [UC-24](use-cases/UC-24-calculate-hypothetical-exposure.md) |
| UC-25 | `SubmitPaper` | Confirm and submit a paper order | MVP/sandbox gate | [UC-25](use-cases/UC-25-confirm-submit-paper-order.md) |
| UC-26 | `ValidateOrder` | Validate exact preview and confirmation | MVP | [UC-26](use-cases/UC-26-validate-order-confirmation.md) |
| UC-27 | `OrderStatus` | Check paper-order status | MVP/sandbox gate | [UC-27](use-cases/UC-27-check-paper-order-status.md) |
| UC-28 | `ModifyOrder` | Modify a paper order | Later/sandbox gate | [UC-28](use-cases/UC-28-modify-paper-order.md) |
| UC-29 | `CancelOrder` | Cancel a paper order | Later/sandbox gate | [UC-29](use-cases/UC-29-cancel-paper-order.md) |
| UC-30 | `ConfirmChange` | Confirm order change or cancellation | Later/sandbox gate | [UC-30](use-cases/UC-30-confirm-order-change.md) |

## Relationships and dependencies

| Use-case relationship | Design interpretation |
|---|---|
| UC-01 includes UC-02 and UC-03 | Overview composes normalized holdings and only the metrics available from that snapshot. |
| UC-04 includes UC-05 and UC-06 | Performance view needs activities plus a complete, method-labeled performance calculation. |
| UC-08 includes UC-09 and UC-10; UC-11 extends UC-08 when the user saves | Each research run gathers bounded evidence and produces findings; a reusable saved dossier is a distinct opt-in action. |
| UC-12 includes UC-09 and UC-13 | Change explanation compares new evidence and prior saved dossier versions. |
| UC-14 includes UC-09 and UC-15 | A screen retrieves approved fields and evaluates only the selected universe and explicit criteria. |
| UC-20 includes UC-09 and UC-13; UC-22 extends UC-20 on a new material event | A scan requires new evidence and a saved comparison baseline; delivery is conditional and separately consented. |
| UC-18 includes UC-19 | Alert configuration includes delivery preferences, but scan rules can exist with in-app-only delivery. |
| UC-23 includes UC-02 and UC-24 | The preview uses an available holdings snapshot and deterministic hypothetical exposure; missing data limits the preview detail, not the user-supplied order fields. |
| UC-25 includes UC-26 | Submission is possible only after exact preview and explicit confirmation validation. |
| UC-28 and UC-29 include UC-30 | Modification/cancellation intents remain drafts until explicit confirmation bound to the exact current order state. |

## Application entry points

Use cases are application behaviors, not a requirement to expose one MCP tool per diagram bubble. The host exposes a small task-level tool set; internal use cases are composed behind those tools. Provider adapters are never exposed directly to the model.

| Use case(s) | MVP application entry | Later surface |
|---|---|---|
| UC-01–UC-03 | `get_portfolio_exposure` for the requested instrument/sector and supported fixture/provider snapshot. | A broader portfolio overview contract is required before claiming full portfolio-level analytics. |
| UC-08 | `research_company` MCP tool. | Multi-company runs remain one request per company until a batch contract is designed. |
| UC-09–UC-10 | Internal evidence and research graph services invoked by UC-08. | No standalone provider or agent tool. |
| UC-23 | `preview_paper_order` MCP tool. | Change/cancel preview commands are not MVP. |
| UC-24 | Internal deterministic exposure calculator invoked by preview. | No standalone model tool for arithmetic. |
| UC-25 | `confirm_paper_order` MCP tool with preview ID and explicit confirmation. | No generic `place_order` tool. |
| UC-26 | Internal deterministic validator invoked by UC-25. | Reused by UC-30; never called by the model as an independent side effect. |
| UC-27 | `get_paper_order_status` MCP tool. | Provider state mapping is capability-gated. |
| UC-04–UC-07, UC-11–UC-22, UC-28–UC-30 | No public MCP contract is frozen for the later phase. | Define the user-facing command, authorization, and provider capability only when the required data/provider gates close. |

## Recommended implementation order

1. Shared contracts and ports: [`DOMAIN_CONTRACTS.md`](DOMAIN_CONTRACTS.md), [`DEPENDENCIES.md`](DEPENDENCIES.md).
2. MVP evidence path: UC-09 → UC-10 → UC-08, then MCP host and browser path.
3. Fixture portfolio/exposure: UC-02 → UC-03 → UC-01 and UC-24.
4. Order safety: UC-23 → UC-26 → UC-25 → UC-27; do not enable external submit until the Upstox sandbox gate passes.
5. Future product groups only after their provider/data gates close: UC-11–15, UC-04–07, UC-16–22, UC-28–30.
