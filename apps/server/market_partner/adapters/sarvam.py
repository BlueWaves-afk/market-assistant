from __future__ import annotations

from typing import Any

import httpx


class SarvamAPIError(RuntimeError):
    """A safe, provider-facing error without request bodies or credentials."""


class SarvamChatClient:
    """Small HTTPX client for Sarvam's stable V1 Chat Completions API."""

    def __init__(self, *, api_key: str, model_id: str, base_url: str, timeout_seconds: float) -> None:
        if not api_key.strip():
            raise ValueError("A Sarvam API key is required")
        self._headers = {"api-subscription-key": api_key, "content-type": "application/json"}
        self._model_id = model_id
        self._base_url = base_url
        self._timeout = httpx.Timeout(timeout_seconds, connect=5.0)

    def _payload(
        self,
        messages: list[dict[str, Any]],
        *,
        max_tokens: int,
        temperature: float,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict[str, Any] | None = None,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": self._model_id,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            # Disable hidden reasoning for these bounded demo turns to reduce latency and cost.
            "reasoning_effort": None,
        }
        if tools:
            payload["tools"] = tools
        if tool_choice is not None:
            payload["tool_choice"] = tool_choice
        if response_format is not None:
            payload["response_format"] = response_format
        return payload

    @staticmethod
    def _decode_response(response: httpx.Response) -> dict[str, Any]:
        if response.is_error:
            raise SarvamAPIError(f"Sarvam chat request failed with HTTP {response.status_code}.")
        try:
            payload = response.json()
        except ValueError as error:
            raise SarvamAPIError("Sarvam returned an unreadable chat response.") from error
        if not isinstance(payload, dict) or not isinstance(payload.get("choices"), list):
            raise SarvamAPIError("Sarvam returned an unexpected chat response shape.")
        return payload

    def complete(
        self,
        messages: list[dict[str, Any]],
        *,
        max_tokens: int,
        temperature: float,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict[str, Any] | None = None,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(
                    self._base_url,
                    headers=self._headers,
                    json=self._payload(
                        messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        tools=tools,
                        tool_choice=tool_choice,
                        response_format=response_format,
                    ),
                )
        except httpx.TimeoutException as error:
            raise SarvamAPIError("Sarvam did not respond before the request timed out.") from error
        except httpx.RequestError as error:
            raise SarvamAPIError("Sarvam could not be reached. Check the network and try again.") from error
        return self._decode_response(response)

    async def acomplete(
        self,
        messages: list[dict[str, Any]],
        *,
        max_tokens: int,
        temperature: float,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    self._base_url,
                    headers=self._headers,
                    json=self._payload(
                        messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        tools=tools,
                        tool_choice=tool_choice,
                    ),
                )
        except httpx.TimeoutException as error:
            raise SarvamAPIError("Sarvam did not respond before the request timed out.") from error
        except httpx.RequestError as error:
            raise SarvamAPIError("Sarvam could not be reached. Check the network and try again.") from error
        return self._decode_response(response)
