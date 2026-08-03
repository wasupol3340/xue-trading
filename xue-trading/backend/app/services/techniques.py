"""
Technique brains — each strategy analyses REAL candles with its OWN logic and
returns an entry signal. This is what makes the Learning AI meaningful: every
technique now trades differently, so the live scores measure genuinely distinct
behaviour (not the same trade under different labels).

These are honest, simplified implementations (real indicators + real price-action
rules) — a starting point to refine per technique, not guaranteed-profitable
black boxes.

analyze(key, candles) -> {"side": "BUY"|"SELL"|None, "reason": str, "strength": 0..1}
"""
from __future__ import annotations

from typing import List, Optional


# --------------------------------------------------------------------------- #
# Indicators (pure python)
# --------------------------------------------------------------------------- #
def ema_series(values: List[float], period: int) -> List[float]:
    if not values:
        return []
    k = 2 / (period + 1)
    out = [values[0]]
    for v in values[1:]:
        out.append(v * k + out[-1] * (1 - k))
    return out


def rsi_series(values: List[float], period: int = 14) -> List[float]:
    n = len(values)
    if n < period + 1:
        return [50.0] * n
    gains, losses = [], []
    for i in range(1, n):
        ch = values[i] - values[i - 1]
        gains.append(max(ch, 0.0))
        losses.append(max(-ch, 0.0))
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    out = [50.0] * (period + 1)
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        rs = (avg_gain / avg_loss) if avg_loss else 100.0
        out.append(100.0 - 100.0 / (1.0 + rs))
    return out[:n] + [out[-1]] * (n - len(out)) if len(out) < n else out[:n]


def macd_series(values: List[float]):
    fast = ema_series(values, 12)
    slow = ema_series(values, 26)
    macd = [f - s for f, s in zip(fast, slow)]
    signal = ema_series(macd, 9)
    return macd, signal


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _series(candles):
    o = [c.open for c in candles]
    h = [c.high for c in candles]
    lo = [c.low for c in candles]
    c = [c.close for c in candles]
    return o, h, lo, c


NONE = {"side": None, "reason": "no setup", "strength": 0.0}


# --------------------------------------------------------------------------- #
# technique analyzers
# --------------------------------------------------------------------------- #
def _ema(candles):
    _, _, _, c = _series(candles)
    if len(c) < 35:
        return NONE
    fast, slow = ema_series(c, 10), ema_series(c, 30)
    if fast[-2] <= slow[-2] and fast[-1] > slow[-1]:
        return {"side": "BUY", "reason": "EMA10 crossed above EMA30", "strength": 0.7}
    if fast[-2] >= slow[-2] and fast[-1] < slow[-1]:
        return {"side": "SELL", "reason": "EMA10 crossed below EMA30", "strength": 0.7}
    return NONE


def _rsi(candles):
    _, _, _, c = _series(candles)
    r = rsi_series(c, 14)
    if len(r) < 3:
        return NONE
    if r[-2] < 30 <= r[-1]:
        return {"side": "BUY", "reason": f"RSI bounce from oversold ({r[-2]:.0f})", "strength": 0.75}
    if r[-2] > 70 >= r[-1]:
        return {"side": "SELL", "reason": f"RSI reject from overbought ({r[-2]:.0f})", "strength": 0.75}
    return NONE


def _macd(candles):
    _, _, _, c = _series(candles)
    if len(c) < 35:
        return NONE
    macd, sig = macd_series(c)
    if macd[-2] <= sig[-2] and macd[-1] > sig[-1]:
        return {"side": "BUY", "reason": "MACD crossed above signal", "strength": 0.65}
    if macd[-2] >= sig[-2] and macd[-1] < sig[-1]:
        return {"side": "SELL", "reason": "MACD crossed below signal", "strength": 0.65}
    return NONE


def _smc(candles):
    """Market structure: break of structure with trend filter."""
    _, h, lo, c = _series(candles)
    if len(c) < 25:
        return NONE
    trend = ema_series(c, 20)
    recent_high = max(h[-11:-1])
    recent_low = min(lo[-11:-1])
    if c[-1] > recent_high and c[-1] > trend[-1]:
        return {"side": "BUY", "reason": "Bullish BOS above structure", "strength": 0.7}
    if c[-1] < recent_low and c[-1] < trend[-1]:
        return {"side": "SELL", "reason": "Bearish BOS below structure", "strength": 0.7}
    return NONE


