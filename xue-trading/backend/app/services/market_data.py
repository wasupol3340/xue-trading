import math
import random
import time
from typing import List

from app.schemas.trading import CandleOut

_state = {"price": 2345.68}


def get_price(symbol: str = "XAUUSD") -> float:
    """Return the latest tick. In production, read from MT5.symbol_info_tick()."""
    _state["price"] += (random.random() - 0.5) * 1.4
    return round(_state["price"], 2)


def get_candles(symbol: str = "XAUUSD", timeframe: str = "M15", count: int = 90) -> List[CandleOut]:
    """
    Synthetic OHLCV series so the API returns data without a live broker.
    Replace with MT5.copy_rates_from_pos(symbol, tf, 0, count) in production.
    """
    candles: List[CandleOut] = []
    price = _state["price"] - 26
    now = int(time.time() * 1000)
    step = {"M1": 60, "M5": 300, "M15": 900, "H1": 3600, "H4": 14400, "D1": 86400}.get(timeframe, 900)
    for i in range(count, 0, -1):
        drift = math.sin(i / 6) * 2.4
        noise = (random.random() - 0.5) * 6
        o = price
        c = o + drift + noise
        h = max(o, c) + random.random() * 3
        low = min(o, c) - random.random() * 3
        candles.append(
            CandleOut(
                time=now - i * step * 1000,
                open=round(o, 2),
                high=round(h, 2),
                low=round(low, 2),
                close=round(c, 2),
                volume=round(500 + random.random() * 1500, 0),
            )
        )
        price = c
    return candles
