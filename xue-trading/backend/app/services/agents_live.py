"""
Agent LIVE dashboards — what each AI department is SEEING/DOING right now.

Unlike agents_brain.py (historical KPI/accuracy), this is the real-time operational
read: current trend, per-technique scores, best setup, upcoming news + countdown,
recommended lot, drawdown, etc. Every field is computed from live data — no
"Analyzing..." placeholders.

`agents_live(symbol)` -> list[dict], each:
    {id, name, role, status, metrics: [{label, value, tone}], highlight: {label,value,tone}}
tone ∈ {"green","red","amber","cyan","muted"} — a hint for the UI only.

Everything is best-effort and fail-safe: a broken data source degrades that ONE
field to "—" rather than breaking the page.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.core.config import settings
from app.services.learning import learning, _CTX_MIN, _CMT_MIN
from app.services.market_data import get_candles
from app.services.techniques import analyze, market_context
from app.services.mt5_client import client
from app.services.risk import RiskManager

_TREND = {"up": ("Bullish", "green"), "down": ("Bearish", "red"), "range": ("Range", "amber")}
# categories the user wants surfaced explicitly + their technique key
_HERO_TECHS = [("smc", "SMC"), ("ict", "ICT"), ("liquidity", "Liquidity"),
               ("fvg", "FVG"), ("orderblock", "Order Block")]


def _pct(x: float) -> str:
    return f"{round(x)}%"


def _snap() -> dict:
    try:
        from app.services.autotrader import autotrader
        return autotrader.snapshot()
    except Exception:  # noqa: BLE001
        return {}


def agents_live(symbol: str | None = None) -> list[dict]:
    symbol = symbol or settings.SYMBOL
    snap = _snap()

    # ---- shared live market read ---- #
    ctx: dict = {}
    tech_scores: dict = {}     # key -> (strength%, contextual_score, side)
    best = None                # (key, name, strength%, side)
    try:
        candles = get_candles(symbol, "M15", 260)
        ctx = market_context(candles) or {}
        for key, _strat in learning.strategies.items():
            try:
                s = analyze(key, candles)
            except Exception:  # noqa: BLE001
                s = {}
            side = s.get("side")
            strength = round(float(s.get("strength") or 0.0) * 100)
            cscore = round(learning.contextual_score(key, ctx))
            tech_scores[key] = (strength, cscore, side)
            if side and (best is None or cscore > best[2]):
                best = (key, learning.name_of(key), cscore, side, strength)
    except Exception:  # noqa: BLE001
        pass

    trend_txt, trend_tone = _TREND.get(ctx.get("trend", ""), ("—", "muted"))

    # ---- account / risk read ---- #
    bal = eq = 0.0
    price = 0.0
    try:
        acct = client.account()
        bal = float(getattr(acct, "balance", 0.0) or 0.0)
        eq = float(getattr(acct, "equity", 0.0) or 0.0)
        bid, ask = client.tick(symbol)
        price = float(ask or bid or 0.0)
    except Exception:  # noqa: BLE001
        pass
    dd_pct = max(0.0, (bal - eq) / bal * 100) if bal else 0.0
    rec_lot = None
    if bal and price:
        try:
            sl = price - settings.SL_POINTS
            rec_lot = RiskManager().calc_lot(bal, price, sl)
        except Exception:  # noqa: BLE001
            rec_lot = None
    risk_today = snap.get("realized_pnl_today", 0.0)
    today_pct = (risk_today / bal * 100) if bal else 0.0
    if dd_pct >= 3 or today_pct <= -settings.DAILY_LOSS_LIMIT * 0.6:
        risk_level, risk_tone = "สูง", "red"
    elif dd_pct >= 1.5:
        risk_level, risk_tone = "กลาง", "amber"
    else:
        risk_level, risk_tone = "ต่ำ", "green"

    # ---- news read ---- #
    high_count = 0
    next_txt, countdown, news_score, news_tone, gated = "—", "—", None, "muted", False
    try:
        from app.services import news_data
        rep = news_data.report()
        high_count = rep.get("high_count", 0)
        gated = rep.get("gated", False)
        now = datetime.now(timezone.utc)
        ups = []
        for e in news_data.events(only_relevant=True, min_impact="High"):
            dt = news_data._parse_dt(e.get("date", ""))
            if dt and dt >= now:
                ups.append((dt, e))
        ups.sort(key=lambda x: x[0])
        mins_to = None
        if ups:
            dt, e = ups[0]
            next_txt = e.get("title", "—")
            mins_to = int((dt - now).total_seconds() // 60)
            h, m = divmod(max(0, mins_to), 60)
            countdown = f"{h}h {m}m" if h else f"{m}m"
        if gated:
            news_score, news_tone = 15, "red"
        elif mins_to is not None and mins_to < 60:
            news_score, news_tone = 45, "amber"
        elif mins_to is not None and mins_to < 180:
            news_score, news_tone = 65, "amber"
        else:
            news_score, news_tone = 85, "green"
    except Exception:  # noqa: BLE001
        pass

    ex = learning.agent_stats("execution")
    profiles: list[dict] = []

    # 1) Research — structure read + technique scores + best setup
    research_metrics = [{"label": "เทรนด์", "value": trend_txt, "tone": trend_tone}]
    for key, label in _HERO_TECHS:
        if key in tech_scores:
            sc = tech_scores[key][1]
            research_metrics.append({"label": label, "value": _pct(sc),
                                     "tone": "green" if sc >= 65 else ("amber" if sc >= 50 else "muted")})
    research_metrics.append({"label": "Best Setup", "value": (best[1] if best else "ยังไม่มีสัญญาณ"),
                             "tone": "cyan" if best else "muted"})
    profiles.append({
        "id": "research", "name": "Research AI", "role": "Research",
        "status": ("พบสัญญาณ: " + best[1]) if best else "กำลังอ่านโครงสร้าง",
        "metrics": research_metrics,
        "highlight": {"label": "Confidence", "value": (_pct(best[2]) if best else "—"),
                      "tone": ("green" if best and best[2] >= 65 else "amber" if best else "muted")},
    })

    # 2) News / Macro — economic calendar
    profiles.append({
        "id": "macro", "name": "News AI", "role": "Macro",
        "status": ("เลี่ยงข่าว: ใกล้ข่าวแรง" if gated else "สแกนปฏิทินข่าว"),
        "metrics": [
            {"label": "ข่าวแรงสัปดาห์นี้", "value": str(high_count), "tone": "amber" if high_count else "muted"},
            {"label": "ข่าวถัดไป", "value": next_txt, "tone": "cyan"},
            {"label": "อีก", "value": countdown, "tone": "muted"},
            {"label": "USD Bias", "value": "—", "tone": "muted"},  # ยังไม่มีโมเดล USD bias (ซื่อสัตย์)
        ],
        "highlight": {"label": "News Score", "value": (str(news_score) if news_score is not None else "—"), "tone": news_tone},
    })

    # 3) Risk — sizing + limits
    profiles.append({
        "id": "risk", "name": "Risk AI", "role": "Risk", "status": f"คุมความเสี่ยง · ระดับ {risk_level}",
        "metrics": [
            {"label": "ความเสี่ยง/ไม้", "value": f"{settings.RISK_PER_TRADE}%", "tone": "cyan"},
            {"label": "Drawdown วันนี้", "value": f"{round(dd_pct,1)}%", "tone": ("red" if dd_pct >= 3 else "muted")},
            {"label": "Lot แนะนำ", "value": (str(rec_lot) if rec_lot is not None else "—"), "tone": "green"},
            {"label": "เพดานขาดทุน/วัน", "value": f"{settings.DAILY_LOSS_LIMIT}%", "tone": "muted"},
        ],
        "highlight": {"label": "ระดับความเสี่ยง", "value": risk_level, "tone": risk_tone},
    })

    # 4) CEO — oversight
    net = round(sum(x.gross_profit - x.gross_loss for x in learning.strategies.values()), 2)
    pf_gl = sum(x.gross_loss for x in learning.strategies.values())
    pf = round(sum(x.gross_profit for x in learning.strategies.values()) / pf_gl, 2) if pf_gl > 0 else 0.0
    profiles.append({
        "id": "ceo", "name": "CEO AI", "role": "CEO", "status": "กำกับภาพรวมบริษัท",
        "metrics": [
            {"label": "กำไรสะสม", "value": f"{net}", "tone": ("green" if net >= 0 else "red")},
            {"label": "Profit Factor", "value": f"{pf}", "tone": ("green" if pf >= 1 else "red")},
            {"label": "เทรนด์ตลาด", "value": trend_txt, "tone": trend_tone},
            {"label": "วันนี้", "value": f"{round(risk_today,2)}", "tone": ("green" if risk_today >= 0 else "red")},
        ],
        "highlight": {"label": "สถานะ", "value": ("ระวัง" if net < 0 else "ปกติ"), "tone": ("amber" if net < 0 else "green")},
    })

    # 5) CIO — the committee's live call
    sc = snap.get("scorecard") or {}
    rec = (sc.get("recommendation") or "—")
    rec_map = {"BUY": ("ซื้อ", "green"), "SELL": ("ขาย", "red"), "NO TRADE": ("ไม่เทรด", "muted")}
    rec_txt, rec_tone = rec_map.get(rec, ("—", "muted"))
    profiles.append({
        "id": "cio", "name": "CIO AI", "role": "CIO", "status": "คณะกรรมการ 13 หมวด",
        "metrics": [
            {"label": "มติล่าสุด", "value": rec_txt, "tone": rec_tone},
            {"label": "คะแนนรวม", "value": (str(sc.get("total")) if sc.get("total") is not None else "—"), "tone": "cyan"},
            {"label": "เกณฑ์ผ่าน", "value": str(settings.COMMITTEE_MIN_SCORE), "tone": "muted"},
            {"label": "ไม้ที่กรองผ่าน", "value": str(learning.cmt_n), "tone": "muted"},
        ],
        "highlight": {"label": "ปรับน้ำหนัก", "value": ("ทำงาน" if learning.cmt_n >= _CMT_MIN else f"รอ {max(0,_CMT_MIN-learning.cmt_n)} ไม้"),
                      "tone": ("green" if learning.cmt_n >= _CMT_MIN else "muted")},
    })

    # 6) Execution — order routing
    fill_rate = ex["accuracy"]
    profiles.append({
        "id": "execution", "name": "Execution AI", "role": "Execution", "status": "พร้อมยิงคำสั่ง",
        "metrics": [
            {"label": "ไม้เปิดอยู่", "value": str(snap.get("open_trades", 0)), "tone": "cyan"},
            {"label": "เทรดวันนี้", "value": str(snap.get("trades_today", 0)), "tone": "muted"},
            {"label": "ยิงสำเร็จ", "value": (f"{fill_rate}%" if fill_rate is not None else "—"),
             "tone": ("green" if (fill_rate or 0) >= 90 else "amber" if fill_rate is not None else "muted")},
            {"label": "Slippage เฉลี่ย", "value": (str(ex["avg_value"]) if ex["avg_value"] is not None else "—"), "tone": "muted"},
        ],
        "highlight": {"label": "MT5", "value": ("เชื่อมต่อ" if snap.get("mt5", {}).get("connected") else "หลุด"),
                      "tone": ("green" if snap.get("mt5", {}).get("connected") else "red")},
    })

    # 7) Learning — meta-learner
    filled = sum(1 for v in learning.ctx_stats.values() if v["trades"] >= _CTX_MIN)
    total_trades = sum(x.trades for x in learning.strategies.values())
    profiles.append({
        "id": "learning", "name": "Learning AI", "role": "Learning", "status": "เรียนรู้จากทุกไม้",
        "metrics": [
            {"label": "ไม้ที่เรียนแล้ว", "value": str(total_trades), "tone": "cyan"},
            {"label": "บริบทพร้อมใช้", "value": str(filled), "tone": ("green" if filled else "muted")},
            {"label": "เทคนิคมีข้อมูล", "value": str(sum(1 for s in learning.strategies.values() if s.trades > 0)), "tone": "muted"},
            {"label": "ไม้คณะกรรมการ", "value": str(learning.cmt_n), "tone": "muted"},
        ],
        "highlight": {"label": "ความจำ", "value": "ถาวร", "tone": "green"},
    })

    # 8) Monitor — system health
    running = bool(snap.get("running"))
    mt5_ok = bool(snap.get("mt5", {}).get("connected"))
    profiles.append({
        "id": "monitor", "name": "Monitor AI", "role": "Monitor", "status": ("ระบบทำงานปกติ" if running and mt5_ok else "ตรวจพบปัญหา"),
        "metrics": [
            {"label": "Engine", "value": ("รัน" if running else "หยุด"), "tone": ("green" if running else "red")},
            {"label": "MT5", "value": ("เชื่อมต่อ" if mt5_ok else "หลุด"), "tone": ("green" if mt5_ok else "red")},
            {"label": "รอบประชุม", "value": f"{settings.MEETING_INTERVAL_SEC}s", "tone": "muted"},
            {"label": "หยุดฉุกเฉิน", "value": (snap.get("halted_reason") or "ไม่มี"), "tone": ("red" if snap.get("halted_reason") else "muted")},
        ],
        "highlight": {"label": "สุขภาพ", "value": ("ดี" if running and mt5_ok else "เช็ก"), "tone": ("green" if running and mt5_ok else "amber")},
    })

    return profiles
