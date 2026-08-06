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

    # Investment Committee (institutional quality gate over every technique)
    COMMITTEE_ENABLED: bool = True       # set false in .env to trade without the gate
    COMMITTEE_MIN_SCORE: float = 65.0    # composite score below this -> NO TRADE
    COMMITTEE_MIN_RR: float = 1.5        # reward:risk floor
    COMMITTEE_NEWS_MIN: int = 15         # stand-aside window (min) around high-impact news

    # Telegram alerts (FREE) — needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env
    NOTIFY_ENABLED: bool = True

    # AI Advisor (LLM second opinion — ADVISORY ONLY, never trades on its own)
    # OFF by default now: the advisor speaks ONLY in the daily boardroom meeting,
    # not on every trade during the day (that was paying for opinions nobody reads).
    ADVISOR_ENABLED: bool = False                       # intraday advisor OFF (set true in .env to re-enable)
    ADVISOR_MODEL: str = "claude-haiku-4-5-20251001"    # cheap model; override w/ ANTHROPIC_MODEL
    ADVISOR_DAILY_USD_CAP: float = 0.15                 # hard daily spend cap ($); stops when hit
    ADVISOR_MIN_GAP_SEC: int = 1800                     # min gap between advisor calls (except real trades)

    # Daily Boardroom Meeting (ประชุมใหญ่ 4 ทุ่ม) — LLM multi-turn, ADVISORY REPORT ONLY.
    # Agents genuinely take turns (one LLM call each); CEO answers useful questions;
    # the AI advisor joins here (its only speaking slot). Sends the full transcript +
    # CEO summary to Telegram. Weekdays only. Hard caps on messages AND daily spend.
    BOARDROOM_ENABLED: bool = True
    BOARDROOM_HOUR: int = 22             # local hour to convene (24h)
    BOARDROOM_TZ_OFFSET: int = 7         # local = UTC + this (Thailand = +7)
    BOARDROOM_MAX_MESSAGES: int = 30     # HARD cap on LLM messages per meeting
    BOARDROOM_DAILY_USD_CAP: float = 0.10   # HARD daily spend cap ($) for the meeting
    BOARDROOM_MODEL: str = "claude-haiku-4-5-20251001"
    BOARDROOM_MAX_TOKENS: int = 280      # per speaker turn (1-5 sentences)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