def _fvg(candles):
    """3-candle Fair Value Gap in the last few bars."""
    _, h, lo, _ = _series(candles)
    if len(h) < 5:
        return NONE
    for i in range(len(h) - 1, len(h) - 4, -1):
        if i - 2 < 0:
            break
        if lo[i] > h[i - 2]:  # bullish gap (imbalance up)
            return {"side": "BUY", "reason": "Bullish fair value gap", "strength": 0.6}
        if h[i] < lo[i - 2]:  # bearish gap
            return {"side": "SELL", "reason": "Bearish fair value gap", "strength": 0.6}
    return NONE


def _ict(candles):
    """FVG in the direction of the higher-timeframe (EMA50) bias."""
    _, _, _, c = _series(candles)
    if len(c) < 55:
        return NONE
    bias = "BUY" if c[-1] > ema_series(c, 50)[-1] else "SELL"
    fvg = _fvg(candles)
    if fvg["side"] == bias:
        return {"side": bias, "reason": f"FVG aligned with {bias} bias", "strength": 0.72}
    return NONE


def _liquidity(candles):
    """Liquidity sweep: wick beyond recent extreme then close back inside."""
    _, h, lo, c = _series(candles)
    if len(c) < 12:
        return NONE
    prev_high = max(h[-11:-1])
    prev_low = min(lo[-11:-1])
    if h[-1] > prev_high and c[-1] < prev_high:
        return {"side": "SELL", "reason": "Swept buy-side liquidity, rejected", "strength": 0.7}
    if lo[-1] < prev_low and c[-1] > prev_low:
        return {"side": "BUY", "reason": "Swept sell-side liquidity, reclaimed", "strength": 0.7}
    return NONE


def _orderblock(candles):
    """Continuation from the last opposite candle before an impulse."""
    o, h, lo, c = _series(candles)
    if len(c) < 6:
        return NONE
    body = [abs(c[i] - o[i]) for i in range(len(c))]
    avg_body = sum(body[-10:]) / min(10, len(body))
    if body[-1] > 1.5 * avg_body:
        if c[-1] > o[-1]:
            return {"side": "BUY", "reason": "Bullish order block impulse", "strength": 0.62}
        if c[-1] < o[-1]:
            return {"side": "SELL", "reason": "Bearish order block impulse", "strength": 0.62}
    return NONE


def _supplydemand(candles):
    """Strong departure from a tight base."""
    o, h, lo, c = _series(candles)
    if len(c) < 8:
        return NONE
    base_range = max(h[-6:-1]) - min(lo[-6:-1])
    last_range = h[-1] - lo[-1]
    if last_range > 1.3 * (base_range / 5 + 1e-9):
        if c[-1] > o[-1]:
            return {"side": "BUY", "reason": "Rally from demand base", "strength": 0.6}
        if c[-1] < o[-1]:
            return {"side": "SELL", "reason": "Drop from supply base", "strength": 0.6}
    return NONE


def _wyckoff(candles):
    """Range breakout (Donchian) — markup / markdown."""
    _, h, lo, c = _series(candles)
    if len(c) < 22:
        return NONE
    hi = max(h[-21:-1])
    low = min(lo[-21:-1])
    if c[-1] > hi:
        return {"side": "BUY", "reason": "Breakout above accumulation range", "strength": 0.66}
    if c[-1] < low:
        return {"side": "SELL", "reason": "Breakdown below distribution range", "strength": 0.66}
    return NONE


_ANALYZERS = {
    "ema": _ema,
    "rsi": _rsi,
    "macd": _macd,
    "smc": _smc,
    "ict": _ict,
    "fvg": _fvg,
    "liquidity": _liquidity,
    "orderblock": _orderblock,
    "supplydemand": _supplydemand,
    "wyckoff": _wyckoff,
}


def analyze(key: str, candles) -> dict:
    fn = _ANALYZERS.get(key)
    if fn is None or not candles:
        return NONE
    try:
        return fn(candles)
    except Exception:  # noqa: BLE001
        return NONE
