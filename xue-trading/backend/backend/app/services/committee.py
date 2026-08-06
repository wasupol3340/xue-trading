"""
Investment Committee — the institutional quality gate (Master Prompt).

This is NOT a technique. It sits ABOVE every technique: a technique proposes a
side (BUY/SELL); the committee then runs a 12-step institutional review, scores
13 categories out of 100, and returns BUY / SELL / NO TRADE. Capital preservation
first — when evidence is thin, conflicting, or a hard rule fails, it returns
NO TRADE. Fewer, higher-quality trades by design.

All deterministic price-action / data analysis (NO LLM) so it is fast, reproducible
and safe on a live account. Categories we have no data feed for (DXY, bond yields)
are marked data-unavailable and REDUCE confidence — never faked.

review(...) -> dict scorecard consumed by ai_engine.run_meeting.
"""
from __future__ import annotations

from app.core.config import settings
from app.services.market_data import get_candles
from app.services.techniques import (
    ema_series, rsi_series, macd_series, _atr, _swing_highs, _swing_lows, _find_fvgs,
)

# ---- tunables (safe defaults; override via settings/.env if present) ---- #
MIN_SCORE = float(getattr(settings, "COMMITTEE_MIN_SCORE", 65))   # below this -> NO TRADE
MIN_RR = float(getattr(settings, "COMMITTEE_MIN_RR", 1.5))        # reward:risk floor
NEWS_WINDOW_MIN = int(getattr(settings, "COMMITTEE_NEWS_MIN", 15))
ATR_MIN_PCT = 0.03      # ATR as % of price; below = too quiet to trade
SPREAD_MAX_ATR = 0.30   # spread must be < this fraction of ATR

WEIGHTS = {
    "structure": 0.12, "trend": 0.12, "liquidity": 0.09, "smart_money": 0.12,
    "volume": 0.06, "momentum": 0.08, "volatility": 0.06, "price_action": 0.10,
    "news": 0.06, "correlation": 0.04, "risk": 0.05, "execution": 0.02, "data": 0.08,
}


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _ser(candles):
    o = [c.open for c in candles]; h = [c.high for c in candles]
    lo = [c.low for c in candles]; c = [c.close for c in candles]
    v = [float(getattr(x, "volume", 0) or 0) for x in candles]
    return o, h, lo, c, v


def _trend_of(closes) -> str:
    if len(closes) < 50:
        return "range"
    e20 = ema_series(closes, 20)[-1]; e50 = ema_series(closes, 50)[-1]
    if e20 > e50 * 1.0006:
        return "up"
    if e20 < e50 * 0.9994:
        return "down"
    return "range"


def _want(side) -> str:
    return "up" if side == "BUY" else "down"


# --------------------------------------------------------------------------- #
# individual reviews  ->  (score 0..100, note, hard_fail_bool)
# --------------------------------------------------------------------------- #
def _regime(o, h, lo, c, side):
    if len(c) < 60:
        return 40, "ข้อมูลไม่พอระบุ regime", True
    e20, e50, e200 = ema_series(c, 20)[-1], ema_series(c, 50)[-1], ema_series(c, 200)[-1] if len(c) >= 200 else ema_series(c, 50)[-1]
    atr = _atr(h, lo, c); atrp = atr / c[-1] * 100 if c[-1] else 0
    want = _want(side)
    if e20 > e50 > e200 and c[-1] > e200:
        reg = "Strong Uptrend"
    elif e20 < e50 < e200 and c[-1] < e200:
        reg = "Strong Downtrend"
    elif abs(e20 - e50) / c[-1] < 0.0006:
        reg = "Sideway" if atrp < 0.18 else "Compression"
    else:
        reg = "Expansion" if atrp > 0.22 else "Transition"
    # score by alignment with side
    up = reg == "Strong Uptrend"; down = reg == "Strong Downtrend"
    if (want == "up" and up) or (want == "down" and down):
        return 88, f"Regime {reg} หนุนทาง {side}", False
    if reg in ("Sideway",):
        return 35, f"Regime {reg} ไม่มีกรอบเทรนด์ชัด", False  # weak, not hard
    if (want == "up" and down) or (want == "down" and up):
        return 18, f"Regime {reg} สวนทาง {side}", True  # hard conflict
    return 55, f"Regime {reg}", False


