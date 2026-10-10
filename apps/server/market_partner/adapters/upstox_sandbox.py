from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

import httpx
from pydantic import SecretStr

from market_partner.errors import DomainError
from market_partner.models import OrderPreview


class SubmissionUnknown(Exception):
    """The request may have reached the sandbox; reconciliation is required before retry."""


class UpstoxSandboxAdapter:
    """Sandbox-only Upstox REST adapter. It rejects any base URL outside the sandbox origin."""

    mode = "sandbox"

    def __init__(self, base_url: str, access_token: SecretStr, *, timeout_seconds: float = 10) -> None:
        parsed = urlparse(base_url)
        if parsed.scheme != "https" or parsed.hostname != "sandbox.upstox.com" or parsed.port not in (None, 443):
            raise ValueError("Upstox adapter accepts only https://sandbox.upstox.com")
        self.base_url = "https://sandbox.upstox.com"
        self.access_token = access_token.get_secret_value()
        self.timeout_seconds = timeout_seconds

    def _request(self, method: str, path: str, *, json_body: dict[str, Any] | None = None, params: dict[str, str] | None = None) -> dict[str, Any]:
        try:
            response = httpx.request(
                method,
                f"{self.base_url}{path}",
                headers={
                    "Authorization": f"Bearer {self.access_token}",
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json=json_body,
                params=params,
                timeout=httpx.Timeout(self.timeout_seconds, connect=4),
                follow_redirects=False,
            )
        except httpx.TimeoutException as error:
            raise SubmissionUnknown("The sandbox request timed out; check order status before retrying.") from error
        except httpx.ConnectError as error:
            raise DomainError("provider_unavailable", "Upstox sandbox could not be reached.", 424) from error
        except httpx.HTTPError as error:
            raise DomainError("provider_unavailable", "Upstox sandbox could not be reached.", 424) from error
        if response.is_error:
            # Deliberately do not surface raw provider bodies or authorization details.
            if response.status_code >= 500:
                raise SubmissionUnknown("Upstox sandbox returned a server error; reconcile status before retrying.")
            raise DomainError("provider_rejected", f"Upstox sandbox returned HTTP {response.status_code}.", 424)
        try:
            payload = response.json()
        except ValueError as error:
            raise DomainError("provider_invalid_response", "Upstox sandbox returned an unreadable response.", 502) from error
        if not isinstance(payload, dict):
            raise DomainError("provider_invalid_response", "Upstox sandbox returned an unexpected response.", 502)
        return payload

    def submit(self, preview: OrderPreview, *, instrument_token: str | None = None) -> dict[str, Any]:
        if not instrument_token:
            raise DomainError("instrument_mapping_unavailable", "This demo instrument has no verified Upstox instrument key.", 424)
        try:
            payload = self._request(
                "POST",
                "/v2/order/place",
                json_body={
                    "quantity": preview.quantity,
                    "product": "D",
                    "validity": "DAY",
                    "price": float(preview.limit_price),
                    "tag": f"mp_{preview.preview_id[-12:]}",
                    "instrument_token": instrument_token,
                    "order_type": "LIMIT",
                    "transaction_type": preview.side,
                    "disclosed_quantity": 0,
                    "trigger_price": 0,
                    "is_amo": False,
                },
            )
        except DomainError as error:
            if error.code == "provider_invalid_response":
                raise SubmissionUnknown(
                    "The sandbox accepted an unreadable response; reconcile by tag before retrying."
                ) from error
            raise
        data = payload.get("data") or {}
        order_id = data.get("order_id") or data.get("orderId")
        if not order_id:
            raise SubmissionUnknown("The sandbox response did not include an order ID; reconcile by tag before retrying.")
        return {
            "status": "SUBMITTED_SANDBOX",
            "provider_order_id": str(order_id),
            "safe_message": "Submitted to the Upstox sandbox. No real money is involved.",
        }

    def status(self, provider_order_id: str) -> dict[str, Any]:
        payload = self._request("GET", "/v2/order/details", params={"order_id": provider_order_id})
        data = payload.get("data") or {}
        return self._normalize_status(data)

    def reconcile_by_tag(self, tag: str) -> dict[str, Any] | None:
        payload = self._request("GET", "/v2/order/details", params={"tag": tag})
        data = payload.get("data") or {}
        if isinstance(data, list):
            data = data[0] if data else {}
        if not isinstance(data, dict) or not (data.get("order_id") or data.get("orderId")):
            return None
        return self._normalize_status(data)

    @staticmethod
    def _normalize_status(data: dict[str, Any]) -> dict[str, Any]:
        raw_status = str(data.get("status", "unknown")).casefold()
        allowed = {
            "validation pending": "PENDING",
            "modify pending": "PENDING",
            "trigger pending": "PENDING",
            "put order req received": "PENDING",
            "open": "OPEN",
            "complete": "COMPLETE",
            "modified": "OPEN",
            "cancel pending": "PENDING",
            "cancelled": "CANCELLED",
            "rejected": "REJECTED",
        }
        return {
            "provider_order_id": str(data.get("order_id") or data.get("orderId") or ""),
            "status": allowed.get(raw_status, "UNMAPPED_PENDING"),
            "provider_status": raw_status,
            "status_as_of": data.get("exchange_timestamp") or data.get("order_timestamp"),
            "safe_message": "Sandbox status refreshed." if raw_status in allowed else "The provider returned an unmapped status; it is not treated as filled.",
        }
