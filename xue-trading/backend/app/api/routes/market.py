from fastapi import APIRouter

from app.schemas.trading import CandleOut
from app.services.market_data import get_candles, get_price
from app.services.mt5_bridge import bridge

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/price")
async def price(symbol: str = "XAUUSD") -> dict:
    return {"symbol": symbol, "price": get_price(symbol)}


@router.get("/candles", response_model=list[CandleOut])
async def candles(symbol: str = "XAUUSD", timeframe: str = "M15", count: int = 90) -> list[CandleOut]:
    return get_candles(symbol, timeframe, count)


@router.get("/mt5/status")
async def mt5_status() -> dict:
    return bridge.status()