def _multitf(symbol, side):
    want = _want(side)
    tfs = {"D1": 140, "H4": 180, "H1": 240}
    trends = {}
    missing = 0
    for tf, n in tfs.items():
        try:
            cc = get_candles(symbol, tf, n)
            _, _, _, cl, _ = _ser(cc)
            trends[tf] = _trend_of(cl) if len(cl) >= 50 else "range"
            if len(cl) < 50:
                missing += 1
        except Exception:  # noqa: BLE001
            trends[tf] = "range"; missing += 1
    agree = sum(1 for t in trends.values() if t == want)
    conflict_big = trends.get("D1") and trends.get("D1") != want and trends.get("D1") != "range" \
        and trends.get("H4") and trends.get("H4") != want and trends.get("H4") != "range"
    note = f"D1={trends.get('D1')} H4={trends.get('H4')} H1={trends.get('H1')}"
    if conflict_big:
        return 20, f"TF ใหญ่ (D1+H4) สวนทาง {side} · {note}", True
    score = 30 + agree * 22  # 0->30, 3->96
    return min(96, score), f"TF หนุน {agree}/3 · {note}", False


def _liquidity(h, lo, c, side):
    if len(c) < 20:
        return 45, "ข้อมูล liquidity ไม่พอ", False
    prev_hi = max(h[-16:-2]); prev_lo = min(lo[-16:-2])
    # sell-side sweep then reclaim -> bullish; buy-side sweep then reject -> bearish
    swept_low = any(lo[i] < prev_lo and c[i] > prev_lo for i in range(len(c) - 4, len(c)))
    swept_high = any(h[i] > prev_hi and c[i] < prev_hi for i in range(len(c) - 4, len(c)))
    if side == "BUY" and swept_low:
        return 85, "กวาด sell-side liquidity แล้ว reclaim (หนุนซื้อ)", False
    if side == "SELL" and swept_high:
        return 85, "กวาด buy-side liquidity แล้ว reject (หนุนขาย)", False
    return 45, "ยังไม่เห็นการกวาด liquidity ชัดเจน", False


def _smart_money(o, h, lo, c, side):
    if len(c) < 40:
        return 45, "ข้อมูล SMC ไม่พอ", False
    sh, sl = _swing_highs(h), _swing_lows(lo)
    pts = 0; notes = []
    # BOS
    if side == "BUY" and sh and c[-1] > h[sh[-1]]:
        pts += 1; notes.append("BOS ขึ้น")
    if side == "SELL" and sl and c[-1] < lo[sl[-1]]:
        pts += 1; notes.append("BOS ลง")
    # premium / discount
    if sh and sl:
        hi, low = h[sh[-1]], lo[sl[-1]]
        if hi > low:
            eq = 0.5 * (hi + low)
            if side == "BUY" and c[-1] < eq:
                pts += 1; notes.append("อยู่ discount")
            if side == "SELL" and c[-1] > eq:
                pts += 1; notes.append("อยู่ premium")
    # FVG in direction, near price
    fvgs = [g for g in _find_fvgs(h, lo) if g[0] >= len(c) - 15]
    want = "BUY" if side == "BUY" else "SELL"
    if any(g[1] == want for g in fvgs):
        pts += 1; notes.append("มี FVG หนุน")
    score = 30 + pts * 18
    hard = pts == 0  # no SMC confirmation at all
    return min(96, score), ("SMC: " + ", ".join(notes) if notes else "ไม่มีการยืนยัน SMC"), hard


def _vol_mom(o, h, lo, c, v, side):
    if len(c) < 30:
        return 45, "ข้อมูล momentum ไม่พอ", False, 45
    # volume rising?
    avg = sum(v[-20:]) / 20 if any(v[-20:]) else 0
    recent = sum(v[-3:]) / 3 if any(v[-3:]) else 0
    vol_ok = avg > 0 and recent >= avg * 0.9
    vscore = 80 if (avg > 0 and recent >= avg) else (55 if vol_ok else 30)
    # momentum
    r = rsi_series(c, 14)[-1]
    macd, sig = macd_series(c); hist = macd[-1] - sig[-1]
    mom_ok = (side == "BUY" and hist > 0 and r > 48) or (side == "SELL" and hist < 0 and r < 52)
    mscore = 82 if mom_ok else 40
    note = f"Vol {'ขึ้น' if recent>=avg else 'อ่อน'} · RSI {r:.0f} · MACD {'บวก' if hist>0 else 'ลบ'}"
    return mscore, note, False, vscore


