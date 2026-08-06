"""
ประชุมใหญ่ 4 ทุ่ม (XUE Boardroom) — a REAL multi-turn daily AI meeting.

Each department is its OWN LLM turn (a separate API call), so the agents genuinely
take turns and talk to each other — CEO opens with today's real P&L, agents report
or ask questions, the CEO answers the useful questions, the AI advisor teaches/opines
(its only speaking slot), and the CEO closes with a summary. The full transcript +
CEO summary go to Telegram.

HARD RAILS
  * ADVISORY ONLY. Nothing here changes a trade, a weight, or any parameter. Ideas
    that would change live trading are flagged "รออนุมัติ" for the human.
  * Grounded in REAL numbers (P&L, each agent's real stats, technique reviews). The
    LLM narrates; it does not invent figures.
  * Bounded: at most BOARDROOM_MAX_MESSAGES LLM calls AND at most
    BOARDROOM_DAILY_USD_CAP dollars per meeting. Whichever hits first ends the talk.
  * Weekdays only; the caller (autotrader) also guards the day/weekend/time.

`run(symbol, force=False)` holds the meeting and returns a dict. `latest()` returns
the last meeting for the web/endpoint.
"""
from __future__ import annotations

import json
import os
import urllib.request

from app.core.config import settings

_API_URL = "https://api.anthropic.com/v1/messages"
_PRICE_IN = 1.0 / 1_000_000
_PRICE_OUT = 5.0 / 1_000_000

_LAST: dict = {"held": False, "message": "ยังไม่มีการประชุม"}

_RULES = (
    "นี่คือ 'ประชุมใหญ่ประจำวัน' ของกองทุน XUE Trading (ทองคำ XAUUSD) เวลา 4 ทุ่ม.\n"
    "กติกา: พูดไทยเป็นธรรมชาติเหมือนคนประชุมจริง สั้น 1-5 ประโยค. พูดเฉพาะบทบาทของคุณ ห้ามพูดแทนคนอื่น.\n"
    "อ้างอิงเฉพาะตัวเลข/ข้อมูลจริงที่ให้มา ห้ามกุตัวเลขเอง. อย่าพูดซ้ำสิ่งที่คนอื่นพูดไปแล้ว.\n"
    "คุณเป็นทีมที่ปรึกษา — ทุกข้อเสนอเป็นเพียงคำแนะนำ การเปลี่ยนการเทรดจริงต้องให้เจ้าของกองทุนอนุมัติ ห้ามสั่งเทรดเอง.\n"
    "ถ้าคุณมีคำถามที่เป็นประโยชน์ถึง CEO จริงๆ ให้ปิดท้ายด้วยบรรทัดเดียว: '❓CEO: <คำถาม>' (ถ้าเป็นแค่รายงาน ไม่ต้องมี)."
)

# persona ต่อ agent (บทบาทในห้องประชุม)
_PERSONA = {
    "ceo": "คุณคือ CEO ของกองทุน คุมภาพรวม P&L และวินัยความเสี่ยง เป็นประธานที่ประชุม พูดกระชับ ชัดเจน มองผลประโยชน์ระยะยาว.",
    "research": "คุณคือหัวหน้า Research อ่านโครงสร้างตลาด/เทคนิค เสนอว่าเทคนิคไหนเข้าท่าในสภาพตลาดตอนนี้.",
    "risk": "คุณคือหัวหน้า Risk เฝ้าเพดานความเสี่ยงและ drawdown 'รักษาทุน' มาก่อนกำไรเสมอ ตรงไปตรงมาเรื่องความเสี่ยง.",
    "cio": "คุณคือ CIO ดูแลคณะกรรมการลงทุน 13 หมวด ตัดสินคุณภาพไม้ที่เข้าเกณฑ์.",
    "macro": "คุณคือหัวหน้า Macro/News เฝ้าปฏิทินข่าวเศรษฐกิจ เตือนช่วงข่าวแรงที่ทำให้ทองผันผวน.",
    "execution": "คุณคือหัวหน้า Execution ดูแลการยิงคำสั่งเข้า MT5 คุณภาพการเข้า/สลิปเพจ.",
    "learning": "คุณคือหัวหน้า Learning ปรับคะแนนเทคนิคจากผลจริง และจัดประชุมทบทวนเทคนิคที่แพ้.",
    "monitor": "คุณคือหัวหน้า Monitor เฝ้าสุขภาพระบบ การเชื่อมต่อ MT5 และ engine.",
    "advisor": "คุณคือ 'ที่ปรึกษา AI' อาวุโส คอยสอนงานและชี้จุดพัฒนาให้ทีม มองแบบกองทุน quant มืออาชีพ ให้ข้อเสนอแนะที่นำไปทดสอบได้จริง.",
}
_NAME = {
    "ceo": "CEO", "research": "Research", "risk": "Risk", "cio": "CIO",
    "macro": "Macro", "execution": "Execution", "learning": "Learning",
    "monitor": "Monitor", "advisor": "ที่ปรึกษา AI",
}


