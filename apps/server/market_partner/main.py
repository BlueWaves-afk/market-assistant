from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import Response

from market_partner.api import create_router
from market_partner.config import get_settings
from market_partner.errors import DomainError
from market_partner.mcp_server import mcp


settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("market_partner")
mcp_asgi_app = mcp.streamable_http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with mcp.session_manager.run():
        yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin, "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Correlation-ID"],
    expose_headers=["X-Correlation-ID"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, error: DomainError) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", f"req_{uuid4().hex}")
    return JSONResponse(
        status_code=error.status_code,
        content={
            "error": {
                "code": error.code,
                "safe_message": error.safe_message,
                "retryable": False,
                "correlation_id": correlation_id,
            }
        },
    )


@app.middleware("http")
async def correlation_and_safe_logging(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID") or f"req_{uuid4().hex}"
    request.state.correlation_id = correlation_id
    try:
        response: Response = await call_next(request)
    except Exception:
        logger.exception("request_failed correlation_id=%s path=%s", correlation_id, request.url.path)
        raise
    response.headers["X-Correlation-ID"] = correlation_id
    return response


app.include_router(create_router(settings))
# Keep the MCP app last; the mounted server has its own /mcp Streamable HTTP route.
app.mount("/", mcp_asgi_app, name="mcp")
