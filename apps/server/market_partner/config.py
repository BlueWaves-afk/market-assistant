from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Market Partner"
    app_env: str = "development"
    demo_mode: bool = True
    demo_owner_id: str = "demo-investor"
    database_path: Path = REPO_ROOT / ".local" / "market-partner.sqlite3"
    fixtures_path: Path = REPO_ROOT / "fixtures"
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    web_origin: str = "http://localhost:5173"
    mcp_url: str = "http://127.0.0.1:8000/mcp"

    bedrock_enabled: bool = False
    aws_region: str = "ap-south-1"
    bedrock_model_id: str = ""
    bedrock_max_tokens: int = 1200
    bedrock_timeout_seconds: float = 25.0

    sarvam_enabled: bool = False
    sarvam_api_key: SecretStr | None = None
    sarvam_model_id: str = "sarvam-105b"
    sarvam_base_url: str = "https://api.sarvam.ai/v1/chat/completions"
    sarvam_max_tokens: int = 1200
    sarvam_timeout_seconds: float = 60.0

    upstox_sandbox_enabled: bool = False
    upstox_sandbox_verified: bool = False
    upstox_sandbox_base_url: str = "https://sandbox.upstox.com"
    upstox_sandbox_token: SecretStr | None = None

    snaptrade_enabled: bool = False
    snaptrade_client_id: str | None = None
    snaptrade_consumer_key: SecretStr | None = None

    @property
    def providers_ready(self) -> dict[str, bool]:
        return {
            "bedrock": self.bedrock_enabled and bool(self.bedrock_model_id),
            "sarvam": (
                self.sarvam_enabled
                and self.sarvam_api_key is not None
                and bool(self.sarvam_api_key.get_secret_value().strip())
            ),
            "upstox_sandbox": (
                self.upstox_sandbox_enabled
                and self.upstox_sandbox_verified
                and self.upstox_sandbox_token is not None
            ),
            # Credentials alone do not make this provider ready. OAuth, callback handling,
            # encrypted token storage, ownership checks, and revocation are not implemented yet.
            "snaptrade": False,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
