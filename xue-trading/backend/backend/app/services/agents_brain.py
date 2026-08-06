"""
Agent Brains — turns the 8 "AI departments" into MEASURED entities. Each agent has:
  - job          : what it actually does every cycle
  - kpi          : real metrics from live results
  - accuracy     : how often it was right (where measurable; honest proxy otherwise)
  - strengths / weaknesses : best/worst contexts from real data
  - learning     : whether it is actively learning-from-mistakes, and what it adjusted

IMPORTANT / honest notes:
  - All "learning" here is bounded statistical adaptation (like the contextual brain
    and adaptive committee weights) — NOT an LLM per agent, and NOT autonomous code
    rewriting. Hard risk guardrails are never crossed.
  - Some agents (Macro/Execution) need data we don't fully capture yet — those KPIs
    are marked "รอข้อมูล" rather than faked.

`agent_profiles()` returns a list[dict] for /api/agents/brains.
"""
from __future__ import annotations

from datetime import datetime

from app.core.config import settings
from app.services import committee
from app.services.learning import learning, _CMT_MIN, _CTX_MIN


def _overall() -> dict:
    s = learning.strategies.values()
    trades = sum(x.trades for x in s)
    wins = sum(x.wins for x in s)
    gp = sum(x.gross_profit for x in s)
    gl = sum(x.gross_loss for x in s)
    return {
        "trades": trades,
        "wins": wins,
        "win_rate": round(wins / trades * 100, 1) if trades else 0.0,
        "profit_factor": round(gp / gl, 2) if gl > 0 else (round(gp, 2) if gp else 0.0),
        "net_pnl": round(gp - gl, 2),
    }


def _committee_weight_deltas():
    base = committee.WEIGHTS
    w = learning.committee_weights(base)
    deltas = sorted(((c, round(w[c] - base[c], 4)) for c in base), key=lambda t: t[1], reverse=True)
    return w, deltas


def technique_reviews() -> list[dict]:
    """มติที่ประชุมทบทวนเทคนิค (เฉพาะเทคนิคที่มีผลเทรดแล้ว) เรียงเทคนิคที่ต้องจัดการก่อน."""
    order = {"bench": 0, "refine": 1, "watch": 2, "ok": 3}
    revs = [learning.technique_review(k) for k, s in learning.strategies.items() if s.trades > 0]
    revs.sort(key=lambda r: (order.get(r["status"], 9), -r["streak"]))
    return revs


