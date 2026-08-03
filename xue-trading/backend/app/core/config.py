from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    PROJECT_NAME: str = "XUE Trading"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"

    # Security
    SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Dashboard login (single admin, DB-free)
    DASHBOARD_USER: str = "master@xuetrading.ai"
    DASHBOARD_PASSWORD: str = "xue-admin-2026"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://xue:xue@localhost:5432/xue_trading"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # MT5
    MT5_LOGIN: int = 0
    MT5_PASSWORD: str = ""
    MT5_SERVER: str = "MetaQuotes-Demo"
    MT5_PATH: str = ""  # optional path to terminal64.exe
    MT5_MAGIC: int = 20260803
    MT5_DEVIATION: int = 20  # max slippage in points
    MT5_ACCOUNT_TYPE: str = "demo"  # demo | live  (safety gate for live trading)

    # Symbol
    SYMBOL: str = "XAUUSD"

    # Autonomous trading
    AUTO_TRADING_ENABLED: bool = False  # master kill-switch (off by default!)
    MEETING_INTERVAL_SEC: int = 900  # AI meeting cadence (15 min)
    MANAGE_INTERVAL_SEC: int = 5  # trailing-stop / position management tick
    MIN_CONFIDENCE: float = 70.0  # skip trades below this consensus confidence
    MAX_OPEN_TRADES: int = 3
    # Distances in PRICE units (USD for XAUUSD). e.g. 9.0 = $9 move on gold.
    TP_POINTS: float = 9.0  # default take-profit distance
    SL_POINTS: float = 6.0  # default stop-loss distance
    TRAILING_ENABLED: bool = True
    TRAILING_START: float = 3.0  # profit ($) before trailing activates
    TRAILING_DISTANCE: float = 2.0  # trail SL this far ($) behind price

    # Risk defaults
    RISK_PER_TRADE: float = 5.0
    MAX_DRAWDOWN: float = 20.0
    DAILY_LOSS_LIMIT: float = 8.0
    MAX_EXPOSURE_LOTS: float = 1.0


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
