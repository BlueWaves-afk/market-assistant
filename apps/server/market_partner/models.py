from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, PositiveInt, field_validator


DataMode = Literal["fixture", "authorized_provider", "sandbox"]
ResultState = Literal["complete", "partial", "stale", "unavailable"]
OrderSide = Literal["BUY", "SELL"]


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class SafeError(APIModel):
    code: str
    safe_message: str
    retryable: bool = False
    correlation_id: str
    details: dict[str, Any] | None = None


class Position(APIModel):
    account_ref: str
    account_alias: str
    exchange: str
    symbol: str
    company_name: str
    sector: str | None = None
    quantity: Decimal
    market_value_minor: int | None = None
    currency: str = "INR"
    valuation_price: Decimal | None = None
    valuation_as_of: datetime | None = None
    quality_flags: list[str] = Field(default_factory=list)


class PortfolioSnapshot(APIModel):
    snapshot_id: str
    owner_id: str
    provider_mode: DataMode
    provider_name: str
    fetched_at: datetime
    as_of: datetime
    currency: str = "INR"
    coverage: ResultState
    completeness: list[str] = Field(default_factory=list)
    positions: list[Position]


class ExposureMetric(APIModel):
    label: str
    amount_minor: int | None
    amount_inr: str  # formatted rupee string; amount_minor ÷ 100 (100 paise = ₹1)
    currency: str
    percent: Decimal | None = None
    denominator_minor: int | None = None
    method: str
    coverage: ResultState
    as_of: datetime
    snapshot_id: str


class PortfolioResponse(APIModel):
    snapshot: PortfolioSnapshot
    invested_holdings_value_minor: int | None
    invested_holdings_value_inr: str  # formatted rupee string; invested_holdings_value_minor ÷ 100 (100 paise = ₹1)
    metrics: list[ExposureMetric]
    summary: str


class SourceRecord(APIModel):
    source_id: str
    publisher: str
    source_type: str
    title: str
    canonical_url: str
    instrument_ids: list[str]
    published_at: datetime | None = None
    retrieved_at: datetime
    content_hash: str
    license_or_access_class: str
    excerpts: list[dict[str, str]]
    freshness_status: str


class EvidenceClaim(APIModel):
    claim_id: str
    statement: str
    claim_kind: Literal["reported_fact", "calculation", "interpretation"]
    evidence_ids: list[str]
    status: Literal["supported", "contradicted", "mixed", "unknown"]
    as_of: datetime | None = None
    calculation_method: str | None = None


class AgentAnalysis(APIModel):
    role: str
    summary: str
    claim_ids: list[str] = Field(default_factory=list)
    counterpoints: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class ModelUsage(APIModel):
    provider: str
    model_id: str
    requests: int = Field(ge=0)
    prompt_tokens: int = Field(ge=0)
    completion_tokens: int = Field(ge=0)
    total_tokens: int = Field(ge=0)


class ResearchRun(APIModel):
    run_id: str
    owner_id: str
    instrument_id: str
    company_name: str
    question: str
    source_packet: list[SourceRecord]
    claims: list[EvidenceClaim]
    supported_case: list[str]
    countercase: list[str]
    disagreements: list[str]
    unknowns: list[str]
    analyses: list[AgentAnalysis]
    workflow_version: str
    started_at: datetime
    completed_at: datetime
    validation_status: Literal["valid", "partial", "rejected"]
    data_mode: DataMode
    disclaimer: str
    model_usage: ModelUsage | None = None


class ResearchRequest(APIModel):
    symbol: str = Field(min_length=1, max_length=24)
    question: str = Field(default="Summarize the strongest supported case and countercase.", max_length=500)


class DossierSaveRequest(APIModel):
    run_id: str
    title: str = Field(min_length=1, max_length=120)
    notes: str = Field(default="", max_length=2000)


class SavedDossier(APIModel):
    dossier_id: str
    owner_id: str
    run_id: str
    instrument_id: str
    version: int
    title: str
    notes: str
    saved_at: datetime
    active: bool = True


class ScreenCriterion(APIModel):
    field: Literal["sector", "market_cap_minor", "revenue_growth_pct", "debt_to_equity"]
    operator: Literal["eq", "neq", "gt", "gte", "lt", "lte", "contains"]
    value: str | Decimal | int


class ScreenRequest(APIModel):
    universe_id: str = "demo-nse-equities-v1"
    criteria: list[ScreenCriterion] = Field(min_length=1, max_length=8)


class ScreenResult(APIModel):
    screen_id: str
    universe_id: str
    universe_version: str
    criteria: list[ScreenCriterion]
    matched: list[dict[str, Any]]
    excluded: list[dict[str, Any]]
    as_of: datetime
    data_mode: DataMode
    disclaimer: str


class AccountLink(APIModel):
    account_ref: str
    owner_id: str
    provider_name: str
    alias: str
    status: Literal["active", "revoked", "simulated"]
    scopes: list[str]
    connected_at: datetime
    last_read_at: datetime | None = None
    mode: Literal["fixture", "simulated", "authorized_provider", "sandbox"]


class AccountConnectRequest(APIModel):
    provider_name: str = Field(min_length=1, max_length=60)
    alias: str = Field(min_length=1, max_length=60)
    mode: Literal["fixture"] = "fixture"