def agent_profiles() -> list[dict]:
    ov = _overall()
    active_ctx = any(v["trades"] >= _CTX_MIN for v in learning.ctx_stats.values())
    ranked = sorted(learning.strategies.values(), key=lambda s: s.score, reverse=True)
    lead = ranked[0] if ranked else None

    reviews = technique_reviews()
    flagged = [r for r in reviews if r["status"] in ("refine", "bench", "watch")]
    refine = [r for r in reviews if r["status"] == "refine"]
    bench = [r for r in reviews if r["status"] == "bench"]

    # live system snapshot (lazy import to avoid cycles)
    try:
        from app.services.autotrader import autotrader
        snap = autotrader.snapshot()
    except Exception:  # noqa: BLE001
        snap = {}

    # per-agent measured stats (Phase 2)
    ex = learning.agent_stats("execution")
    mc = learning.agent_stats("macro")
    mon = learning.agent_stats("monitor")

    # CEO / Learning — แนวโน้มผลงานช่วงหลังเทียบช่วงต้น (ดีขึ้น/แผ่ว)
    rp = learning.recent_pnls
    recent_net = round(sum(rp[-10:]), 2)
    improving = None
    if len(rp) >= 8:
        h = len(rp) // 2
        early_wr = sum(1 for p in rp[:h] if p >= 0) / h * 100.0
        late_wr = sum(1 for p in rp[h:] if p >= 0) / (len(rp) - h) * 100.0
        improving = round(late_wr - early_wr, 1)
    trend_txt = ("ยังไม่พอประเมิน" if improving is None
                 else ("ดีขึ้น" if improving > 5 else ("แผ่วลง" if improving < -5 else "ทรงตัว")))

    profiles: list[dict] = []

    # 1) CEO — oversight / P&L / เรียกประชุมทบทวนเทคนิค
    profiles.append({
        "id": "ceo", "name": "CEO AI", "role": "CEO", "job": "กำกับ P&L ภาพรวม + เรียกประชุมทบทวนเทคนิคที่ผลงานตก",
        "kpi": {"กำไรสุทธิสะสม": ov["net_pnl"], "Profit Factor": ov["profit_factor"],
                "วันนี้": snap.get("realized_pnl_today", 0.0), "10 ไม้ล่าสุด": recent_net,
                "แนวโน้ม": trend_txt, "เทคนิคเข้าที่ประชุม": len(flagged)},
        "accuracy": ov["win_rate"],
        "memory": f"{ov['trades']} ไม้สะสม · ทบทวนเทคนิคที่มีข้อมูล {len(reviews)} ตัว",
        "strengths": ["เห็นภาพรวมทั้งบริษัท"] + ([f"เทคนิคนำ {lead.name} คะแนน {lead.score}"] if lead else []),
        "weaknesses": ([f"{len(flagged)} เทคนิคผลงานตก — เข้าประชุมทบทวน"] if flagged else ["—"]),
        "learning": {"active": bool(flagged),
                     "status": (f"เรียกประชุม {len(flagged)} เทคนิค (ปรับ {len(refine)} · พัก {len(bench)}) — ขนาดไม้คงที่"
                                if flagged else f"ทุกเทคนิคผลงานปกติ · แนวโน้มรวม: {trend_txt}")},
    })

    # 2) CIO — the Investment Committee (final BUY/SELL/NO TRADE)
    w, deltas = _committee_weight_deltas()
    cio_active = learning.cmt_n >= _CMT_MIN
    top_cats = [c for c, _ in sorted(w.items(), key=lambda t: t[1], reverse=True)[:3]]
    profiles.append({
        "id": "cio", "name": "CIO AI", "role": "CIO", "job": "ตัดสินใจสุดท้าย BUY/SELL/NO TRADE (คณะกรรมการ 13 หมวด)",
        "kpi": {"ไม้ที่ผ่านคณะกรรมการ": learning.cmt_n, "เกณฑ์คะแนน": settings.COMMITTEE_MIN_SCORE,
                "หมวดที่เชื่อถือสุด": ", ".join(top_cats)},
        "accuracy": ov["win_rate"],
        "memory": f"เรียนรู้จาก {learning.cmt_n} ไม้ที่กรองผ่าน (ต้อง ≥{_CMT_MIN} จึงเริ่มปรับน้ำหนัก)",
        "strengths": ["กรองไม้คุณภาพต่ำออก (รักษาทุน)"],
        "weaknesses": ["หมวด Correlation (DXY/Yields) ยังไม่มีข้อมูล — หักความมั่นใจ"],
        "learning": {"active": cio_active,
                     "status": (f"เพิ่มน้ำหนัก: {deltas[0][0]} (+{deltas[0][1]}) · ลด: {deltas[-1][0]} ({deltas[-1][1]})"
                                if cio_active else f"ยังใช้น้ำหนักมาตรฐาน (รออีก {max(0,_CMT_MIN-learning.cmt_n)} ไม้)")},
    })

    # 3) Research — reads structure, proposes the technique
    best = worst = None
    if lead:
        best, worst = learning.context_extremes(lead.key)
    profiles.append({
        "id": "research", "name": "Research AI", "role": "Research", "job": "อ่านโครงสร้างตลาด เสนอเทคนิค/setup ที่ดีที่สุด",
        "kpi": {"เทคนิคนำ": lead.name if lead else "—", "คะแนน": lead.score if lead else 0,
                "เทคนิคที่มีข้อมูล": sum(1 for s in learning.strategies.values() if s.trades > 0)},
        "accuracy": lead.win_rate if lead else 0.0,
        "memory": f"จำผลเทรดต่อเทคนิค x{len(learning.strategies)} + บริบท {len(learning.ctx_stats)} แบบ",
        "strengths": ([f"{lead.name} เก่งตอน {best['context']} (ชนะ {best['win_rate']}%)"] if best else (["กำลังหาบริบทที่เก่ง"] )),
        "weaknesses": ([f"อ่อนตอน {worst['context']} (ชนะ {worst['win_rate']}%)"] if worst else ["ยังข้อมูลไม่พอบอกจุดอ่อน"]),
        "learning": {"active": active_ctx, "status": ("เลือกเทคนิคตามบริบทจริงแล้ว" if active_ctx else f"รอ ≥{_CTX_MIN} ไม้/บริบท จึงปรับ")},
    })

    # 4) Macro — economic news
    try:
        from app.services import news_data
        nrep = news_data.report()
        macro_msg = nrep.get("message", "")
    except Exception:  # noqa: BLE001
        macro_msg = "อ่านปฏิทินข่าวไม่ได้"
    near = mc["by_detail"].get("near", {})
    away = mc["by_detail"].get("away", {})
    near_wr = round(near["correct"] / near["judged"] * 100, 1) if near.get("judged") else None
    away_wr = round(away["correct"] / away["judged"] * 100, 1) if away.get("judged") else None
    macro_learn = mc["judged"] >= 6 and near_wr is not None and away_wr is not None
    profiles.append({
        "id": "macro", "name": "Macro AI", "role": "Macro", "job": "ตรวจข่าวเศรษฐกิจ (ForexFactory) เลี่ยงช่วงข่าวแรง",
        "kpi": {"ข่าวสัปดาห์นี้": macro_msg, "หน้าต่างเลี่ยงข่าว": f"±{settings.COMMITTEE_NEWS_MIN} นาที",
                "ชนะช่วงใกล้ข่าว": f"{near_wr}%" if near_wr is not None else "—",
                "ชนะช่วงห่างข่าว": f"{away_wr}%" if away_wr is not None else "—"},
        "accuracy": mc["accuracy"],
        "memory": f"ปฏิทินข่าว + ผลไม้ {mc['judged']} ไม้แยกใกล้/ห่างข่าว",
        "strengths": ["กันบอทเทรดตอนข่าวแรง (ความผันผวนสูง)"]
                     + ([f"ยืนยันแล้ว: ห่างข่าวชนะ {away_wr}% > ใกล้ข่าว {near_wr}%"]
                        if macro_learn and away_wr > near_wr else []),
        "weaknesses": (["ข้อมูลไม้ใกล้/ห่างข่าวยังน้อย — ประเมินไม่ชัด"] if not macro_learn else ["—"]),
        "learning": {"active": macro_learn,
                     "status": (f"วัดจริง: ใกล้ข่าวชนะ {near_wr}% · ห่างข่าวชนะ {away_wr}% — {'คุ้มที่เลี่ยงข่าว' if (away_wr or 0) > (near_wr or 0) else 'กำลังเก็บเพิ่ม'}"
                                if macro_learn else "กำลังเก็บผลไม้ใกล้/ห่างข่าวเพื่อประเมินว่าเลี่ยงข่าวคุ้มไหม")},
    })

    # 5) Risk — position sizing + hard limits (ขนาดไม้คงที่ — ไม่ลดตามการแพ้)
    profiles.append({
        "id": "risk", "name": "Risk AI", "role": "Risk", "job": "คุมความเสี่ยง คำนวณขนาดไม้ตามทุน บังคับเพดาน (veto ได้)",
        "kpi": {"ความเสี่ยง/ไม้": f"{settings.RISK_PER_TRADE}%", "ขนาดไม้": "คงที่ (ตามทุน)",
                "เพดานขาดทุน/วัน": f"{settings.DAILY_LOSS_LIMIT}%", "ไม้เปิดสูงสุด": settings.MAX_OPEN_TRADES},
        "accuracy": None,
        "memory": "พารามิเตอร์ความเสี่ยง + สถานะ drawdown ปัจจุบัน",
        "strengths": ["บังคับเพดานความเสี่ยง — ห้ามข้าม (รั้วเหล็ก)", "ขนาดไม้คงที่ — ไม่เพิ่ม/ลดตามอารมณ์การแพ้-ชนะ"],
        "weaknesses": ["ไม่ปรับตัวเอง (โดยตั้งใจ) — การแก้ที่ต้นเหตุอยู่ที่ประชุมทบทวนเทคนิค"],
        "learning": {"active": False,
                     "status": "ขนาดไม้คงที่เสมอ · จัดการความผิดพลาดด้วยการ 'คัด/จำกัดเทคนิค' ที่แพ้ ไม่ใช่ลดขนาดไม้"},
    })

    # 6) Execution — order routing (วัด fill-rate + slippage จริง)
    fill_rate = ex["accuracy"]
    avg_slip = ex["avg_value"]
    profiles.append({
        "id": "execution", "name": "Execution AI", "role": "Execution", "job": "ยิงคำสั่งเข้า MT5 ตามที่คณะกรรมการอนุมัติ",
        "kpi": {"ไม้เปิดอยู่": snap.get("open_trades", 0), "เทรดวันนี้": snap.get("trades_today", 0),
                "ยิงคำสั่งสำเร็จ": f"{fill_rate}%" if fill_rate is not None else "—",
                "Slippage เฉลี่ย": f"{avg_slip}" if avg_slip is not None else "—",
                "MT5": "เชื่อมต่อ" if snap.get("mt5", {}).get("connected") else "—"},
        "accuracy": fill_rate,
        "memory": f"บันทึกการยิงคำสั่ง {ex['calls']} ครั้ง (สำเร็จ/ล้มเหลว + slippage)",
        "strengths": ["ส่งคำสั่งตรงตามมติ + แนบ SL/TP + เทคนิคใน comment"]
                     + ([f"อัตราสำเร็จ {fill_rate}%"] if fill_rate is not None else []),
        "weaknesses": ([f"Slippage เฉลี่ย {avg_slip} จุด — เฝ้าดูช่วงราคาลื่น"] if avg_slip and avg_slip > 0.2 else ["—"]),
        "learning": {"active": ex["calls"] >= 5,
                     "status": (f"วัดจริง: สำเร็จ {fill_rate}% · slippage เฉลี่ย {avg_slip}"
                                if ex["calls"] >= 5 else "กำลังเก็บสถิติการยิงคำสั่ง (ต้อง ≥5 ครั้ง)")},
    })

    # 7) Learning — the meta-learner + เลขาที่ประชุมทบทวนเทคนิค
    filled = sum(1 for v in learning.ctx_stats.values() if v["trades"] >= _CTX_MIN)
    if bench:
        meet_status = f"มติล่าสุด: พัก {len(bench)} เทคนิค ({', '.join(r['name'] for r in bench[:3])}) · ปรับ {len(refine)}"
    elif refine:
        meet_status = f"มติล่าสุด: ปรับ {len(refine)} เทคนิคให้เทรดเฉพาะสภาพที่เก่ง ({', '.join(r['name'] for r in refine[:3])})"
    else:
        meet_status = "ทุกเทคนิคผลงานปกติ — ไม่ต้องทบทวน"
    imp_txt = ("ยังไม่พอประเมิน" if improving is None
               else (f"ดีขึ้น +{improving}% (ช่วงหลัง vs ช่วงต้น)" if improving > 5
                     else (f"แผ่วลง {improving}%" if improving < -5 else "ทรงตัว")))
    profiles.append({
        "id": "learning", "name": "Learning AI", "role": "Learning",
        "job": "ปรับคะแนนเทคนิค + น้ำหนักคณะกรรมการจากผลจริง + จัดประชุมทบทวนเทคนิคที่แพ้",
        "kpi": {"ไม้ที่เรียนรู้แล้ว": ov["trades"], "บริบทที่พร้อมใช้": filled,
                "เทคนิคที่ทบทวน": len(flagged), "พัก/ปรับ": f"{len(bench)}/{len(refine)}",
                "พัฒนาการ": imp_txt},
        "accuracy": ov["win_rate"],
        "memory": f"ทุกไม้ใน Supabase (audit trail) — {ov['trades']} ไม้",
        "strengths": ["ความจำถาวร ย้าย VPS ไม่หาย", "ป้อนสมองทุกตัว", "เรียนจากความผิดพลาด: คัด/จำกัดเทคนิคที่แพ้"],
        "weaknesses": (["ยังสะสมข้อมูลไม่พอให้สมองส่วนใหญ่ activate"] if ov["trades"] < 25 else ["—"]),
        "learning": {"active": active_ctx or bool(flagged) or (learning.cmt_n >= _CMT_MIN),
                     "status": f"{meet_status} · พัฒนาการรวม: {imp_txt}"},
        "reviews": reviews,   # มติที่ประชุมทบทวนเทคนิคแบบละเอียด (สำหรับหน้าเว็บ)
    })

    # 8) Monitor — system health (นับ restart + uptime จริง)
    restarts = mon["calls"]
    uptime_txt = "—"
    mon_evs = learning.agent_events.get("monitor", [])
    if mon_evs and mon_evs[0].get("value"):
        try:
            secs = max(0.0, datetime.now().timestamp() - float(mon_evs[0]["value"]))
            h, m = int(secs // 3600), int((secs % 3600) // 60)
            uptime_txt = f"{h} ชม. {m} นาที" if h else f"{m} นาที"
        except Exception:  # noqa: BLE001
            uptime_txt = "—"
    profiles.append({
        "id": "monitor", "name": "Monitor AI", "role": "Monitor", "job": "เฝ้าระบบ + การเชื่อมต่อ MT5 + สถานะ engine",
        "kpi": {"Engine": "รัน" if snap.get("running") else "หยุด",
                "MT5": "เชื่อมต่อ" if snap.get("mt5", {}).get("connected") else "—",
                "Uptime รอบนี้": uptime_txt, "จำนวนครั้งที่เริ่มระบบ": restarts,
                "หยุดฉุกเฉิน": snap.get("halted_reason") or "ไม่มี"},
        "accuracy": mon["accuracy"],
        "memory": f"ประวัติการเริ่มระบบ {restarts} ครั้ง + สถานะเรียลไทม์",
        "strengths": ["ตรวจสุขภาพระบบตลอดเวลา", "บันทึกการเริ่มระบบ/สถานะ MT5 ทุกครั้ง"],
        "weaknesses": (["ยังไม่จับ event MT5 หลุดกลางทางเป็นสถิติ (roadmap)"]),
        "learning": {"active": restarts > 0,
                     "status": f"บันทึกแล้ว {restarts} ครั้ง · uptime รอบนี้ {uptime_txt}"},
    })

    return profiles
