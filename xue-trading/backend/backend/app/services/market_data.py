"""
Market data — pulls REAL candles and price from MetaTrader 5 when available,
falling back to a synthetic series so the app runs anywhere. Real candles are
what the technique brains (services/techniques.py) analyse.
"""
import math
import random
import time
from typing import List

from app.schemas.trading import CandleOut

try:  # pragma: no cover - platform dependent
    import MetaTrader5 as mt5  # type: ignore

    _HAS_MT5 = True
except Exception:  # noqa: BLE001
    mt5 = None  # type: ignore
    _HAS_MT5 = False

_state = {"price": 2345.68}

_TF = {}
if _HAS_MT5:  # pragma: no cover
    _TF = {
        "M1": mt5.TIMEFRAME_M1, "M5": mt5.TIMEFRAME_M5, "M15": mt5.TIMEFRAME_M15,
        "H1": mt5.TIMEFRAME_H1, "H4": mt5.TIMEFRAME_H4, "D1": mt5.TIMEFRAME_D1,
    }


def get_price(symbol: str = "XAUUSD") -> float:
    """Latest tick — real bid/ask midpoint from MT5, else synthetic."""
    if _HAS_MT5:  # pragma: no cover
        t = mt5.symbol_info_tick(symbol)
        if t and t.bid:
            _state["price"] = round((t.bid + t.ask) / 2, 2)
            return _state["price"]
    _state["price"] += (random.random() - 0.5) * 1.4
    return round(_state["price"], 2)


def get_candles(symbol: str = "XAUUSD", timeframe: str = "M15", count: int = 120) -> List[CandleOut]:
    """Real OHLCV from MT5 (copy_rates) when connected, else a synthetic series."""
    if _HAS_MT5:  # pragma: no cover
        tf = _TF.get(timeframe, mt5.TIMEFRAME_M15)
        rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
        if rates is not None and len(rates):
            out: List[CandleOut] = []
            for r in rates:
                out.append(
                    CandleOut(
                        time=int(r["time"]) * 1000,
                        open=float(r["open"]), high=float(r["high"]),
                        low=float(r["low"]), close=float(r["close"]),
                        volume=float(r["tick_volume"]),
                    )
                )
            if out:
                _state["price"] = out[-1].close
            return out

    # synthetic fallback
    candles: List[CandleOut] = []
    price = _state["price"] - 26
    now = int(time.time() * 1000)
    step = {"M1": 60, "M5": 300, "M15": 900, "H1": 3600, "H4": 14400, "D1": 86400}.get(timeframe, 900)
    for i in range(count, 0, -1):
        drift = math.sin(i / 6) * 2.4
        noise = (random.random() - 0.5) * 6
        o = price
        cl = o + drift + noise
        hi = max(o, cl) + random.random() * 3
        low = min(o, cl) - random.random() * 3
        candles.append(
            CandleOut(time=now - i * step * 1000, open=round(o, 2), high=round(hi, 2),
                      low=round(low, 2), close=round(cl, 2), volume=round(500 + random.random() * 1500, 0))
        )
        price = cl
    return candles