def _volatility(h, lo, c):
    if len(c) < 20:
        return 40, "ATR ไม่พอ", True
    atr = _atr(h, lo, c); atrp = atr / c[-1] * 100 if c[-1] else 0
    if atrp < ATR_MIN_PCT:
        return 25, f"ATR ต่ำเกิน ({atrp:.3f}%) — ตลาดเงียบ", True
    if atrp > 0.6:
        return 60, f"ATR สูงมาก ({atrp:.3f}%) — ผันผวนแรง", False
    return 85, f"ATR เหมาะสม ({atrp:.3f}%)", False


def _price_action(o, h, lo, c, side):
    """ต้องมีสัญญาณยืนยัน ≥1 รูปแบบ (engulfing/pin bar/inside/rejection) ในทาง side."""
    if len(c) < 3:
        return 30, "ข้อมูลไม่พอ", True
    i = len(c) - 1
    body = abs(c[i] - o[i]) or 1e-9
    up_wick = h[i] - max(o[i], c[i]); dn_wick = min(o[i], c[i]) - lo[i]
    rng = (h[i] - lo[i]) or 1e-9
    patt = []
    bull = side == "BUY"
    # engulfing
    if bull and c[i] > o[i] and c[i - 1] < o[i - 1] and c[i] >= o[i - 1] and o[i] <= c[i - 1]:
        patt.append("Bullish Engulfing")
    if not bull and c[i] < o[i] and c[i - 1] > o[i - 1] and c[i] <= o[i - 1] and o[i] >= c[i - 1]:
        patt.append("Bearish Engulfing")
    # pin bar / rejection
    if bull and dn_wick >= 0.55 * rng and c[i] >= o[i]:
        patt.append("Bullish Pin/Rejection")
    if not bull and up_wick >= 0.55 * rng and c[i] <= o[i]:
        patt.append("Bearish Pin/Rejection")
    # inside bar (continuation)
    if h[i] <= h[i - 1] and lo[i] >= lo[i - 1]:
        patt.append("Inside Bar")
    if not patt:
        return 25, "ไม่มีสัญญาณ price action ยืนยัน", True   # hard: prompt requires ≥1
    return 82, "Price action: " + ", ".join(patt), False


def _news():
    try:
        from app.services.news_data import high_impact_now
        gated, ev = high_impact_now(NEWS_WINDOW_MIN)
        if gated:
            return 0, f"ข่าวแรงใกล้: {ev}", True
        return 90, "ไม่มีข่าวแรงในกรอบเวลา", False
    except Exception:  # noqa: BLE001
        return 60, "อ่านปฏิทินข่าวไม่ได้ (fail-open)", False


def _risk(balance, equity, sl_points, tp_points):
    rr = (tp_points / sl_points) if sl_points else 0
    dd = max(0.0, (balance - equity) / balance * 100) if balance else 0.0
    hard = rr < MIN_RR or dd >= settings.DAILY_LOSS_LIMIT
    score = 85 if rr >= 2 else (65 if rr >= MIN_RR else 25)
    if dd >= settings.DAILY_LOSS_LIMIT * 0.7:
        score = min(score, 40)
    return score, f"RR {rr:.2f} · Drawdown {dd:.1f}%", hard, rr, dd


def _execution(h, lo, c, spread):
    if len(c) < 15 or spread <= 0:
        return 65, "ไม่มีข้อมูล spread", False
    atr = _atr(h, lo, c)
    if atr <= 0:
        return 65, "ATR=0", False
    ratio = spread / atr
    if ratio > SPREAD_MAX_ATR:
        return 25, f"Spread กว้างเกิน ({ratio:.2f}×ATR)", True
    return 85, f"Spread โอเค ({ratio:.2f}×ATR)", False


