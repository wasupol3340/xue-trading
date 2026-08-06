from fastapi import APIRouter

from app.core.config import settings
from app.schemas.trading import CandleOut
from app.services.market_data import get_candles, get_price
from app.services.mt5_bridge import bridge

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/price")
async def price(symbol: str | None = None) -> dict:
    sym = symbol or settings.SYMBOL
    return {"symbol": sym, "price": get_price(sym)}


@router.get("/candles", response_model=list[CandleOut])
async def candles(symbol: str | None = None, timeframe: str = "M15", count: int = 90) -> list[CandleOut]:
    return get_candles(symbol or settings.SYMBOL, timeframe, count)


@router.get("/mt5/status")
async def mt5_status() -> dict:
    return bridge.status()
