from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Body, Query, Response
from pydantic import BaseModel, Field

from market_partner.errors import DomainError
from market_partner.config import Settings
from market_partner.container import get_application
from market_partner.conversation import MCPConversationHost
from market_partner.models import (
    AccountConnectRequest,
    AlertPreferencesRequest,
    AlertRuleRequest,
    ChatRequest,
    ChatResponse,
    ConfirmOrderRequest,
    DossierSaveRequest,
    OrderChangeRequest,
    OrderPreviewRequest,
    ResearchRequest,
    ScreenRequest,
)


class WatchlistAdd(BaseModel):
    symbol: str = Field(min_length=1, max_length=24)
    dossier_id: str | None = None


class AlertReview(BaseModel):
    read: bool | None = None
    dismissed: bool | None = None


class OrderChangeBody(BaseModel):
    action: str
    quantity: int | None = Field(default=None, gt=0)
    limit_price: str | None = None


def create_router(settings: Settings) -> APIRouter:
    router = APIRouter(prefix="/api")
    app_service = get_application()
    conversation = MCPConversationHost(settings)

    @router.get("/health")
    def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "app_name": settings.app_name,
            "providers": settings.providers_ready,
            "demo_mode": settings.demo_mode,
            "mcp_url": settings.mcp_url,
            "capabilities": {
                "portfolio_fixture": True,
                "research_fixture": True,
                "screening_fixture": True,
                "alerts_in_app": True,
                "local_paper_orders": True,
                "bedrock": settings.providers_ready["bedrock"],
                "sarvam": settings.providers_ready["sarvam"],
                "upstox_sandbox": settings.providers_ready["upstox_sandbox"],
                "upstox_instrument_mapping": any(
                    bool(instrument.get("upstox_instrument_token"))
                    for instrument in app_service.instruments
                ),
                "snaptrade": False,
                "email_notifications": False,
                "push_notifications": False,
            },
        }

    @router.get("/mcp/status")
    async def mcp_status() -> dict[str, Any]:
        return await conversation.protocol_status()

    @router.get("/portfolio/overview")
    def portfolio_overview(
        symbol: str | None = Query(default=None, max_length=24),
        sector: str | None = Query(default=None, max_length=80),
    ) -> dict[str, Any]:
        return app_service.get_portfolio_exposure(symbol=symbol, sector=sector).model_dump(mode="json")

    @router.get("/portfolio/holdings")
    def holdings() -> dict[str, Any]:
        return app_service.get_holdings().model_dump(mode="json")

    @router.get("/portfolio/activities")
    def activities() -> list[dict[str, Any]]:
        return [item.model_dump(mode="json") for item in app_service.account_activities()]

    @router.get("/portfolio/performance")
    def performance(period: str = Query(default="all", max_length=48)) -> dict[str, Any]:
        return app_service.performance(period).model_dump(mode="json")

    @router.get("/portfolio/broker-research")
    def broker_research(symbol: str = Query(min_length=1, max_length=24)) -> dict[str, Any]:
        return app_service.broker_research(symbol).model_dump(mode="json")

    @router.post("/research")
    def research(request: ResearchRequest) -> dict[str, Any]:
        return app_service.research(request).model_dump(mode="json")

    @router.get("/research/{run_id}")
    def research_run(run_id: str) -> dict[str, Any]:
        return app_service.get_research_run(run_id).model_dump(mode="json")

    @router.get("/dossiers")
    def dossiers() -> list[dict[str, Any]]:
        return [item.model_dump(mode="json") for item in app_service.list_dossiers()]

    @router.post("/dossiers")
    def save_dossier(request: DossierSaveRequest) -> dict[str, Any]:
        return app_service.save_dossier(request).model_dump(mode="json")

    @router.post("/dossiers/compare")
    def compare_dossier(payload: dict[str, str] = Body(...)) -> dict[str, Any]:
        return app_service.compare_research(payload.get("run_id", ""), payload.get("dossier_id", ""))

    @router.delete("/dossiers/{dossier_id}")
    def archive_dossier(dossier_id: str) -> dict[str, Any]:
        return app_service.archive_dossier(dossier_id).model_dump(mode="json")

    @router.post("/screens")
    def screen(request: ScreenRequest) -> dict[str, Any]:
        return app_service.screen(request).model_dump(mode="json")

    @router.get("/accounts")
    def accounts() -> list[dict[str, Any]]:
        return [item.model_dump(mode="json") for item in app_service.list_accounts()]

    @router.post("/accounts")
    def connect_fixture_account(request: AccountConnectRequest) -> dict[str, Any]:
        return app_service.connect_fixture_account(request.provider_name, request.alias).model_dump(mode="json")

    @router.delete("/accounts/{account_ref}")
    def revoke_account(account_ref: str) -> dict[str, Any]:
        return app_service.revoke_account(account_ref).model_dump(mode="json")

    @router.get("/watchlist")
    def watchlist() -> list[dict[str, Any]]:
        return [item.model_dump(mode="json") for item in app_service.list_watchlist()]

    @router.post("/watchlist")
    def add_watchlist_item(request: WatchlistAdd) -> dict[str, Any]:
        return app_service.add_watchlist_entry(request.symbol, request.dossier_id).model_dump(mode="json")

    @router.delete("/watchlist/{entry_id}")
    def remove_watchlist_item(entry_id: str) -> Response:
        app_service.remove_watchlist_entry(entry_id)
        return Response(status_code=204)

    @router.get("/alerts/rules")
    def alert_rules() -> list[dict[str, Any]]:
        return [item.model_dump(mode="json") for item in app_service.list_alert_rules()]

    @router.post("/alerts/rules")
    def configure_alert(request: AlertRuleRequest) -> dict[str, Any]:
        return app_service.configure_alert(request).model_dump(mode="json")

    @router.post("/alerts/preferences")
    def alert_preferences(request: AlertPreferencesRequest) -> dict[str, Any]:
        return app_service.set_alert_preferences(request)

    @router.post("/alerts/scan")
    def scan_alerts() -> list[dict[str, Any]]:
        return [item.model_dump(mode="json") for item in app_service.scan_alerts()]

    @router.get("/alerts")
    def alerts() -> list[dict[str, Any]]:
        return [item.model_dump(mode="json") for item in app_service.list_alerts()]

    @router.patch("/alerts/{alert_id}")
    def review_alert(alert_id: str, request: AlertReview) -> dict[str, Any]:
        return app_service.review_alert(alert_id, read=request.read, dismissed=request.dismissed).model_dump(mode="json")

    @router.post("/alerts/{alert_id}/deliver")
    def deliver_alert(alert_id: str, channel: str = "in_app") -> dict[str, Any]:
        if channel != "in_app":
            raise DomainError("notification_provider_unavailable", "Only in-app delivery is configured.", 424)
        return app_service.deliver_alert_in_app(alert_id).model_dump(mode="json")

    @router.post("/orders/preview")
    def preview_order(request: OrderPreviewRequest) -> dict[str, Any]:
        preview = app_service.preview_order(request)
        return app_service.store_preview(preview).model_dump(mode="json")

    @router.post("/orders/{preview_id}/confirm")
    def confirm_order(preview_id: str, request: ConfirmOrderRequest) -> dict[str, Any]:
        return app_service.confirm_order(
            preview_id,
            request.explicit_confirmation,
            request.confirmation_token,
            request.idempotency_key,
        ).model_dump(mode="json")

    @router.post("/orders/{preview_id}/confirmation-token")
    def issue_order_confirmation(preview_id: str, payload: dict[str, bool] = Body(...)) -> dict[str, str]:
        token = app_service.issue_confirmation_token(
            "order_preview", preview_id, payload.get("explicit_confirmation", False)
        )
        return {"confirmation_token": token}

    @router.get("/orders")
    def orders() -> list[dict[str, Any]]:
        return [item.model_dump(mode="json") for item in app_service.list_orders()]

    @router.get("/orders/{order_id}/status")
    def order_status(order_id: str, refresh: bool = False) -> dict[str, Any]:
        return app_service.order_status(order_id, refresh).model_dump(mode="json")

    @router.post("/orders/{order_id}/changes")
    def preview_order_change(order_id: str, request: OrderChangeBody) -> dict[str, Any]:
        change_request = (
            OrderChangeRequest(quantity=request.quantity, limit_price=request.limit_price)
            if request.action == "modify"
            else None
        )
        return app_service.preview_order_change(order_id, request.action, change_request).model_dump(mode="json")

    @router.post("/order-changes/{change_id}/confirm")
    def confirm_order_change(change_id: str, request: ConfirmOrderRequest) -> dict[str, Any]:
        return app_service.confirm_order_change(
            change_id,
            request.explicit_confirmation,
            request.confirmation_token,
            request.idempotency_key,
        ).model_dump(mode="json")

    @router.post("/order-changes/{change_id}/confirmation-token")
    def issue_change_confirmation(change_id: str, payload: dict[str, bool] = Body(...)) -> dict[str, str]:
        token = app_service.issue_confirmation_token(
            "order_change", change_id, payload.get("explicit_confirmation", False)
        )
        return {"confirmation_token": token}

    @router.post("/chat", response_model=ChatResponse)
    async def chat(request: ChatRequest) -> ChatResponse:
        return await conversation.respond(request)

    return router
