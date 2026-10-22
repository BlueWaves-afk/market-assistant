from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Iterable
from uuid import uuid4

from market_partner.adapters.fixtures import FixtureEvidenceAdapter, FixturePortfolioAdapter
from market_partner.adapters.upstox_sandbox import SubmissionUnknown, UpstoxSandboxAdapter
from market_partner.config import Settings
from market_partner.errors import DomainError
from market_partner.models import (
    AccountLink,
    ActivityRecord,
    Alert,
    AlertPreferencesRequest,
    AlertRule,
    AlertRuleRequest,
    BrokerResearchResult,
    DossierSaveRequest,
    ExposureMetric,
    OrderChangePreview,
    OrderChangeRequest,
    OrderPreview,
    OrderPreviewRequest,
    PaperOrder,
    PerformanceResult,
    PortfolioResponse,
    PortfolioSnapshot,
    Position,
    ResearchRequest,
    ResearchRun,
    SavedDossier,
    ScreenRequest,
    ScreenResult,
    SourceRecord,
    WatchlistEntry,
)
from market_partner.repository import Repository
from market_partner.workflows.research import (
    BedrockResearchModel,
    ResearchValidationError,
    SarvamResearchModel,
    create_research_run,
)


def now_utc() -> datetime:
    return datetime.now(UTC)


def iso(value: datetime | None = None) -> str:
    return (value or now_utc()).isoformat()


