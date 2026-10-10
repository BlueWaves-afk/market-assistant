from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Protocol

from market_partner.models import OrderPreview, PortfolioSnapshot, SourceRecord


class PortfolioReadPort(Protocol):
    def snapshot(
        self,
        *,
        owner_id: str,
        active_account_refs: set[str],
        fetched_at: datetime,
    ) -> PortfolioSnapshot: ...


class EvidenceSourcePort(Protocol):
    def load_packet(self, symbol: str) -> tuple[str, list[SourceRecord]]: ...


class PaperExecutionPort(Protocol):
    """Only sandbox or local-simulator mutations may implement this port."""

    mode: str

    def submit(self, preview: OrderPreview, *, instrument_token: str | None = None) -> dict[str, Any]: ...

    def status(self, provider_order_id: str) -> dict[str, Any]: ...


class NotificationPort(Protocol):
    def deliver(self, channel: str, destination: str, payload: dict[str, Any]) -> dict[str, Any]: ...


class BrokerageReadPort(Protocol):
    def read_holdings(self, account_ref: str) -> dict[str, Any]: ...

    def read_activities(self, account_ref: str, start: datetime, end: datetime) -> list[dict[str, Any]]: ...


class MarketDataPort(Protocol):
    def latest_valuation(self, instrument_id: str, as_of: datetime) -> dict[str, Decimal] | None: ...
