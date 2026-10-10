# Shared domain and interface contracts

These contracts are shared by the 30 UC specs. Provider payloads must be normalized into these domain records before use by workflows or models. Exact storage technology and provider SDK types are adapter details.

## Ownership and identifiers

- `owner_id`: opaque authenticated principal for a real account. In fixture-only local mode, use a clearly marked demo principal. Every saved dossier, alert, account link, order preview, and paper order is scoped to its owner.
- `account_ref`: internal opaque ID. Provider IDs and account numbers are never displayed or sent to a model. UI uses a masked user-chosen alias.
- `instrument_id`: canonical instrument identity `{exchange, symbol, instrument_type, currency}`. Resolve ambiguous company names before research or orders; never infer an instrument silently.
- All generated IDs are opaque and non-sequential at public boundaries. All stored timestamps use UTC; every displayed value includes an as-of time and source/mode label.

## Research and evidence

### `SourceRecord`

`source_id`, `publisher`, `source_type`, `title`, `canonical_url`, `instrument_ids[]`, `published_at?`, `retrieved_at`, `content_hash`, `license_or_access_class`, `excerpt_ids[]`, `freshness_status`.

Source type and access class are required. A source without a publication date can be retained only with `published_at = unknown`; it cannot silently be described as current. Store only content allowed by source terms; otherwise retain metadata, short allowed excerpts, and a link.

### `EvidenceClaim`

`claim_id`, `statement`, `claim_kind: reported_fact | calculation | interpretation`, `evidence_ids[]`, `status: supported | contradicted | mixed | unknown`, `as_of?`, `calculation_method?`.

Reported facts and interpretations require one or more source IDs. Calculations require their input evidence IDs, method, units, and as-of time. `unknown` is a valid result and must not be rendered as a positive or negative claim.

### `ResearchRun` and `SavedDossier`

- `ResearchRun` is the immutable output of one research request: owner/session reference, canonical instrument, question, source packet IDs, typed claims, findings, unknowns, model/workflow version, started/completed times, and validation status.
- MVP persistence of a `ResearchRun` supports provenance and reopening that run. It is **not** the same as adding it to a reusable, user-managed dossier library.
- `SavedDossier` is a later-phase owner-managed record created only when the user saves a completed run. It references immutable run/source versions and has `dossier_id`, `version`, `saved_at`, title/notes, and active/archive state.
- Compare/monitor flows compare versioned snapshots and source IDs/hashes; they do not overwrite prior dossiers.

## Portfolio and performance

### `PortfolioSnapshot` and `Position`

`snapshot_id`, `owner_id`, `provider_mode: fixture | authorized_provider`, `provider_name`, `fetched_at`, `as_of`, `currency`, `coverage`, `positions[]`.

Each position has `account_ref`, `instrument_id`, `quantity`, `market_value_minor?`, `market_value_currency?`, `valuation_price?`, `valuation_as_of?`, `source_timestamp?`, and quality flags. Market amounts use integer minor currency units or a fixed-precision decimal; never binary floating-point arithmetic.

The snapshot includes completeness flags. If positions, price, FX, or included accounts are missing, portfolio-level percentages are unavailable or explicitly partial. Missing values are never zero. MVP exposure percentages use the aggregate market value of the included, valued holdings as the denominator; cash, liabilities, and unlinked accounts are excluded unless separately represented and labeled. Display the phrase **invested holdings exposure** so this is not mistaken for net worth, buying power, or whole-portfolio allocation.

For a hypothetical cash-equity order, `estimated_value = quantity × user_limit_price`. The simulated invested-holdings denominator adds that notional for a buy and subtracts it for a sell; the position/sector numerator changes by the same signed amount. This is a descriptive scenario, not a cash-flow or portfolio valuation model. A percentage is unavailable when the underlying valued holdings denominator is incomplete or inconsistent.

### `ActivityRecord` and performance result

Activity has provider activity ID, account ref, instrument, activity type, trade/settlement date where available, signed quantity, gross amount, fees/taxes, currency, corporate-action reference, source timestamp, and completeness flags. Stable provider IDs support deduplication.

Performance results expose metric name, period, method, value, currency, input coverage, and as-of. Realized/unrealized P&L or total return may be emitted only when required transactions, fees, dividends, corporate actions, valuation prices, and FX coverage are adequate. Otherwise return a specific `insufficient_data` result with missing inputs.

## Screening, watchlists, and alerts

- `ScreenDefinition`: owner, explicitly selected universe/version, criteria AST, criterion units, source/field provenance, created/updated times. Criteria are deterministic and serializable; no hidden model ranking.
- `WatchlistEntry`: owner, canonical instrument, active state, added time, optional saved dossier ID/version.
- `AlertRule`: rule ID, enabled state, event classes/thresholds, evaluated source types, schedule, and user-visible description. No rule can create an order or recommend an action.
- `Alert`: immutable ID, owner, instrument, rule, source IDs/hashes, comparison target dossier version, reason, detected time, materiality status, delivery status, read/dismiss state. Delivery is a separate idempotent operation.

## Paper order lifecycle

### `OrderPreview`

`preview_id`, `owner_id`, `account_ref`, `instrument_id`, `side`, positive whole-share `quantity`, positive fixed-precision `limit_price`, `estimated_value`, `currency`, `exposure_snapshot_id?`, exact `request_hash`, `created_at`, `expires_at`, `mode=sandbox`, and `state`.

Preview is immutable. Changing any field requires a new preview. It creates no provider order. An order is a user-directed simulation; the application must not supply missing side/quantity/price as an investment suggestion.

### States and transitions

`NONE -> DRAFT -> PREVIEWED -> USER_CONFIRMED -> SUBMITTING -> SUBMITTED_SANDBOX -> STATUS_RECEIVED`.

Safe terminal or exception states are `EXPIRED`, `CANCELLED_BEFORE_SUBMIT`, `REJECTED`, `FAILED_BEFORE_SUBMIT`, and `SUBMISSION_UNKNOWN` (requires reconciliation; do not resubmit blindly). `STATUS_RECEIVED` records a provider observation; it does not imply the order filled.

An order change has its own immutable `ChangePreview` linked to the current provider order ID and observed version/status. Its state is `PENDING_CONFIRMATION -> USER_CONFIRMED -> SUBMITTING_CHANGE | SUBMITTING_CANCEL -> PROVIDER_ACKNOWLEDGED`, with `EXPIRED`, `STALE`, `REJECTED`, `FAILED`, and `OUTCOME_UNKNOWN` exception states. Confirmation is bound to that exact change preview. Modify/cancel transitions are unavailable unless the sandbox capability is verified and the provider order is in an eligible state.

## Common tool/API behavior

- Public conversation tools use typed, versioned input/output contracts. The browser calls the application host; only the server host uses the MCP client. Provider adapters are not exposed as agent tools.
- Errors normalize to `{code, safe_message, retryable, correlation_id, details?}`. Never include a token, raw provider body, or private account identifier in `safe_message`.
- Reads may return `complete`, `partial`, `stale`, or `unavailable` plus timestamps. Mutations return state and provider reference only after a verified result.
- Mutating calls accept an idempotency key or one-time action token. A timeout after an external order request yields `SUBMISSION_UNKNOWN`, then reconciliation, not automatic resubmission.
