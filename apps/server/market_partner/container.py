from functools import lru_cache

from market_partner.application import MarketPartnerApplication
from market_partner.config import get_settings
from market_partner.repository import Repository


@lru_cache
def get_repository() -> Repository:
    return Repository(get_settings().database_path)


@lru_cache
def get_application() -> MarketPartnerApplication:
    settings = get_settings()
    return MarketPartnerApplication(settings, get_repository())