def opaque(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


def money_minor(value: Decimal) -> int:
    return int((value * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def percent(numerator: int, denominator: int) -> Decimal:
    return (Decimal(numerator) * Decimal(100) / Decimal(denominator)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


class MarketPartnerApplication:
    """Application services behind REST and MCP. The local demo owner is server controlled."""

    def __init__(self, settings: Settings, repository: Repository) -> None:
        self.settings = settings
        self.repository = repository
        self.owner_id = settings.demo_owner_id
        self.portfolio_fixture = self._read_fixture("portfolio.json")
        self.instrument_fixture = self._read_fixture("instruments.json")
        self.activity_fixture = self._read_fixture("activities.json")
        self.event_fixture = self._read_fixture("events.json")
        self.portfolio_adapter = FixturePortfolioAdapter(self.portfolio_fixture)
        self.evidence_adapter = FixtureEvidenceAdapter(settings.fixtures_path)
        self.upstox_adapter = (
            UpstoxSandboxAdapter(settings.upstox_sandbox_base_url, settings.upstox_sandbox_token)
            if settings.providers_ready["upstox_sandbox"] and settings.upstox_sandbox_token
            else None
        )
        self._ensure_seed_accounts()

    def _read_fixture(self, name: str) -> dict[str, Any]:
        path = self.settings.fixtures_path / name
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)

    def _ensure_seed_accounts(self) -> None:
        existing = {account["account_ref"] for account in self.repository.list("account", self.owner_id)}
        for account_ref, alias in (("acct-demo-1", "Sample Account A"), ("acct-demo-2", "Sample Account B")):
            if account_ref in existing:
                continue
            account = AccountLink(
                account_ref=account_ref,
                owner_id=self.owner_id,
                provider_name="Market Partner local fixture",
                alias=alias,
                status="simulated",
                scopes=["read:holdings", "read:activities"],
                connected_at=now_utc(),
                mode="fixture",
            )
            self.repository.put("account", account_ref, self.owner_id, account, iso())
        if self.upstox_adapter and not self.repository.get("account", "upstox-sandbox", self.owner_id):
            sandbox_account = AccountLink(
                account_ref="upstox-sandbox",
                owner_id=self.owner_id,
                provider_name="Upstox Sandbox",
                alias="Upstox Sandbox",
                status="active",
                scopes=["paper:orders", "read:paper-order-status"],
                connected_at=now_utc(),
                mode="sandbox",
            )
            self.repository.put("account", "upstox-sandbox", self.owner_id, sandbox_account, iso())

    @property
    def instruments(self) -> list[dict[str, Any]]:
        return self.instrument_fixture["instruments"]

    def resolve_instrument(self, term: str) -> dict[str, Any]:
        normalized = term.strip().upper()
        candidates = [
            instrument
            for instrument in self.instruments
            if normalized in {instrument["symbol"].upper(), instrument["company_name"].upper()}
            or normalized in instrument["company_name"].upper()
        ]
        if not candidates:
            collapsed_term = re.sub(r"[^A-Z0-9]", "", normalized)
            if collapsed_term:
                candidates = [
                    instrument
                    for instrument in self.instruments
                    if collapsed_term == re.sub(r"[^A-Z0-9]", "", instrument["symbol"].upper())
                    or collapsed_term in re.sub(r"[^A-Z0-9]", "", instrument["company_name"].upper())
                ]
        if len(candidates) != 1:
            if candidates:
                raise DomainError("ambiguous_instrument", "Choose one exact demo security symbol.", 422)
            raise DomainError(
                "instrument_not_found",
                "That security is not in the small, fictional demo universe.",
                404,
            )
        return candidates[0]

    @staticmethod
    def instrument_id(instrument: dict[str, Any]) -> str:
        return f"{instrument['exchange']}:{instrument['symbol']}:EQ:{instrument['currency']}"

    def _active_account_refs(self) -> set[str]:
        return {
            account["account_ref"]
            for account in self.repository.list("account", self.owner_id)
            if account.get("status") in {"active", "simulated"}
        }

    def _portfolio_snapshot(self) -> PortfolioSnapshot:
        return self.portfolio_adapter.snapshot(
            owner_id=self.owner_id,
            active_account_refs=self._active_account_refs(),
            fetched_at=now_utc(),
        )

    def get_portfolio_exposure(
        self, symbol: str | None = None, sector: str | None = None
    ) -> PortfolioResponse:
        snapshot = self._portfolio_snapshot()
        valued = [p for p in snapshot.positions if p.market_value_minor is not None]
        denominator = sum(p.market_value_minor or 0 for p in valued)
        has_incomplete = len(valued) != len(snapshot.positions) or not snapshot.positions
        complete = not has_incomplete
        focus = self.resolve_instrument(symbol) if symbol else None
        metrics: list[ExposureMetric] = []
        if focus:
            focus_id = self.instrument_id(focus)
            selected = [
                p for p in valued if f"{p.exchange}:{p.symbol}:EQ:{p.currency}" == focus_id
            ]
            amount = sum(p.market_value_minor or 0 for p in selected) if selected else 0
            metrics.append(
                ExposureMetric(
                    label=f"{focus['company_name']} invested holdings exposure",
                    amount_minor=amount,
                    currency=snapshot.currency,
                    percent=percent(amount, denominator) if complete and denominator else None,
                    denominator_minor=denominator if complete else None,
                    method="sum valued position market values / valued holdings total",
                    coverage="complete" if complete else "partial",
                    as_of=snapshot.as_of,
                    snapshot_id=snapshot.snapshot_id,
                )
            )
        elif sector:
            normalized_sector = sector.strip().casefold()
            selected = [p for p in valued if (p.sector or "").casefold() == normalized_sector]
            amount = sum(p.market_value_minor or 0 for p in selected)
            metrics.append(
                ExposureMetric(
                    label=f"{sector} invested holdings exposure",
                    amount_minor=amount,
                    currency=snapshot.currency,
                    percent=percent(amount, denominator) if complete and denominator else None,
                    denominator_minor=denominator if complete else None,
                    method="sum valued sector positions / valued holdings total",
                    coverage="complete" if complete else "partial",
                    as_of=snapshot.as_of,
                    snapshot_id=snapshot.snapshot_id,
                )
            )
        else:
            grouped: dict[str, int] = {}
            for position in valued:
                key = position.sector or "Unknown sector"
                grouped[key] = grouped.get(key, 0) + (position.market_value_minor or 0)
            for key, amount in sorted(grouped.items()):
                metrics.append(
                    ExposureMetric(
                        label=f"{key} invested holdings exposure",
                        amount_minor=amount,
                        currency=snapshot.currency,
                        percent=percent(amount, denominator) if complete and denominator else None,
                        denominator_minor=denominator if complete else None,
                        method="sum valued sector positions / valued holdings total",
                        coverage="complete" if complete else "partial",
                        as_of=snapshot.as_of,
                        snapshot_id=snapshot.snapshot_id,
                    )
                )
        summary = (
            f"Sample-data snapshot: {len(snapshot.positions)} positions, "
            f"₹{Decimal(denominator) / 100:,.2f} valued holdings. "
            "Percentages are withheld because at least one position is missing valuation data."
            if not complete
            else f"Sample-data snapshot: {len(snapshot.positions)} positions valued at ₹{Decimal(denominator) / 100:,.2f}."
        )
        return PortfolioResponse(
            snapshot=snapshot,
            invested_holdings_value_minor=denominator if valued else None,
            metrics=metrics,
            summary=summary,
        )

    def get_holdings(self) -> PortfolioSnapshot:
        return self._portfolio_snapshot()

    def research(self, request: ResearchRequest) -> ResearchRun:
        instrument = self.resolve_instrument(request.symbol)
        instrument_id = self.instrument_id(instrument)
        try:
            _, sources = self.evidence_adapter.load_packet(instrument["symbol"])
        except FileNotFoundError:
            raise DomainError(
                "research_packet_unavailable",
                "No approved source packet is configured for that demo security yet.",
                424,
            )
        model = None
        if self.settings.providers_ready["sarvam"] and self.settings.sarvam_api_key:
            model = SarvamResearchModel(
                api_key=self.settings.sarvam_api_key.get_secret_value(),
                model_id=self.settings.sarvam_model_id,
                base_url=self.settings.sarvam_base_url,
                max_tokens=self.settings.sarvam_max_tokens,
                timeout_seconds=self.settings.sarvam_timeout_seconds,
            )
        elif self.settings.providers_ready["bedrock"]:
            model = BedrockResearchModel(
                region=self.settings.aws_region,
                model_id=self.settings.bedrock_model_id,
                max_tokens=self.settings.bedrock_max_tokens,
                timeout_seconds=self.settings.bedrock_timeout_seconds,
            )
        try:
            run = create_research_run(
                owner_id=self.owner_id,
                instrument_id=instrument_id,
                company_name=instrument["company_name"],
                question=request.question,
                sources=sources,
                model=model,
            )
        except ResearchValidationError as error:
            raise DomainError(
                "research_output_rejected",
                "The research response failed the evidence and policy checks, so no report was saved.",
                502,
            ) from error
        except Exception as error:
            raise DomainError(
                "research_unavailable",
                "Research could not complete, so no report was saved. Check provider readiness and try again.",
                424,
            ) from error
        self.repository.put("research_run", run.run_id, self.owner_id, run, iso())
        return run

    def get_research_run(self, run_id: str) -> ResearchRun:
        data = self.repository.get("research_run", run_id, self.owner_id)
        if not data:
            raise DomainError("research_run_not_found", "Research run was not found.", 404)
        return ResearchRun.model_validate(data)

    def save_dossier(self, request: DossierSaveRequest) -> SavedDossier:
        run = self.get_research_run(request.run_id)
        current = [
            SavedDossier.model_validate(item)
            for item in self.repository.list("dossier", self.owner_id)
            if item["run_id"] == run.run_id and item.get("active", True)
        ]
        dossier = SavedDossier(
            dossier_id=opaque("dossier"),
            owner_id=self.owner_id,
            run_id=run.run_id,
            instrument_id=run.instrument_id,
            version=max((item.version for item in current), default=0) + 1,
            title=request.title,
            notes=request.notes,
            saved_at=now_utc(),
        )
        self.repository.put("dossier", dossier.dossier_id, self.owner_id, dossier, iso())
        return dossier

    def list_dossiers(self) -> list[SavedDossier]:
        return [
            SavedDossier.model_validate(item)
            for item in self.repository.list("dossier", self.owner_id, include_inactive=False)
        ]

    def archive_dossier(self, dossier_id: str) -> SavedDossier:
        data = self.repository.get("dossier", dossier_id, self.owner_id)
        if not data:
            raise DomainError("dossier_not_found", "Saved dossier was not found.", 404)
        data["active"] = False
        self.repository.put("dossier", dossier_id, self.owner_id, data, iso())
        return SavedDossier.model_validate(data)

    def compare_research(self, run_id: str, dossier_id: str) -> dict[str, Any]:
        run = self.get_research_run(run_id)
        dossier_data = self.repository.get("dossier", dossier_id, self.owner_id)
        if not dossier_data or not dossier_data.get("active", True):
            raise DomainError("dossier_not_found", "Active saved dossier was not found.", 404)
        if dossier_data["instrument_id"] != run.instrument_id:
            raise DomainError("instrument_mismatch", "Research and dossier must refer to the same security.", 422)
        old_run = self.get_research_run(dossier_data["run_id"])
        old_sources = {source.content_hash: source for source in old_run.source_packet}
        new_sources = {source.content_hash: source for source in run.source_packet}
        return {
            "instrument_id": run.instrument_id,
            "baseline_dossier_id": dossier_id,
            "baseline_version": dossier_data["version"],
            "new_run_id": run.run_id,
            "new_sources": [source.model_dump(mode="json") for key, source in new_sources.items() if key not in old_sources],
            "unchanged_sources": [source.model_dump(mode="json") for key, source in new_sources.items() if key in old_sources],
            "removed_sources": [source.model_dump(mode="json") for key, source in old_sources.items() if key not in new_sources],
            "change_summary": "Source-set comparison only. Differences in conclusions require review of cited source text; no directional action is produced.",
        }

    def screen(self, request: ScreenRequest) -> ScreenResult:
        if request.universe_id != self.instrument_fixture["universe_id"]:
            raise DomainError("universe_unavailable", "Only the selected local demo universe is configured.", 424)
        matched: list[dict[str, Any]] = []
        excluded: list[dict[str, Any]] = []
        for instrument in self.instruments:
            failures: list[str] = []
            for criterion in request.criteria:
                actual = instrument.get(criterion.field)
                expected = criterion.value
                if actual is None:
                    failures.append(f"{criterion.field} unavailable")
                    continue
                if criterion.operator == "eq":
                    passes = str(actual).casefold() == str(expected).casefold()
                elif criterion.operator == "neq":
                    passes = str(actual).casefold() != str(expected).casefold()
                elif criterion.operator == "contains":
                    passes = str(expected).casefold() in str(actual).casefold()
                else:
                    left = Decimal(str(actual))
                    right = Decimal(str(expected))
                    passes = {
                        "gt": left > right,
                        "gte": left >= right,
                        "lt": left < right,
                        "lte": left <= right,
                    }[criterion.operator]
                if not passes:
                    failures.append(f"{criterion.field} did not satisfy {criterion.operator} {expected}")
            (matched if not failures else excluded).append(
                {**instrument, "match_reasons": [] if not failures else failures}
            )
        return ScreenResult(
            screen_id=opaque("screen"),
            universe_id=request.universe_id,
            universe_version=self.instrument_fixture["universe_version"],
            criteria=request.criteria,
            matched=matched,
            excluded=excluded,
            as_of=now_utc(),
            data_mode="fixture",
            disclaimer=self.instrument_fixture["disclaimer"],
        )

    def list_accounts(self) -> list[AccountLink]:
        return [AccountLink.model_validate(item) for item in self.repository.list("account", self.owner_id)]

    def connect_fixture_account(self, provider_name: str, alias: str) -> AccountLink:
        if any(account.alias.casefold() == alias.strip().casefold() for account in self.list_accounts()):
            raise DomainError("account_alias_in_use", "Choose an account alias that is not already in use.", 409)
        ref = opaque("fixture-account")
        account = AccountLink(
            account_ref=ref,
            owner_id=self.owner_id,
            provider_name=f"{provider_name} (simulated)",
            alias=alias,
            status="simulated",
            scopes=["read:holdings", "read:activities"],
            connected_at=now_utc(),
            mode="simulated",
        )
        self.repository.put("account", ref, self.owner_id, account, iso())
        return account

    def revoke_account(self, account_ref: str) -> AccountLink:
        data = self.repository.get("account", account_ref, self.owner_id)
        if not data:
            raise DomainError("account_not_found", "Account link was not found.", 404)
        data["status"] = "revoked"
        self.repository.put("account", account_ref, self.owner_id, data, iso())
        return AccountLink.model_validate(data)

    def account_activities(self) -> list[ActivityRecord]:
        active_refs = self._active_account_refs()
        return [
            ActivityRecord.model_validate({**activity, "data_mode": "fixture"})
            for activity in self.activity_fixture["activities"]
            if activity["account_ref"] in active_refs
        ]

    def performance(self, period: str) -> PerformanceResult:
        missing = ["complete transaction history", "fees and taxes", "dividends", "corporate actions", "complete valuation and FX history"]
        return PerformanceResult(
            metric_name="total_return",
            period=period,
            method="not calculated: required input coverage is incomplete",
            value=None,
            currency=None,
            coverage="unavailable",
            as_of=now_utc(),
            missing_inputs=missing,
        )

    def broker_research(self, symbol: str) -> BrokerResearchResult:
        instrument = self.resolve_instrument(symbol)
        return BrokerResearchResult(
            state="unavailable",
            provider_name=None,
            instrument_id=self.instrument_id(instrument),
            reports=[],
            message="No broker-authored research provider is configured; Market Partner analysis is not presented as broker research.",
        )

    def add_watchlist_entry(self, symbol: str, dossier_id: str | None = None) -> WatchlistEntry:
        instrument = self.resolve_instrument(symbol)
        existing = next(
            (item for item in self.list_watchlist() if item.instrument_id == self.instrument_id(instrument)),
            None,
        )
        if existing:
            return existing
        dossier_version = None
        if dossier_id:
            data = self.repository.get("dossier", dossier_id, self.owner_id)
            if not data or not data.get("active", True):
                raise DomainError("dossier_not_found", "Active saved dossier was not found.", 404)
            dossier_version = int(data["version"])
        entry = WatchlistEntry(
            entry_id=opaque("watch"),
            owner_id=self.owner_id,
            instrument_id=self.instrument_id(instrument),
            company_name=instrument["company_name"],
            active=True,
            added_at=now_utc(),
            saved_dossier_id=dossier_id,
            saved_dossier_version=dossier_version,
        )
        self.repository.put("watchlist", entry.entry_id, self.owner_id, entry, iso())
        return entry

    def list_watchlist(self) -> list[WatchlistEntry]:
        return [WatchlistEntry.model_validate(item) for item in self.repository.list("watchlist", self.owner_id, include_inactive=False)]

    def remove_watchlist_entry(self, entry_id: str) -> None:
        data = self.repository.get("watchlist", entry_id, self.owner_id)
        if not data:
            raise DomainError("watchlist_entry_not_found", "Watchlist entry was not found.", 404)
        data["active"] = False
        self.repository.put("watchlist", entry_id, self.owner_id, data, iso())

    def configure_alert(self, request: AlertRuleRequest) -> AlertRule:
        instrument = self.resolve_instrument(request.instrument_id.split(":")[1] if ":" in request.instrument_id else request.instrument_id)
        supported_event_classes = {event["event_class"] for event in self.event_fixture["events"]}
        supported_source_types = {event["source_type"] for event in self.event_fixture["events"]}
        if not set(request.event_classes).issubset(supported_event_classes):
            raise DomainError("event_class_unavailable", "One or more event classes are not available in this demo feed.", 422)
        if not set(request.source_types).intersection(supported_source_types):
            raise DomainError("source_type_unavailable", "Choose a source type that exists in the configured demo feed.", 422)
        if not request.baseline_dossier_id:
            raise DomainError("baseline_required", "Save a research dossier for this security before creating a monitored rule.", 422)
        baseline_data = self.repository.get("dossier", request.baseline_dossier_id, self.owner_id)
        if not baseline_data or not baseline_data.get("active", True):
            raise DomainError("baseline_unavailable", "Choose an active saved research dossier as the monitoring baseline.", 422)
        if baseline_data["instrument_id"] != self.instrument_id(instrument):
            raise DomainError("baseline_instrument_mismatch", "The monitoring baseline must be for the selected security.", 422)
        if not any(entry.instrument_id == self.instrument_id(instrument) for entry in self.list_watchlist()):
            self.add_watchlist_entry(instrument["symbol"], request.baseline_dossier_id)
        rule = AlertRule(
            rule_id=opaque("rule"),
            owner_id=self.owner_id,
            enabled=True,
            baseline_dossier_id=request.baseline_dossier_id,
            baseline_version=int(baseline_data["version"]),
            event_classes=request.event_classes,
            threshold=request.threshold,
            source_types=request.source_types,
            schedule=request.schedule,
            description=request.description,
            delivery_channels=["in_app"],
        )
        self.repository.put("alert_rule", rule.rule_id, self.owner_id, rule, iso())
        self.repository.put(
            "alert_rule_instrument",
            rule.rule_id,
            self.owner_id,
            {
                "rule_id": rule.rule_id,
                "instrument_id": self.instrument_id(instrument),
                "baseline_dossier_id": request.baseline_dossier_id,
                "baseline_version": int(baseline_data["version"]),
            },
            iso(),
        )
        return rule

    def list_alert_rules(self) -> list[AlertRule]:
        return [AlertRule.model_validate(item) for item in self.repository.list("alert_rule", self.owner_id)]

    def set_alert_preferences(self, request: AlertPreferencesRequest) -> dict[str, Any]:
        if any(channel != "in_app" for channel in request.channels) or request.opted_in:
            raise DomainError(
                "notification_provider_unavailable",
                "Email and push delivery are disabled until a provider, verified destination, and consent flow are configured. In-app alerts remain available.",
                424,
            )
        value = {"owner_id": self.owner_id, "channels": ["in_app"], "opted_in": False, "updated_at": iso()}
        self.repository.put("alert_preferences", "current", self.owner_id, value, iso())
        return value

    def scan_alerts(self) -> list[Alert]:
        events = self.event_fixture["events"]
        new_alerts: list[Alert] = []
        entries = {entry.instrument_id for entry in self.list_watchlist()}
        for rule_data in self.repository.list("alert_rule", self.owner_id):
            rule = AlertRule.model_validate(rule_data)
            binding = self.repository.get("alert_rule_instrument", rule.rule_id, self.owner_id)
            if not rule.enabled or not binding or binding["instrument_id"] not in entries:
                continue
            baseline_data = self.repository.get("dossier", binding.get("baseline_dossier_id", ""), self.owner_id)
            if (
                not baseline_data
                or not baseline_data.get("active", True)
                or int(baseline_data["version"]) != int(binding.get("baseline_version", -1))
            ):
                rule_data["enabled"] = False
                self.repository.put("alert_rule", rule.rule_id, self.owner_id, rule_data, iso())
                continue
            baseline_run = self.get_research_run(baseline_data["run_id"])
            baseline_hashes = {source.content_hash for source in baseline_run.source_packet}
            for event in events:
                if event["instrument_id"] != binding["instrument_id"]:
                    continue
                if event["event_class"] not in rule.event_classes or event["materiality_score"] < rule.threshold:
                    continue
                if event["source_type"] not in rule.source_types:
                    continue
                if event.get("content_hash") in baseline_hashes:
                    continue
                duplicate = any(
                    event["content_hash"] == alert.get("source_metadata", [{}])[0].get("content_hash")
                    and alert["rule_id"] == rule.rule_id
                    for alert in self.repository.list("alert", self.owner_id)
                )
                if duplicate:
                    continue
                alert = Alert(
                    alert_id=opaque("alert"),
                    owner_id=self.owner_id,
                    instrument_id=event["instrument_id"],
                    rule_id=rule.rule_id,
                    source_ids=[event["source_id"]],
                    comparison_dossier_id=binding["baseline_dossier_id"],
                    comparison_dossier_version=int(binding["baseline_version"]),
                    source_metadata=[
                        {
                            "source_id": event["source_id"],
                            "title": event["title"],
                            "canonical_url": event.get("canonical_url"),
                            "content_hash": event["content_hash"],
                            "published_at": event["published_at"],
                            "source_type": event["source_type"],
                        }
                    ],
                    reason=event["reason"],
                    detected_at=now_utc(),
                    materiality_status="material",
                    delivery_status="not_requested",
                    data_mode="fixture",
                )
                self.repository.put("alert", alert.alert_id, self.owner_id, alert, iso())
                new_alerts.append(alert)
        return new_alerts

    def list_alerts(self) -> list[Alert]:
        return [Alert.model_validate(item) for item in self.repository.list("alert", self.owner_id)]

    def review_alert(self, alert_id: str, *, read: bool | None = None, dismissed: bool | None = None) -> Alert:
        data = self.repository.get("alert", alert_id, self.owner_id)
        if not data:
            raise DomainError("alert_not_found", "Alert was not found.", 404)
        if read is not None:
            data["read"] = read
        if dismissed is not None:
            data["dismissed"] = dismissed
        self.repository.put("alert", alert_id, self.owner_id, data, iso())
        return Alert.model_validate(data)

    def deliver_alert_in_app(self, alert_id: str) -> Alert:
        data = self.repository.get("alert", alert_id, self.owner_id)
        if not data:
            raise DomainError("alert_not_found", "Alert was not found.", 404)
        data["delivery_status"] = "delivered"
        self.repository.put("alert", alert_id, self.owner_id, data, iso())
        return Alert.model_validate(data)

    def preview_order(self, request: OrderPreviewRequest) -> OrderPreview:
        instrument = self.resolve_instrument(request.symbol)
        if instrument["exchange"] != request.exchange:
            raise DomainError("exchange_mismatch", "The selected exchange does not match this demo instrument.", 422)
        active_accounts = [
            account
            for account in self.list_accounts()
            if account.status in {"simulated", "active"} and account.alias == request.account_alias
        ]
        if len(active_accounts) != 1:
            raise DomainError("account_unavailable", "Choose an active sample account from the list.", 422)
        selected_account = active_accounts[0]
        use_sandbox = selected_account.mode == "sandbox"
        if use_sandbox and not self.upstox_adapter:
            raise DomainError("sandbox_unavailable", "Upstox sandbox is not verified and enabled.", 424)
        if use_sandbox and not instrument.get("upstox_instrument_token"):
            raise DomainError("instrument_mapping_unavailable", "This demo security has no verified Upstox instrument key.", 424)
        if not request.quantity or request.quantity <= 0:
            raise DomainError("invalid_quantity", "Quantity must be a positive whole number.", 422)
        portfolio = self._portfolio_snapshot()
        instrument_id = self.instrument_id(instrument)
        account_positions = [
            position for position in portfolio.positions if position.account_ref == selected_account.account_ref
        ]
        matching_positions = [
            position
            for position in account_positions
            if f"{position.exchange}:{position.symbol}:EQ:{position.currency}" == instrument_id
        ]
        if request.side == "SELL":
            if use_sandbox:
                raise DomainError(
                    "position_data_unavailable",
                    "Sandbox holdings are not linked, so a sell preview cannot verify available shares.",
                    424,
                )
            available_quantity = sum((position.quantity for position in matching_positions), Decimal(0))
            if available_quantity < request.quantity:
                raise DomainError(
                    "insufficient_position",
                    f"The selected sample account has {available_quantity:g} shares available for this security.",
                    422,
                )
        exposure_available = bool(account_positions) and not use_sandbox
        valued = [p for p in account_positions if p.market_value_minor is not None]
        incomplete = not exposure_available or len(valued) != len(account_positions)
        total = sum(p.market_value_minor or 0 for p in valued) if exposure_available else 0
        current = (
            sum(position.market_value_minor or 0 for position in matching_positions)
            if exposure_available and all(position.market_value_minor is not None for position in matching_positions)
            else None
        )
        notional = money_minor(request.limit_price * Decimal(request.quantity))
        signed = notional if request.side == "BUY" else -notional
        new_position_value = current + signed if current is not None else None
        new_total = total + signed
        simulated_percent = (
            percent(new_position_value, new_total)
            if new_position_value is not None and new_total > 0 and not incomplete
            else None
        )
        timestamp = now_utc()
        terms = {
            "account_ref": selected_account.account_ref,
            "instrument_id": instrument_id,
            "side": request.side,
            "quantity": request.quantity,
            "limit_price": str(request.limit_price),
            "estimated_value_minor": notional,
            "account_alias": request.account_alias,
            "mode": "sandbox" if use_sandbox else "local_paper",
        }
        request_hash = hashlib.sha256(json.dumps(terms, sort_keys=True).encode()).hexdigest()
        return OrderPreview(
            preview_id=opaque("preview"),
            owner_id=self.owner_id,
            account_ref=selected_account.account_ref,
            instrument_id=instrument_id,
            company_name=instrument["company_name"],
            side=request.side,
            quantity=request.quantity,
            limit_price=request.limit_price,
            estimated_value_minor=notional,
            currency=instrument["currency"],
            account_alias=request.account_alias,
            current_exposure_minor=current,
            hypothetical_exposure_minor=new_position_value,
            exposure_percent=simulated_percent,
            exposure_snapshot_id=portfolio.snapshot_id,
            request_hash=request_hash,
            created_at=timestamp,
            expires_at=timestamp + timedelta(minutes=5),
            mode="sandbox" if use_sandbox else "local_paper",
            state="PREVIEWED",
            warning=(
                "Upstox sandbox only. This will not reach a live account or use real money."
                if use_sandbox
                else "Local paper simulation only. No brokerage or exchange order will be sent; no real money is involved."
            ),
        )

    def _require_preview(self, preview_id: str) -> OrderPreview:
        data = self.repository.get("order_preview", preview_id, self.owner_id)
        if not data:
            raise DomainError("preview_not_found", "Order preview was not found or expired.", 404)
        preview = OrderPreview.model_validate(data)
        if preview.state != "PREVIEWED" or preview.expires_at <= now_utc():
            raise DomainError("preview_expired", "Create a new order preview before confirming.", 409)
        return preview

    def store_preview(self, preview: OrderPreview) -> OrderPreview:
        self.repository.put("order_preview", preview.preview_id, self.owner_id, preview, iso())
        return preview

    def issue_confirmation_token(self, record_type: str, record_id: str, explicit_confirmation: bool) -> str:
        if not explicit_confirmation:
            raise DomainError("confirmation_required", "Tick the confirmation box before continuing.", 409)
        if record_type == "order_preview":
            self._require_preview(record_id)
        elif record_type == "order_change":
            data = self.repository.get("order_change", record_id, self.owner_id)
            if not data:
                raise DomainError("change_not_found", "Order change preview was not found.", 404)
            change = OrderChangePreview.model_validate(data)
            if change.state != "PENDING_CONFIRMATION" or change.expires_at <= now_utc():
                raise DomainError("change_expired", "Create a fresh order-change preview.", 409)
        else:
            raise DomainError("confirmation_target_invalid", "This confirmation target is not supported.", 422)
        raw_token = secrets.token_urlsafe(36)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        grant = {
            "owner_id": self.owner_id,
            "target_type": record_type,
            "target_id": record_id,
            "expires_at": iso(now_utc() + timedelta(minutes=2)),
            "consumed": False,
        }
        self.repository.put("confirmation_grant", token_hash, self.owner_id, grant, iso())
        return raw_token

    def confirm_order(
        self, preview_id: str, explicit_confirmation: bool, confirmation_token: str, idempotency_key: str
    ) -> PaperOrder:
        if not explicit_confirmation:
            raise DomainError("confirmation_required", "A separate explicit confirmation is required.", 409)
        previous = self.repository.idempotent_result(self.owner_id, "confirm_order", idempotency_key)
        if previous:
            if previous.get("preview_id") != preview_id:
                raise DomainError("idempotency_key_conflict", "This confirmation key was already used for another preview.", 409)
            existing = PaperOrder.model_validate(previous)
            if existing.mode == "sandbox" and existing.status in {"SUBMITTING", "SUBMISSION_UNKNOWN"}:
                return self._reconcile_sandbox_order(existing, idempotency_key)
            return existing
        preview = self._require_preview(preview_id)
        sandbox = preview.mode == "sandbox"
        order = PaperOrder(
            order_id=opaque("paper-order"),
            preview_id=preview.preview_id,
            owner_id=self.owner_id,
            provider_order_id=None,
            instrument_id=preview.instrument_id,
            side=preview.side,
            quantity=preview.quantity,
            limit_price=preview.limit_price,
            mode=preview.mode,
            status="SUBMITTING" if sandbox else "ACCEPTED_SIMULATED",
            status_as_of=now_utc(),
            version=1,
            data_mode="sandbox" if sandbox else "fixture",
            safe_message=(
                "Confirmation recorded; sandbox submission is in progress."
                if sandbox
                else "Accepted by the local paper simulator. No brokerage or exchange order was sent."
            ),
        )
        preview_data = preview.model_dump(mode="json")
        preview_data["state"] = "USER_CONFIRMED"
        token_hash = hashlib.sha256(confirmation_token.encode("utf-8")).hexdigest()
        with self.repository.transaction() as connection:
            current = connection.execute(
                "SELECT payload_json FROM records WHERE record_type='order_preview' AND record_id=? AND owner_id=?",
                (preview_id, self.owner_id),
            ).fetchone()
            if not current:
                raise DomainError("preview_not_found", "Order preview was not found.", 404)
            stored_preview = json.loads(current["payload_json"])
            if stored_preview["state"] != "PREVIEWED" or datetime.fromisoformat(stored_preview["expires_at"]) <= now_utc():
                raise DomainError("preview_expired", "Create a new order preview before confirming.", 409)
            grant_row = connection.execute(
                "SELECT payload_json FROM records WHERE record_type='confirmation_grant' AND record_id=? AND owner_id=?",
                (token_hash, self.owner_id),
            ).fetchone()
            if not grant_row:
                raise DomainError("confirmation_token_invalid", "Request a fresh confirmation from the order preview.", 403)
            grant = json.loads(grant_row["payload_json"])
            if grant["target_type"] != "order_preview" or grant["target_id"] != preview_id:
                raise DomainError("confirmation_token_mismatch", "This confirmation belongs to a different preview.", 403)
            if grant.get("consumed") or datetime.fromisoformat(grant["expires_at"]) <= now_utc():
                raise DomainError("confirmation_token_expired", "Request a fresh confirmation from the order preview.", 409)
            grant["consumed"] = True
            connection.execute(
                "UPDATE records SET payload_json=?, updated_at=? WHERE record_type='confirmation_grant' AND record_id=? AND owner_id=?",
                (json.dumps(grant, separators=(",", ":"), sort_keys=True), iso(), token_hash, self.owner_id),
            )
            connection.execute(
                "UPDATE records SET payload_json=?, updated_at=? WHERE record_type='order_preview' AND record_id=? AND owner_id=?",
                (json.dumps(preview_data, separators=(",", ":"), sort_keys=True), iso(), preview_id, self.owner_id),
            )
            connection.execute(
                "INSERT INTO records(record_type,record_id,owner_id,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                ("paper_order", order.order_id, self.owner_id, Repository._dump(order), iso(), iso()),
            )
            connection.execute(
                "INSERT INTO idempotency(owner_id,action,idempotency_key,result_json,created_at) VALUES(?,?,?,?,?)",
                (self.owner_id, "confirm_order", idempotency_key, Repository._dump(order), iso()),
            )
        if not sandbox:
            return order

        instrument = self.resolve_instrument(preview.instrument_id.split(":")[1])
        try:
            if not self.upstox_adapter:
                raise DomainError("sandbox_unavailable", "Upstox sandbox is not verified and enabled.", 424)
            provider_result = self.upstox_adapter.submit(
                preview,
                instrument_token=instrument.get("upstox_instrument_token"),
            )
            order = order.model_copy(
                update={
                    "provider_order_id": provider_result["provider_order_id"],
                    "status": provider_result["status"],
                    "status_as_of": now_utc(),
                    "safe_message": provider_result["safe_message"],
                }
            )
        except SubmissionUnknown:
            order = order.model_copy(
                update={
                    "status": "SUBMISSION_UNKNOWN",
                    "status_as_of": now_utc(),
                    "safe_message": "The sandbox outcome is uncertain. Check status; the order will not be resubmitted automatically.",
                }
            )
        except DomainError as error:
            final_status = "REJECTED" if error.code == "provider_rejected" else "FAILED_BEFORE_SUBMIT"
            order = order.model_copy(
                update={"status": final_status, "status_as_of": now_utc(), "safe_message": error.safe_message}
            )
        self.repository.put("paper_order", order.order_id, self.owner_id, order, iso())
        self.repository.update_idempotent_result(
            self.owner_id, "confirm_order", idempotency_key, order, iso()
        )
        return order

    def list_orders(self) -> list[PaperOrder]:
        return [PaperOrder.model_validate(item) for item in self.repository.list("paper_order", self.owner_id)]

    def order_status(self, order_id: str, refresh: bool = False) -> PaperOrder:
        data = self.repository.get("paper_order", order_id, self.owner_id)
        if not data:
            raise DomainError("order_not_found", "Paper order was not found.", 404)
        order = PaperOrder.model_validate(data)
        if refresh and order.mode == "sandbox" and self.upstox_adapter:
            if order.provider_order_id:
                provider_result = self.upstox_adapter.status(order.provider_order_id)
                status_as_of = provider_result.get("status_as_of")
                updated = order.model_copy(
                    update={
                        "status": provider_result["status"],
                        "status_as_of": datetime.fromisoformat(status_as_of) if status_as_of else now_utc(),
                        "safe_message": provider_result["safe_message"],
                    }
                )
                self.repository.put("paper_order", order_id, self.owner_id, updated, iso())
                return updated
            if order.status in {"SUBMITTING", "SUBMISSION_UNKNOWN"}:
                return self._reconcile_sandbox_order(order, None)
        return order

    def _reconcile_sandbox_order(self, order: PaperOrder, idempotency_key: str | None) -> PaperOrder:
        if not self.upstox_adapter:
            return order
        preview_data = self.repository.get("order_preview", order.preview_id, self.owner_id)
        if not preview_data:
            return order
        preview = OrderPreview.model_validate(preview_data)
        tag = f"mp_{preview.preview_id[-12:]}"
        try:
            provider_result = self.upstox_adapter.reconcile_by_tag(tag)
        except DomainError:
            return order
        if not provider_result:
            updated_unknown = order.model_copy(
                update={
                    "status": "SUBMISSION_UNKNOWN",
                    "status_as_of": now_utc(),
                    "safe_message": "No sandbox order is visible yet. The order was not resubmitted; check again before taking action.",
                }
            )
            self.repository.put("paper_order", order.order_id, self.owner_id, updated_unknown, iso())
            if idempotency_key:
                self.repository.update_idempotent_result(
                    self.owner_id, "confirm_order", idempotency_key, updated_unknown, iso()
                )
            return updated_unknown
        status_as_of = provider_result.get("status_as_of")
        updated = order.model_copy(
            update={
                "provider_order_id": provider_result["provider_order_id"],
                "status": provider_result["status"],
                "status_as_of": datetime.fromisoformat(status_as_of) if status_as_of else now_utc(),
                "safe_message": provider_result["safe_message"],
            }
        )
        self.repository.put("paper_order", order.order_id, self.owner_id, updated, iso())
        if idempotency_key:
            self.repository.update_idempotent_result(
                self.owner_id, "confirm_order", idempotency_key, updated, iso()
            )
        return updated

    def preview_order_change(self, order_id: str, action: str, request: OrderChangeRequest | None = None) -> OrderChangePreview:
        if action not in {"modify", "cancel"}:
            raise DomainError("invalid_order_change", "Order change must be modify or cancel.", 422)
        order = self.order_status(order_id)
        if order.mode != "local_paper":
            raise DomainError("sandbox_change_unavailable", "Sandbox modify/cancel stays disabled until those exact endpoints are verified.", 424)
        if order.status not in {"ACCEPTED_SIMULATED", "OPEN_SIMULATED"}:
            raise DomainError("order_not_changeable", "This local paper order is no longer changeable.", 409)
        if action == "modify":
            if request is None or (request.quantity is None and request.limit_price is None):
                raise DomainError("change_terms_required", "Provide a new quantity or limit price to modify.", 422)
            quantity = request.quantity if request.quantity is not None else order.quantity
            limit_price = request.limit_price if request.limit_price is not None else order.limit_price
            if quantity == order.quantity and limit_price == order.limit_price:
                raise DomainError("change_noop", "The proposed terms match the current order. Change a field first.", 422)
            terms = {
                "from_quantity": order.quantity,
                "from_limit_price": str(order.limit_price),
                "quantity": quantity,
                "limit_price": str(limit_price),
                "action": action,
            }
        else:
            terms = {"quantity": order.quantity, "limit_price": str(order.limit_price), "action": action}
        change = OrderChangePreview(
            change_id=opaque("change"),
            order_id=order_id,
            owner_id=self.owner_id,
            action=action,
            terms=terms,
            observed_order_version=order.version,
            request_hash=hashlib.sha256(json.dumps(terms, sort_keys=True).encode()).hexdigest(),
            state="PENDING_CONFIRMATION",
            expires_at=now_utc() + timedelta(minutes=5),
            mode="local_paper",
        )
        self.repository.put("order_change", change.change_id, self.owner_id, change, iso())
        return change

    def confirm_order_change(
        self, change_id: str, explicit_confirmation: bool, confirmation_token: str, idempotency_key: str
    ) -> PaperOrder:
        if not explicit_confirmation:
            raise DomainError("confirmation_required", "A separate explicit confirmation is required.", 409)
        previous = self.repository.idempotent_result(self.owner_id, "confirm_change", idempotency_key)
        if previous:
            if previous.get("last_change_id") != change_id:
                raise DomainError("idempotency_key_conflict", "This confirmation key was already used for another order change.", 409)
            return PaperOrder.model_validate(previous)
        change_data = self.repository.get("order_change", change_id, self.owner_id)
        if not change_data:
            raise DomainError("change_not_found", "Order change preview was not found.", 404)
        change = OrderChangePreview.model_validate(change_data)
        if change.state != "PENDING_CONFIRMATION" or change.expires_at <= now_utc():
            raise DomainError("change_expired", "Create a fresh order-change preview.", 409)
        order = self.order_status(change.order_id)
        if order.version != change.observed_order_version:
            raise DomainError("change_stale", "The order changed after this preview. Review a fresh preview.", 409)
        if change.action == "cancel":
            updated = order.model_copy(update={"status": "CANCELLED_SIMULATED", "status_as_of": now_utc(), "version": order.version + 1, "last_change_id": change_id})
        else:
            updated = order.model_copy(
                update={
                    "quantity": int(change.terms["quantity"]),
                    "limit_price": Decimal(str(change.terms["limit_price"])),
                    "status": "ACCEPTED_SIMULATED",
                    "status_as_of": now_utc(),
                    "version": order.version + 1,
                    "last_change_id": change_id,
                }
            )
        change_data["state"] = "STALE"
        token_hash = hashlib.sha256(confirmation_token.encode("utf-8")).hexdigest()
        with self.repository.transaction() as connection:
            grant_row = connection.execute(
                "SELECT payload_json FROM records WHERE record_type='confirmation_grant' AND record_id=? AND owner_id=?",
                (token_hash, self.owner_id),
            ).fetchone()
            if not grant_row:
                raise DomainError("confirmation_token_invalid", "Request a fresh confirmation from the order-change preview.", 403)
            grant = json.loads(grant_row["payload_json"])
            if grant["target_type"] != "order_change" or grant["target_id"] != change_id:
                raise DomainError("confirmation_token_mismatch", "This confirmation belongs to a different order change.", 403)
            if grant.get("consumed") or datetime.fromisoformat(grant["expires_at"]) <= now_utc():
                raise DomainError("confirmation_token_expired", "Request a fresh confirmation from the order-change preview.", 409)
            grant["consumed"] = True
            connection.execute(
                "UPDATE records SET payload_json=?, updated_at=? WHERE record_type='confirmation_grant' AND record_id=? AND owner_id=?",
                (json.dumps(grant, separators=(",", ":"), sort_keys=True), iso(), token_hash, self.owner_id),
            )
            connection.execute(
                "UPDATE records SET payload_json=?, updated_at=? WHERE record_type='paper_order' AND record_id=? AND owner_id=?",
                (Repository._dump(updated), iso(), order.order_id, self.owner_id),
            )
            connection.execute(
                "UPDATE records SET payload_json=?, updated_at=? WHERE record_type='order_change' AND record_id=? AND owner_id=?",
                (json.dumps(change_data, separators=(",", ":"), sort_keys=True), iso(), change_id, self.owner_id),
            )
            connection.execute(
                "INSERT INTO idempotency(owner_id,action,idempotency_key,result_json,created_at) VALUES(?,?,?,?,?)",
                (self.owner_id, "confirm_change", idempotency_key, Repository._dump(updated), iso()),
            )
        return updated
