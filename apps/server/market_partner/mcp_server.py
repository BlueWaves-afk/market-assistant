from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from mcp.server.fastmcp import FastMCP

from market_partner.container import get_application
from market_partner.models import (
    AlertRuleRequest,
    DossierSaveRequest,
    OrderChangeRequest,
    OrderPreviewRequest,
    ResearchRequest,
    ScreenRequest,
)


mcp = FastMCP("Market Partner", json_response=True)
app_service = get_application()


def payload(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [payload(item) for item in value]
    return value


@mcp.tool()
def resolve_company(term: str) -> dict[str, Any]:
    """Resolve an exact symbol or company name from the small fictional demo universe."""
    instrument = app_service.resolve_instrument(term)
    return {"instrument": instrument, "instrument_id": app_service.instrument_id(instrument), "data_mode": "fixture"}


@mcp.tool()
def research_company(symbol: str, question: str = "Summarize the strongest supported case and countercase.") -> dict[str, Any]:
    """Research one selected company using its bounded dated source packet and return cited evidence."""
    return payload(app_service.research(ResearchRequest(symbol=symbol, question=question)))


@mcp.tool()
def get_portfolio_exposure(symbol: str | None = None, sector: str | None = None) -> dict[str, Any]:
    """Read the clearly labeled sample portfolio and calculate descriptive invested-holdings exposure.

    Currency fields ending in `_minor` (such as `amount_minor`, `market_value_minor`, and
    `invested_holdings_value_minor`) are integer paise (100 paise = ₹1). Companion fields
    ending in `_inr` (such as `amount_inr` and `invested_holdings_value_inr`) contain the
    same value pre-formatted as a rupee string; use those when quoting amounts to the user.
    The `summary` field contains a pre-formatted sentence with the correct total in Rupees.
    """
    return payload(app_service.get_portfolio_exposure(symbol=symbol, sector=sector))


@mcp.tool()
def preview_paper_order(
    symbol: str,
    exchange: Literal["NSE", "BSE"],
    side: Literal["BUY", "SELL"],
    quantity: int,
    limit_price: Decimal,
    account_alias: str = "Sample Account A",
) -> dict[str, Any]:
    """Create an immutable five-minute local paper-order preview; this sends no broker order."""
    request = OrderPreviewRequest(
        symbol=symbol,
        exchange=exchange,
        side=side,
        quantity=quantity,
        limit_price=limit_price,
        account_alias=account_alias,
    )
    return payload(app_service.store_preview(app_service.preview_order(request)))


@mcp.tool()
def confirm_paper_order(preview_id: str, confirmation_token: str, idempotency_key: str) -> dict[str, Any]:
    """Confirm the exact order preview in the local paper simulator; no real brokerage call is made."""
    return payload(app_service.confirm_order(preview_id, True, confirmation_token, idempotency_key))


@mcp.tool()
def get_paper_order_status(order_id: str, refresh: bool = False) -> dict[str, Any]:
    """Read the latest known local paper-order status without submitting or changing the order."""
    return payload(app_service.order_status(order_id, refresh))


@mcp.tool()
def save_research_dossier(run_id: str, title: str, notes: str = "") -> dict[str, Any]:
    """Save an owner-scoped, versioned dossier from a completed research run."""
    return payload(app_service.save_dossier(DossierSaveRequest(run_id=run_id, title=title, notes=notes)))


@mcp.tool()
def compare_research(run_id: str, dossier_id: str) -> dict[str, Any]:
    """Compare a new run's source packet with an active saved dossier for the same security."""
    return app_service.compare_research(run_id, dossier_id)


@mcp.tool()
def screen_securities(criteria: list[dict[str, Any]], universe_id: str = "demo-nse-equities-v1") -> dict[str, Any]:
    """Apply explicit deterministic criteria to the small fictional local security universe."""
    return payload(app_service.screen(ScreenRequest(universe_id=universe_id, criteria=criteria)))


@mcp.tool()
def get_portfolio_activities() -> list[dict[str, Any]]:
    """Read synthetic sample account activities with their incomplete-data markers."""
    return payload(app_service.account_activities())


@mcp.tool()
def get_portfolio_performance(period: str = "all") -> dict[str, Any]:
    """Return performance availability and missing inputs; never calculate from incomplete history."""
    return payload(app_service.performance(period))


@mcp.tool()
def get_broker_research(symbol: str) -> dict[str, Any]:
    """Check whether separately attributed broker research is available; no provider is configured in demo mode."""
    return payload(app_service.broker_research(symbol))


@mcp.tool()
def add_to_watchlist(symbol: str, dossier_id: str | None = None) -> dict[str, Any]:
    """Add a demo-universe security to the local watchlist."""
    return payload(app_service.add_watchlist_entry(symbol, dossier_id))


@mcp.tool()
def configure_event_alert(
    instrument_id: str,
    event_classes: list[str],
    threshold: int,
    description: str,
    source_types: list[str] | None = None,
) -> dict[str, Any]:
    """Create a local, in-app-only event alert rule for a watched demo company."""
    request = AlertRuleRequest(
        instrument_id=instrument_id,
        event_classes=event_classes,
        threshold=threshold,
        description=description,
        source_types=source_types or ["issuer", "exchange"],
    )
    return payload(app_service.configure_alert(request))


@mcp.tool()
def scan_watchlist_events() -> list[dict[str, Any]]:
    """Scan the synthetic event fixture and deduplicate matching in-app alerts."""
    return payload(app_service.scan_alerts())


@mcp.tool()
def review_event_alerts() -> list[dict[str, Any]]:
    """List owner-scoped event alerts and their read/dismiss state."""
    return payload(app_service.list_alerts())


@mcp.tool()
def create_order_change_preview(
    order_id: str,
    action: Literal["modify", "cancel"],
    quantity: int | None = None,
    limit_price: Decimal | None = None,
) -> dict[str, Any]:
    """Create an exact local paper-order change preview; a separate confirmation is required."""
    change = app_service.preview_order_change(
        order_id,
        action,
        OrderChangeRequest(quantity=quantity, limit_price=limit_price)
        if action == "modify"
        else None,
    )
    return payload(change)


@mcp.tool()
def confirm_paper_order_change(change_id: str, confirmation_token: str, idempotency_key: str) -> dict[str, Any]:
    """Confirm the exact unexpired local change preview and update only the local simulator."""
    return payload(app_service.confirm_order_change(change_id, True, confirmation_token, idempotency_key))


@mcp.tool()
def list_demo_accounts() -> list[dict[str, Any]]:
    """List simulated sample accounts; this tool does not link a real brokerage account."""
    return payload(app_service.list_accounts())


@mcp.tool()
def revoke_demo_account(account_ref: str) -> dict[str, Any]:
    """Revoke a simulated sample account from this local demo session."""
    return payload(app_service.revoke_account(account_ref))