# --------------------------------------------------------------------------- #
# LLM plumbing (stdlib urllib — same as advisor.py, no extra dependency)
# --------------------------------------------------------------------------- #
def _read_env(key: str) -> str:
    v = os.environ.get(key)
    if v:
        return v
    here = os.path.dirname(os.path.abspath(__file__))
    backend_root = os.path.abspath(os.path.join(here, "..", ".."))
    for path in (os.path.join(os.getcwd(), ".env"), os.path.join(backend_root, ".env"), ".env"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(key + "="):
                        val = line.split("=", 1)[1].strip()
                        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                            val = val[1:-1]
                        return val
        except Exception:  # noqa: BLE001
            continue
    return ""


def available() -> bool:
    return bool(_read_env("ANTHROPIC_API_KEY"))


def _call(system: str, user: str, max_tokens: int) -> dict:
    """One LLM turn. Returns {ok, text, cost}. Never raises."""
    key = _read_env("ANTHROPIC_API_KEY")
    if not key:
        return {"ok": False, "text": "", "cost": 0.0}
    model = _read_env("ANTHROPIC_MODEL") or getattr(settings, "BOARDROOM_MODEL", "claude-haiku-4-5-20251001")
    body = json.dumps({
        "model": model, "max_tokens": max_tokens, "system": system,
        "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    req = urllib.request.Request(
        _API_URL, data=body, method="POST",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
        u = data.get("usage", {})
        cost = u.get("input_tokens", 0) * _PRICE_IN + u.get("output_tokens", 0) * _PRICE_OUT
        return {"ok": True, "text": text, "cost": round(cost, 6)}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "text": f"(ที่ประชุมขัดข้อง: {exc})", "cost": 0.0}


# --------------------------------------------------------------------------- #
# gather the REAL data the meeting talks about
# --------------------------------------------------------------------------- #
def _gather(symbol: str) -> dict:
    try:
        from app.services.autotrader import autotrader
        snap = autotrader.snapshot()
    except Exception:  # noqa: BLE001
        snap = {}
    try:
        from app.services.agents_brain import agent_profiles, technique_reviews
        profiles = {p["id"]: p for p in agent_profiles()}
        reviews = technique_reviews()
    except Exception:  # noqa: BLE001
        profiles, reviews = {}, []
    flagged = [r for r in reviews if r.get("status") in ("refine", "bench", "watch")]
    realized = float(snap.get("realized_pnl_today", 0.0) or 0.0)
    # Experience Center — บทเรียนไม้ที่ปิดวันนี้ (ป้อนให้ CEO ในที่ประชุม)
    try:
        from datetime import date
        from app.services.experience import experience
        exp_today = experience.today_summary(str(date.today()), market=symbol)
    except Exception:  # noqa: BLE001
        exp_today = ""
    return {
        "symbol": symbol,
        "realized": round(realized, 2),
        "experience": exp_today,
        "open_trades": snap.get("open_trades", 0),
        "trades_today": snap.get("trades_today", 0),
        "halted": snap.get("halted_reason") or "",
        "mt5": bool(snap.get("mt5", {}).get("connected")),
        "running": bool(snap.get("running")),
        "profiles": profiles,
        "reviews": reviews,
        "flagged": flagged,
    }


def _facts_block(ctx: dict) -> str:
    """Compact real-data summary fed into every turn (keeps figures honest)."""
    lines = [
        f"สินทรัพย์: {ctx['symbol']}",
        f"กำไร/ขาดทุนวันนี้: {ctx['realized']:+.2f} USD",
        f"ไม้เปิดอยู่: {ctx['open_trades']} · เทรดวันนี้: {ctx['trades_today']}",
        f"สถานะระบบ: engine {'รัน' if ctx['running'] else 'หยุด'} · MT5 {'เชื่อมต่อ' if ctx['mt5'] else 'หลุด'}"
        + (f" · หยุดฉุกเฉิน: {ctx['halted']}" if ctx["halted"] else ""),
    ]
    if ctx["flagged"]:
        fl = "; ".join(f"{r['name']}→{r['verdict']} ({r['reason']})" for r in ctx["flagged"][:4])
        lines.append(f"เทคนิคที่ควรทบทวน: {fl}")
    else:
        lines.append("เทคนิค: ยังไม่มีตัวที่ต้องทบทวน (ผลอยู่ในเกณฑ์)")
    if ctx.get("experience"):
        lines.append(f"[บทเรียนจากศูนย์ประสบการณ์วันนี้]\n{ctx['experience']}")
    return "\n".join(lines)


def _agent_brief(ctx: dict, aid: str) -> str:
    """What this specific agent has to talk about (from its real profile)."""
    p = ctx["profiles"].get(aid) or {}
    kpi = p.get("kpi") or {}
    kpi_s = " · ".join(f"{k}: {v}" for k, v in list(kpi.items())[:4])
    acc = p.get("accuracy")
    parts = []
    if kpi_s:
        parts.append(f"ตัวเลขของคุณ: {kpi_s}")
    if acc is not None:
        parts.append(f"ความแม่นยำ: {acc}%")
    ln = (p.get("learning") or {}).get("status")
    if ln:
        parts.append(f"สถานะเรียนรู้: {ln}")
    return " | ".join(parts) or "ยังไม่มีข้อมูลเด่นสำหรับคุณวันนี้"


def _has_point(ctx: dict, aid: str) -> bool:
    """Does this agent have a data-grounded reason to speak? (some skip = natural + cheaper)"""
    if aid in ("research", "risk", "learning"):
        return True                                   # core voices — always
    if aid == "cio":
        return True                                   # committee always reports
    if aid == "macro":
        return True                                   # news check matters daily
    if aid == "execution":
        return (ctx["trades_today"] or 0) > 0 or (ctx["open_trades"] or 0) > 0
    if aid == "monitor":
        return bool(ctx["halted"]) or not ctx["mt5"] or not ctx["running"]
    return False


def _question_for_ceo(text: str) -> str:
    for marker in ("❓CEO:", "❓ CEO:", "คำถามถึง CEO:", "คำถามถึงCEO:"):
        if marker in text:
            return text.split(marker, 1)[1].strip().split("\n")[0].strip()
    return ""


# --------------------------------------------------------------------------- #
# the meeting
# --------------------------------------------------------------------------- #
def run(symbol: str | None = None, force: bool = False) -> dict:
    """Hold the meeting now. force=True bypasses the ENABLED flag (manual test)."""
    symbol = symbol or settings.SYMBOL
    if not force and not settings.BOARDROOM_ENABLED:
        return {"held": False, "message": "ปิดการประชุมอยู่ (BOARDROOM_ENABLED=false)"}
    if not available():
        out = {"held": False, "message": "ยังไม่มี ANTHROPIC_API_KEY — ประชุมไม่ได้"}
        return out

    ctx = _gather(symbol)
    facts = _facts_block(ctx)
    cap = float(settings.BOARDROOM_DAILY_USD_CAP)
    max_msgs = int(settings.BOARDROOM_MAX_MESSAGES)
    max_tok = int(settings.BOARDROOM_MAX_TOKENS)

    transcript: list[dict] = []
    spent = {"usd": 0.0, "n": 0}

    def _room_so_far() -> str:
        if not transcript:
            return "(ยังไม่มีใครพูด)"
        return "\n".join(f"{_NAME[t['id']]}: {t['text']}" for t in transcript)

    def can_talk() -> bool:
        return spent["n"] < max_msgs and spent["usd"] < cap

    def speak(aid: str, instruction: str) -> str:
        """One turn. Returns the agent's text ('' if we couldn't/ didn't speak)."""
        if not can_talk():
            return ""
        system = _RULES + "\n\nบทบาทของคุณ: " + _PERSONA[aid]
        user = (
            f"[ข้อมูลจริงวันนี้]\n{facts}\n\n"
            f"[บทประชุมจนถึงตอนนี้]\n{_room_so_far()}\n\n"
            f"[ข้อมูลเฉพาะของคุณ]\n{_agent_brief(ctx, aid)}\n\n"
            f"[ตาคุณพูด — {_NAME[aid]}]\n{instruction}"
        )
        res = _call(system, user, max_tok)
        spent["usd"] += float(res.get("cost", 0.0))
        spent["n"] += 1
        text = (res.get("text") or "").strip()
        if not text:
            return ""
        transcript.append({"id": aid, "text": text})
        return text

    # 1) CEO opens with the real numbers
    speak("ceo", f"เปิดประชุม สรุปผลวันนี้จากตัวเลขจริง (กำไร/ขาดทุน {ctx['realized']:+.2f} USD) "
                 "ว่าวันนี้เป็นอย่างไรและเพราะอะไร แล้วเชิญทีมรายงาน.")

    # 2) each department with a point: reports OR asks the CEO a useful question
    for aid in ("research", "risk", "cio", "macro", "execution", "learning", "monitor"):
        if not can_talk():
            break
        if not _has_point(ctx, aid):
            continue
        txt = speak(aid, "รายงานสั้นๆ จากมุมของคุณ หรือถาม CEO ถ้ามีคำถามที่เป็นประโยชน์จริงๆ.")
        q = _question_for_ceo(txt)
        if q and can_talk():
            speak("ceo", f"ตอบคำถามจาก {_NAME[aid]}: “{q}” — ตอบให้ตรงและเป็นประโยชน์ "
                         "(ถ้าไม่สำคัญให้รับทราบสั้นๆ พอ).")

    # 3) the AI advisor — teaches / proposes improvements (its ONLY speaking slot)
    if can_talk():
        focus = "เทคนิคที่ควรทบทวน" if ctx["flagged"] else "ภาพรวมของวันนี้"
        atxt = speak("advisor", f"ให้ความเห็นเชิงสอนงานต่อ{focus} และเสนอ 1-2 สิ่งที่ควรทดสอบ/ปรับ "
                                "(ระบุให้ชัดว่าเป็นข้อเสนอที่ต้องให้เจ้าของอนุมัติก่อน ไม่ใช่สั่งทำเลย).")
        aq = _question_for_ceo(atxt)
        if aq and can_talk():
            speak("ceo", f"ตอบที่ปรึกษา AI: “{aq}”.")

    # 4) CEO closes with the summary the owner will read first
    speak("ceo", "ปิดประชุม สรุปให้เจ้าของกองทุน: (1) วันนี้ได้ประโยชน์/บทเรียนอะไร "
                 f"(2) กำไร/ขาดทุนวันนี้ {ctx['realized']:+.2f} USD (3) มีอะไรที่ 'เสนอให้พิจารณาแก้' บ้าง "
                 "(ย้ำว่าเป็นข้อเสนอ ต้องรออนุมัติ). กระชับ 3-5 ประโยค.")

    # CEO's closing turn is the summary; fall back to open/any CEO line if needed
    ceo_lines = [t["text"] for t in transcript if t["id"] == "ceo"]
    summary = ceo_lines[-1] if ceo_lines else f"วันนี้ผล {ctx['realized']:+.2f} USD."

    result = {
        "held": True,
        "symbol": symbol,
        "realized": ctx["realized"],
        "messages": spent["n"],
        "spent_usd": round(spent["usd"], 5),
        "transcript": transcript,
        "summary": summary,
        "flagged": ctx["flagged"],
    }
    _send_telegram(result)
    global _LAST
    _LAST = {**result, "message": "ประชุมเสร็จแล้ว"}
    return result


# --------------------------------------------------------------------------- #
# Telegram delivery (splits into multiple messages so nothing is cut)
# --------------------------------------------------------------------------- #
def _chunk(text: str, limit: int = 3800) -> list[str]:
    out, cur = [], ""
    for line in text.split("\n"):
        if len(cur) + len(line) + 1 > limit:
            if cur:
                out.append(cur)
            cur = line
        else:
            cur = (cur + "\n" + line) if cur else line
    if cur:
        out.append(cur)
    return out


def _send_telegram(result: dict) -> None:
    try:
        from app.services import notifier
        if not notifier.available():
            return
        head = (
            f"🏛️ <b>ประชุมใหญ่ XUE Trading (4 ทุ่ม)</b>\n"
            f"💰 วันนี้: <b>{result['realized']:+.2f} USD</b> · {result['messages']} ข้อความ\n"
            f"━━━━━━━━━━━━━━\n"
            f"📌 <b>สรุปจาก CEO</b>\n{result['summary']}"
        )
        notifier.send(head)
        # full transcript, chunked
        body_lines = [f"<b>{_NAME[t['id']]}:</b> {t['text']}" for t in result["transcript"]]
        full = "🗣️ <b>บทประชุมเต็ม</b>\n" + "\n\n".join(body_lines)
        for part in _chunk(full):
            notifier.send(part)
    except Exception:  # noqa: BLE001 — delivery must never crash the caller
        pass


def latest() -> dict:
    return _LAST
