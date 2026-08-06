"""
Technique brains — each strategy analyses REAL candles with its OWN faithful
logic and returns an entry signal. This is what makes the Learning AI meaningful:
every technique now trades the way its real-world practitioners actually trade it,
so the live scores measure genuinely distinct behaviour.

Design principle drawn from the research (SMC/ICT/Wyckoff/S&D education sources):
the professional entry for price-action techniques is on the **retest / return to
a zone**, NOT on the impulse/formation. Chasing the breakout is the classic
mistake — several of these analyzers used to do exactly that and have been fixed.

analyze(key, candles) -> {"side": "BUY"|"SELL"|None, "reason": str, "strength": 0..1}

Candles are objects with .open .high .low .close, oldest-first.
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
# shared primitives
# --------------------------------------------------------------------------- #
def _series(candles):
    o = [c.open for c in candles]
    h = [c.high for c in candles]
    lo = [c.low for c in candles]
    c = [c.close for c in candles]
    return o, h, lo, c


NONE = {"side": None, "reason": "no setup", "strength": 0.0}


def _atr(h, lo, c, period: int = 14) -> float:
    """Average True Range — used for all zone/penetration buffers."""
    trs = []
    for i in range(1, len(c)):
        trs.append(max(h[i] - lo[i], abs(h[i] - c[i - 1]), abs(lo[i] - c[i - 1])))
    if not trs:
        return 0.0
    return sum(trs[-period:]) / min(period, len(trs))


def _swing_highs(h, L: int = 3) -> List[int]:
    """Fractal swing highs: h[i] is the strict max over [i-L, i+L]."""
    out = []
    for i in range(L, len(h) - L):
        if all(h[i] >= h[i - k] and h[i] >= h[i + k] for k in range(1, L + 1)):
            out.append(i)
    return out


def _swing_lows(lo, L: int = 3) -> List[int]:
    out = []
    for i in range(L, len(lo) - L):
        if all(lo[i] <= lo[i - k] and lo[i] <= lo[i + k] for k in range(1, L + 1)):
            out.append(i)
    return out


def _find_fvgs(h, lo):
    """
    3-candle Fair Value Gaps. Returns list of (third_idx, side, bottom, top).
    Bullish gap: low[i] > high[i-2] (imbalance up). Bearish: high[i] < low[i-2].
    """
    out = []
    for i in range(2, len(h)):
        if lo[i] > h[i - 2]:
            out.append((i, "BUY", h[i - 2], lo[i]))
        elif h[i] < lo[i - 2]:
            out.append((i, "SELL", h[i], lo[i - 2]))
    return out


def market_context(candles) -> dict:
    """
    Snapshot of the market state AT decision time — the 'fingerprint' the learning
    brain needs so it can later learn which setups work in which context.

    This is how the AI "sees" the chart without a picture: it MEASURES the shape as
    numbers. The richer this fingerprint, the more precisely the brain can remember
    'a chart that looked like THIS won/lost'. Fields:
        trend  : up / down / range            (EMA20 vs EMA50)
        vol    : L / M / H  volatility bucket (ATR / price)
        mom    : os / neu / ob  momentum      (RSI-14: oversold/neutral/overbought)
        loc    : low / mid / high  location   (price inside the recent swing range)
        session: asia / london / london_ny / ny / off
    Pure price-action; no external data (news is handled by the trade gate, not here).
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 30:
        return {}
    price = c[-1]
    e20 = ema_series(c, 20)[-1]
    e50 = ema_series(c, 50)[-1] if n >= 50 else e20
    if e20 > e50 * 1.0005:
        trend = "up"
    elif e20 < e50 * 0.9995:
        trend = "down"
    else:
        trend = "range"

    atr = _atr(h, lo, c)
    vol_pct = round(atr / price * 100, 3) if price else 0.0
    # volatility regime bucket — is the market dead-quiet, normal, or whippy?
    if vol_pct < 0.08:
        vol = "L"
    elif vol_pct < 0.20:
        vol = "M"
    else:
        vol = "H"

    # momentum regime via RSI — is price stretched (mean-revert risk) or neutral?
    rsi_last = rsi_series(c, 14)[-1]
    if rsi_last < 40:
        mom = "os"
    elif rsi_last > 60:
        mom = "ob"
    else:
        mom = "neu"

    # location inside the recent swing range — near support(low) / middle / near resistance(high)
    win = c[-60:] if n >= 60 else c
    hi_r = max(h[-len(win):])
    lo_r = min(lo[-len(win):])
    if hi_r > lo_r:
        pos = (price - lo_r) / (hi_r - lo_r)
        loc = "low" if pos <= 0.33 else ("high" if pos >= 0.67 else "mid")
    else:
        loc = "mid"

    ts = getattr(candles[-1], "time", 0) or 0
    hour = int((ts / 1000) // 3600 % 24) if ts else 0
    if hour < 7:
        session = "asia"
    elif hour < 12:
        session = "london"
    elif hour < 16:
        session = "london_ny"
    elif hour < 21:
        session = "ny"
    else:
        session = "off"

    return {
        "trend": trend, "volatility_pct": vol_pct, "vol": vol,
        "mom": mom, "loc": loc, "session": session, "hour": hour,
    }


def _htf_bias(c: List[float]) -> int:
    """Higher-timeframe bias from the EMA50 slope + price side: +1 up, -1 down, 0 flat.
    Used to grade a setup's confluence — pros favour setups aligned with the trend.
    """
    e50 = ema_series(c, 50)
    if len(e50) < 12:
        return 0
    if e50[-1] > e50[-11] and c[-1] > e50[-1]:
        return 1
    if e50[-1] < e50[-11] and c[-1] < e50[-1]:
        return -1
    return 0


def _grade(base: float, side: str, c: List[float]) -> float:
    """Confluence grading: boost a signal's strength when it aligns with the
    higher-timeframe trend, trim it when it fights the trend. This is the extra
    'trading knowledge' layer — every technique now scores its OWN setup quality
    the way an experienced trader weighs confluence, instead of a flat number.
    """
    bias = _htf_bias(c)
    want = 1 if side == "BUY" else -1
    if bias == want:
        return round(min(0.95, base + 0.08), 3)   # with the trend — higher conviction
    if bias == -want:
        return round(max(0.35, base - 0.10), 3)   # against the trend — lower conviction
    return round(base, 3)


# --------------------------------------------------------------------------- #
# INDICATOR techniques
# --------------------------------------------------------------------------- #
def _ema(candles):
    """
    EMA Confluence — trade only when EMA20/50/200 are stacked in trend order and
    the 200 is sloping, then enter on a PULLBACK that tags the fast EMA and gets
    rejected. (Not a bare 10/30 crossover.)
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 210:
        return NONE
    e20, e50, e200 = ema_series(c, 20), ema_series(c, 50), ema_series(c, 200)
    i = n - 1
    body = abs(c[i] - o[i]) or 1e-9
    rising = e200[i] > e200[i - 10]
    falling = e200[i] < e200[i - 10]

    if e20[i] > e50[i] > e200[i] and rising and c[i] > e200[i]:
        pulled = any(lo[j] <= e20[j] for j in range(max(0, i - 6), i + 1))
        lower_wick = min(o[i], c[i]) - lo[i]
        if pulled and c[i] > o[i] and c[i] > e20[i] and lower_wick >= 0.4 * body:
            return {"side": "BUY", "reason": "EMA20>50>200 stacked; pullback-to-EMA rejection", "strength": 0.70}

    if e20[i] < e50[i] < e200[i] and falling and c[i] < e200[i]:
        pulled = any(h[j] >= e20[j] for j in range(max(0, i - 6), i + 1))
        upper_wick = h[i] - max(o[i], c[i])
        if pulled and c[i] < o[i] and c[i] < e20[i] and upper_wick >= 0.4 * body:
            return {"side": "SELL", "reason": "EMA20<50<200 stacked; pullback-to-EMA rejection", "strength": 0.70}
    return NONE


def _rsi(candles):
    """
    RSI Divergence — the REAL thing (not an oversold bounce):
      bullish = price lower-low while RSI higher-low; bearish = price higher-high
      while RSI lower-high, compared at two confirmed price swing pivots.
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 40:
        return NONE
    r = rsi_series(c, 14)
    L = 3
    lows = _swing_lows(lo, L)
    highs = _swing_highs(h, L)
    i = n - 1

    if len(lows) >= 2:
        p1, p2 = lows[-2], lows[-1]
        if 5 <= (p2 - p1) <= 60 and lo[p2] < lo[p1] and r[p2] > r[p1] and r[p1] < 35:
            if (i - p2) <= 4 and c[i] > o[i]:
                return {"side": "BUY",
                        "reason": f"Bullish RSI divergence (price LL, RSI {r[p1]:.0f}->{r[p2]:.0f})",
                        "strength": 0.72}

    if len(highs) >= 2:
        p1, p2 = highs[-2], highs[-1]
        if 5 <= (p2 - p1) <= 60 and h[p2] > h[p1] and r[p2] < r[p1] and r[p1] > 65:
            if (i - p2) <= 4 and c[i] < o[i]:
                return {"side": "SELL",
                        "reason": f"Bearish RSI divergence (price HH, RSI {r[p1]:.0f}->{r[p2]:.0f})",
                        "strength": 0.72}
    return NONE


def _macd(candles):
    """
    MACD Momentum — signal cross CONFIRMED by the zero-line regime and an
    expanding histogram (accelerating momentum), not a bare crossover.
    """
    o, h, lo, c = _series(candles)
    if len(c) < 40:
        return NONE
    macd, sig = macd_series(c)
    hist = [macd[i] - sig[i] for i in range(len(macd))]
    i = len(c) - 1
    if macd[i] > sig[i] and macd[i - 1] <= sig[i - 1] and macd[i] > 0 and hist[i] > hist[i - 1]:
        return {"side": "BUY", "reason": "MACD cross up in bullish regime; histogram expanding", "strength": 0.66}
    if macd[i] < sig[i] and macd[i - 1] >= sig[i - 1] and macd[i] < 0 and hist[i] < hist[i - 1]:
        return {"side": "SELL", "reason": "MACD cross down in bearish regime; histogram expanding", "strength": 0.66}
    return NONE


# --------------------------------------------------------------------------- #
# SMC / ICT family
# --------------------------------------------------------------------------- #
def _smc(candles):
    """
    Smart Money Concepts — trade WITH market structure (higher-highs/higher-lows
    or the reverse) but ONLY from the correct side of the dealing range:
    buys in discount (below equilibrium), sells in premium (above). No chasing.
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 40:
        return NONE
    sh, sl = _swing_highs(h), _swing_lows(lo)
    if len(sh) < 2 or len(sl) < 2:
        return NONE
    range_hi, range_lo = h[sh[-1]], lo[sl[-1]]
    if range_hi <= range_lo:
        return NONE
    eq = 0.5 * (range_hi + range_lo)
    price = c[-1]
    bull = h[sh[-1]] > h[sh[-2]] and lo[sl[-1]] > lo[sl[-2]]
    bear = h[sh[-1]] < h[sh[-2]] and lo[sl[-1]] < lo[sl[-2]]

    if bull and price < eq and c[-1] > o[-1]:
        return {"side": "BUY", "reason": "Bullish structure (HH/HL); price in discount", "strength": 0.70}
    if bear and price > eq and c[-1] < o[-1]:
        return {"side": "SELL", "reason": "Bearish structure (LH/LL); price in premium", "strength": 0.70}
    return NONE


def _ict(candles):
    """
    ICT model — liquidity sweep -> displacement leaves a Fair Value Gap ->
    price RETESTS the FVG, in line with the HTF (EMA50) bias. A full sequence,
    not a single indicator.
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 60:
        return NONE
    sh, sl = _swing_highs(h), _swing_lows(lo)
    e50 = ema_series(c, 50)
    price = c[-1]
    fvgs = [g for g in _find_fvgs(h, lo) if g[0] >= n - 15]

    if len(sl) >= 2:
        swept_low = lo[sl[-2]]
        swept = any(lo[j] < swept_low and c[j] > swept_low for j in range(sl[-2] + 1, n))
        bull = [g for g in fvgs if g[1] == "BUY"]
        if swept and bull and price > e50[-1]:
            _, _, bottom, top = bull[-1]
            if bottom <= price <= top and c[-1] > o[-1]:
                return {"side": "BUY", "reason": "ICT: sell-side sweep + bullish FVG retest, HTF bias up", "strength": 0.75}

    if len(sh) >= 2:
        swept_high = h[sh[-2]]
        swept = any(h[j] > swept_high and c[j] < swept_high for j in range(sh[-2] + 1, n))
        bear = [g for g in fvgs if g[1] == "SELL"]
        if swept and bear and price < e50[-1]:
            _, _, bottom, top = bear[-1]
            if bottom <= price <= top and c[-1] < o[-1]:
                return {"side": "SELL", "reason": "ICT: buy-side sweep + bearish FVG retest, HTF bias down", "strength": 0.75}
    return NONE


def _fvg(candles):
    """
    Fair Value Gap — detect the 3-candle imbalance, then signal only when price
    has RETURNED into the gap to fill it (mitigation), not on formation.
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 8:
        return NONE
    price = c[-1]
    # gap's 3rd candle must be a few bars back so a genuine return can occur
    for i in range(n - 3, max(n - 20, 2) - 1, -1):
        if lo[i] > h[i - 2]:  # bullish gap
            bottom, top = h[i - 2], lo[i]
            if bottom <= price <= top and c[-1] >= o[-1]:
                return {"side": "BUY", "reason": "Bullish FVG retest (price filling the gap)", "strength": 0.68}
        elif h[i] < lo[i - 2]:  # bearish gap
            bottom, top = h[i], lo[i - 2]
            if bottom <= price <= top and c[-1] <= o[-1]:
                return {"side": "SELL", "reason": "Bearish FVG retest (price filling the gap)", "strength": 0.68}
    return NONE


def _liquidity(candles):
    """
    Liquidity Sweep — wick beyond a recent swing extreme (stop hunt) that CLOSES
    back inside, with a reaction candle in the reversal direction.
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 20:
        return NONE
    prev_high = max(h[-16:-1])
    prev_low = min(lo[-16:-1])
    if h[-1] > prev_high and c[-1] < prev_high and c[-1] < o[-1]:
        return {"side": "SELL", "reason": "Swept buy-side liquidity above highs, rejected back inside", "strength": 0.72}
    if lo[-1] < prev_low and c[-1] > prev_low and c[-1] > o[-1]:
        return {"side": "BUY", "reason": "Swept sell-side liquidity below lows, reclaimed", "strength": 0.72}
    return NONE


def _orderblock(candles):
    """
    Order Block (mitigation entry):
      1. find a strong impulse candle a few bars back (displacement),
      2. the order block is the last OPPOSITE-colour candle before that impulse,
      3. only signal when price has RETURNED into that order-block zone (retest)
         and is reacting in the impulse direction.
    The opposite of chasing the impulse: we wait for the pullback to the zone the
    impulse left behind.
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 20:
        return NONE
    body = [abs(c[i] - o[i]) for i in range(n)]
    avg_body = sum(body[-20:]) / 20
    if avg_body <= 0:
        return NONE
    price = c[-1]

    best = None  # (impulse_body, side)
    for i in range(n - 3, max(n - 13, 0), -1):
        if body[i] <= 1.8 * avg_body:
            continue
        if c[i] > o[i]:  # bullish impulse
            ob = next((j for j in range(i - 1, max(i - 6, -1), -1) if c[j] < o[j]), None)
            if ob is not None:
                zone_hi, zone_lo = max(o[ob], c[ob]), lo[ob]
                if zone_lo <= price <= zone_hi and c[-1] >= o[-1]:
                    if best is None or body[i] > best[0]:
                        best = (body[i], "BUY")
        elif c[i] < o[i]:  # bearish impulse
            ob = next((j for j in range(i - 1, max(i - 6, -1), -1) if c[j] > o[j]), None)
            if ob is not None:
                zone_lo, zone_hi = min(o[ob], c[ob]), h[ob]
                if zone_lo <= price <= zone_hi and c[-1] <= o[-1]:
                    if best is None or body[i] > best[0]:
                        best = (body[i], "SELL")

    if best:
        side = best[1]
        kind = "bullish" if side == "BUY" else "bearish"
        return {"side": side, "reason": f"Price mitigating a {kind} order block (retest of zone)", "strength": 0.74}
    return NONE


def _supplydemand(candles):
    """
    Supply & Demand — find a TIGHT base followed by a STRONG departure (the leg
    that leaves unfilled orders), then signal only when price RETURNS to the
    zone's proximal edge with a rejection. (Not an entry on the departure.)
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 25:
        return NONE
    atr = _atr(h, lo, c)
    if atr <= 0:
        return NONE
    body = [abs(c[i] - o[i]) for i in range(n)]
    price = c[-1]

    for dep in range(n - 3, max(n - 20, 4) - 1, -1):
        # departure must be a decisive, big-bodied candle
        if body[dep] < 1.8 * atr:
            continue
        base_idx = list(range(max(dep - 4, 0), dep))
        if not base_idx:
            continue
        base_hi = max(h[j] for j in base_idx)
        base_lo = min(lo[j] for j in base_idx)
        base_h = base_hi - base_lo
        if base_h <= 0 or base_h > 1.2 * atr:  # base must be tight
            continue

        if c[dep] > o[dep] and (c[dep] - o[dep]) >= 2 * base_h:      # rally from demand
            proximal, distal = base_hi, base_lo
            if distal <= price <= proximal and c[-1] > o[-1]:
                return {"side": "BUY", "reason": "Demand zone retest (tight base + strong rally, price returned)", "strength": 0.68}
        if c[dep] < o[dep] and (o[dep] - c[dep]) >= 2 * base_h:      # drop from supply
            proximal, distal = base_lo, base_hi
            if proximal <= price <= distal and c[-1] < o[-1]:
                return {"side": "SELL", "reason": "Supply zone retest (tight base + strong drop, price returned)", "strength": 0.68}
    return NONE


def _wyckoff(candles):
    """
    Wyckoff — the Spring / Upthrust liquidity trap, NOT a range breakout:
      Spring (long)  = wick sweeps below the trading-range low then CLOSES back
                       inside and reclaims it.
      Upthrust (short) = wick sweeps above the range high then fails back inside.
    Penetration is capped so a deep, accelerating break (a real breakout) is not
    mistaken for a spring.
    """
    o, h, lo, c = _series(candles)
    n = len(c)
    if n < 30:
        return NONE
    atr = _atr(h, lo, c)
    if atr <= 0:
        return NONE
    range_hi = max(h[j] for j in range(n - 25, n - 2))
    range_lo = min(lo[j] for j in range(n - 25, n - 2))
    i = n - 1

    if lo[i] < range_lo and c[i] > range_lo and (range_lo - lo[i]) <= 1.5 * atr and c[i] > o[i]:
        return {"side": "BUY", "reason": "Wyckoff spring: swept range low then reclaimed", "strength": 0.70}
    if h[i] > range_hi and c[i] < range_hi and (h[i] - range_hi) <= 1.5 * atr and c[i] < o[i]:
        return {"side": "SELL", "reason": "Wyckoff upthrust: swept range high then failed back inside", "strength": 0.70}
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
        sig = fn(candles)
    except Exception:  # noqa: BLE001
        return NONE
    # Confluence grading layer: keep the technique's own entry trigger EXACTLY as
    # is (no change to when it fires — safe for a live account), but grade the
    # signal's strength by higher-timeframe alignment so the brain and the
    # confidence display reflect real setup quality.
    if sig and sig.get("side"):
        try:
            _o, _h, _lo, c = _series(candles)
            sig = dict(sig)
            sig["strength"] = _grade(float(sig.get("strength") or 0.5), sig["side"], c)
        except Exception:  # noqa: BLE001
            pass
    return sig