# --------------------------------------------------------------------------- #
# orchestrator
# --------------------------------------------------------------------------- #
def review(*, symbol, side, technique_name, m15, account_balance, account_equity,
           spread, sl_points, tp_points) -> dict:
    """Full 12-step committee review of ONE proposed side. Returns a scorecard."""
    o, h, lo, c, v = _ser(m15)
    price = c[-1] if c else 0.0

    scores = {}; reasons = []; risks = []; uncertainty = []; hard_fail = []

    def add(cat, res):
        score, note, hard = res[0], res[1], res[2]
        scores[cat] = int(round(score))
        (reasons if score >= 60 else risks).append(note)
        if hard:
            hard_fail.append(note)

    # 1 regime / structure
    add("structure", _regime(o, h, lo, c, side))
    # 2 multi-timeframe trend
    add("trend", _multitf(symbol, side))
    # 3 liquidity
    add("liquidity", _liquidity(h, lo, c, side))
    # 4 smart money
    add("smart_money", _smart_money(o, h, lo, c, side))
    # 5 volume + momentum
    ms, mnote, mhard, vscore = _vol_mom(o, h, lo, c, v, side)
    scores["momentum"] = int(round(ms)); scores["volume"] = int(round(vscore))
    (reasons if ms >= 60 else risks).append(mnote)
    # 6/volatility (ATR)
    add("volatility", _volatility(h, lo, c))
    # 7 price action
    add("price_action", _price_action(o, h, lo, c, side))
    # 8 news
    add("news", _news())
    # 9 correlation — NO DATA FEED (DXY / yields). honest: neutral + reduce confidence
    scores["correlation"] = 50
    uncertainty.append("ไม่มีฟีด DXY/Bond Yields — หมวด Correlation เป็นกลาง (หักความมั่นใจ)")
    # 10 risk / RR
    rs, rnote, rhard, rr, dd = _risk(account_balance, account_equity, sl_points, tp_points)
    scores["risk"] = int(round(rs)); (reasons if rs >= 60 else risks).append(rnote)
    if rhard:
        hard_fail.append(rnote)
    # 11 execution / spread
    add("execution", _execution(h, lo, c, spread))
    # 12 data quality
    dq = 90 if len(c) >= 200 else (65 if len(c) >= 120 else 40)
    scores["data"] = dq
    if dq < 60:
        risks.append("ข้อมูลแท่งเทียนไม่ครบพอ")
        hard_fail.append("ข้อมูลไม่ครบ")

    # ---- Red Team (step 10 of prompt): count critical weaknesses ----
    red_flags = [n for n in risks if n]  # every risk note is a red-team concern
    critical = len(hard_fail)

    # ---- composite score (adaptive weights — learns which categories predict wins) ----
    try:
        from app.services.learning import learning
        weights = learning.committee_weights(WEIGHTS)
    except Exception:  # noqa: BLE001
        weights = WEIGHTS
    total = sum(scores.get(k, 50) * w for k, w in weights.items())
    total = round(total, 1)

    # confidence: composite minus uncertainty penalty
    confidence = int(max(1, min(99, round(total - 4 * len(uncertainty)))))

    # ---- verdict ----
    reason_veto = None
    if hard_fail:
        reason_veto = "เงื่อนไขห้ามเทรด: " + "; ".join(dict.fromkeys(hard_fail))
    elif total < MIN_SCORE:
        reason_veto = f"คะแนนรวม {total} < เกณฑ์ {MIN_SCORE}"
    recommendation = "NO TRADE" if reason_veto else side

    # entry / sl / tp
    entry = round(price, 2)
    if side == "BUY":
        sl = round(entry - sl_points, 2); tp = round(entry + tp_points, 2)
    else:
        sl = round(entry + sl_points, 2); tp = round(entry - tp_points, 2)

    invalidation = (f"หลุด SL {sl} หรือโครงสร้าง/เทรนด์เปลี่ยนสวนทาง {side}")
    summary = (reason_veto if reason_veto
               else f"ผ่านเกณฑ์กองทุน — {side} ด้วยคะแนน {total}/100 (RR {rr:.2f})")

    return {
        "recommendation": recommendation,
        "regime": scores.get("structure"),
        "technique": technique_name,
        "entry": entry, "sl": sl, "tp": tp, "rr": round(rr, 2),
        "scores": scores, "total": total, "confidence": confidence,
        "reasons": reasons[:6], "risks": risks[:6],
        "invalidation": invalidation, "uncertainty": uncertainty,
        "red_flags": critical, "summary": summary,
    }
