from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from market_partner.models import PortfolioSnapshot, Position, SourceRecord


class FixturePortfolioAdapter:
    def __init__(self, fixture: dict[str, Any]) -> None:
        self.fixture = fixture

    def snapshot(self, *, owner_id: str, active_account_refs: set[str], fetched_at: datetime) -> PortfolioSnapshot:
        positions = [
            Position.model_validate(item)
            for item in self.fixture["positions"]
            if item["account_ref"] in active_account_refs
        ]
        incomplete = any(item.market_value_minor is None for item in positions)
        completeness = ["synthetic_fixture"]
        if incomplete:
            completeness.append("one_or_more_positions_missing_valuation")
        if not active_account_refs:
            completeness.append("no_active_sample_accounts")
        return PortfolioSnapshot(
            snapshot_id=f"snapshot_{uuid4().hex}",
            owner_id=owner_id,
            provider_mode="fixture",
            provider_name=self.fixture["provider_name"],
            fetched_at=fetched_at,
            as_of=datetime.fromisoformat(self.fixture["as_of"].replace("Z", "+00:00")),
            currency=self.fixture["currency"],
            coverage="partial" if incomplete else ("complete" if positions else "unavailable"),
            completeness=completeness,
            positions=positions,
        )


class FixtureEvidenceAdapter:
    def __init__(self, fixtures_path: Path) -> None:
        self.fixtures_path = fixtures_path

    def load_packet(self, symbol: str) -> tuple[str, list[SourceRecord]]:
        path = self.fixtures_path / "sources" / f"{symbol.lower()}.json"
        if not path.exists():
            raise FileNotFoundError(symbol)
        with path.open(encoding="utf-8") as handle:
            packet = json.load(handle)
        sources = [SourceRecord.model_validate(item) for item in packet["sources"]]
        seen: set[tuple[str, str]] = set()
        unique_sources: list[SourceRecord] = []
        for source in sources:
            identity = (source.canonical_url, source.content_hash)
            if identity not in seen:
                seen.add(identity)
                unique_sources.append(source)
        return packet["fixture_disclaimer"], unique_sources


class LocalPaperExecutionAdapter:
    mode = "local_paper"

    def submit(self, preview, *, instrument_token: str | None = None) -> dict[str, Any]:
        return {
            "status": "ACCEPTED_SIMULATED",
            "provider_order_id": None,
            "safe_message": "Accepted by the local paper simulator. No brokerage or exchange order was sent.",
        }

    def status(self, provider_order_id: str) -> dict[str, Any]:
        return {"status": "unavailable", "safe_message": "Local paper orders have no provider order ID."}


class DisabledProviderAdapter:
    """Explicit disabled implementation; never falls through to a different provider."""

    def __init__(self, provider_name: str) -> None:
        self.provider_name = provider_name

    def unavailable(self) -> dict[str, Any]:
        return {
            "state": "unavailable",
            "provider_name": self.provider_name,
            "safe_message": f"{self.provider_name} is not configured for this local demo.",
        }