class ActivityRecord(APIModel):
    activity_id: str
    account_ref: str
    account_alias: str
    instrument_id: str
    activity_type: str
    date: datetime
    signed_quantity: Decimal
    gross_amount_minor: int | None = None
    fees_minor: int | None = None
    currency: str = "INR"
    source_timestamp: datetime
    completeness: list[str] = Field(default_factory=list)
    data_mode: DataMode


class PerformanceResult(APIModel):
    metric_name: str
    period: str
    method: str
    value: Decimal | None
    currency: str | None
    coverage: ResultState
    as_of: datetime
    missing_inputs: list[str] = Field(default_factory=list)


class BrokerResearchResult(APIModel):
    state: ResultState
    provider_name: str | None = None
    instrument_id: str
    reports: list[dict[str, Any]] = Field(default_factory=list)
    message: str


class WatchlistEntry(APIModel):
    entry_id: str
    owner_id: str
    instrument_id: str
    company_name: str
    active: bool
    added_at: datetime
    saved_dossier_id: str | None = None
    saved_dossier_version: int | None = None


class AlertRule(APIModel):
    rule_id: str
    owner_id: str
    enabled: bool
    baseline_dossier_id: str | None = None
    baseline_version: int | None = None
    event_classes: list[str]
    threshold: int = Field(ge=1, le=100)
    source_types: list[str]
    schedule: str
    description: str
    delivery_channels: list[Literal["in_app", "email", "push"]]


class Alert(APIModel):
    alert_id: str
    owner_id: str
    instrument_id: str
    rule_id: str
    source_ids: list[str]
    source_metadata: list[dict[str, Any]] = Field(default_factory=list)
    comparison_dossier_id: str | None = None
    comparison_dossier_version: int | None = None
    reason: str
    detected_at: datetime
    materiality_status: Literal["material", "immaterial", "unknown"]
    delivery_status: Literal["not_requested", "pending", "delivered", "failed"]
    read: bool = False
    dismissed: bool = False
    data_mode: DataMode


class AlertRuleRequest(APIModel):
    instrument_id: str
    baseline_dossier_id: str | None = None
    event_classes: list[Literal["operating_update", "financial_result", "regulatory_filing", "management_change", "corporate_action"]] = Field(min_length=1, max_length=10)
    threshold: int = Field(default=50, ge=1, le=100)
    source_types: list[Literal["issuer", "exchange", "news", "demonstration_fixture"]] = Field(default_factory=lambda: ["issuer", "exchange"])
    schedule: str = "manual"
    description: str = Field(min_length=1, max_length=240)


class AlertPreferencesRequest(APIModel):
    channels: list[Literal["in_app", "email", "push"]]
    opted_in: bool = False
    destination: str | None = None


class OrderPreviewRequest(APIModel):
    symbol: str = Field(min_length=1, max_length=24)
    exchange: Literal["NSE", "BSE"]
    side: OrderSide
    quantity: PositiveInt
    limit_price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    account_alias: str = Field(min_length=1, max_length=60)

    @field_validator("limit_price")
    @classmethod
    def positive_price(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("limit_price must be greater than zero")
        return value


class OrderPreview(APIModel):
    preview_id: str
    owner_id: str
    account_ref: str | None = None
    instrument_id: str
    company_name: str
    side: OrderSide
    quantity: int
    limit_price: Decimal
    estimated_value_minor: int
    currency: str
    account_alias: str
    current_exposure_minor: int | None
    hypothetical_exposure_minor: int | None
    exposure_percent: Decimal | None
    exposure_snapshot_id: str | None
    request_hash: str
    created_at: datetime
    expires_at: datetime
    mode: Literal["local_paper", "sandbox"]
    state: Literal["PREVIEWED", "USER_CONFIRMED", "EXPIRED", "CANCELLED"]
    warning: str


class ConfirmOrderRequest(APIModel):
    explicit_confirmation: bool
    confirmation_token: str = Field(min_length=32, max_length=128)
    idempotency_key: str = Field(min_length=16, max_length=128)


class PaperOrder(APIModel):
    order_id: str
    preview_id: str
    owner_id: str
    provider_order_id: str | None
    instrument_id: str
    side: OrderSide
    quantity: int
    limit_price: Decimal
    mode: Literal["local_paper", "sandbox"]
    status: str
    status_as_of: datetime
    version: int = 1
    last_change_id: str | None = None
    data_mode: DataMode
    safe_message: str


class OrderChangeRequest(APIModel):
    quantity: PositiveInt | None = None
    limit_price: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)


class OrderChangePreview(APIModel):
    change_id: str
    order_id: str
    owner_id: str
    action: Literal["modify", "cancel"]
    terms: dict[str, Any]
    observed_order_version: int
    request_hash: str
    state: Literal["PENDING_CONFIRMATION", "EXPIRED", "STALE"]
    expires_at: datetime
    mode: Literal["local_paper", "sandbox"]


class ChangeConfirmRequest(APIModel):
    explicit_confirmation: bool
    idempotency_key: str = Field(min_length=16, max_length=128)


class ChatMessage(APIModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(APIModel):
    message: str = Field(min_length=1, max_length=1200)
    history: list[ChatMessage] = Field(default_factory=list, max_length=24)


class ChatResponse(APIModel):
    reply: str
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    data: dict[str, Any] | None = None
    mode: Literal["fixture_router", "bedrock", "sarvam"]
    model_usage: ModelUsage | None = None
    correlation_id: str


class HealthResponse(APIModel):
    status: str
    app_name: str
    providers: dict[str, bool]
    demo_mode: bool
    mcp_url: str
