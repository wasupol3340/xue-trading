"""
AI Advisor (LLM) — an optional human-language SECOND OPINION on the committee's
decision. ADVISORY ONLY: it never changes the deterministic BUY / SELL / NO TRADE.
The committee (rules) decides; the advisor just comments in plain Thai, so you can
see a real AI's take on each trade and what to improve.

Uses Claude Haiku via the Messages API over stdlib urllib (no extra dependency to
install on the VPS). Cost is capped HARD by the caller (daily USD budget). If
ANTHROPIC_API_KEY is missing, the advisor is simply inactive.
"""
from __future__ import annotations

import json
import os
import urllib.request

from app.core.config import settings

_API_URL = "https://api.anthropic.com/v1/messages"
_PRICE_IN = 1.0 / 1_000_000    # Haiku 4.5 — $/input token
_PRICE_OUT = 5.0 / 1_000_000   # Haiku 4.5 — $/output token

_SYSTEM = (
    "คุณคือ 'ที่ปรึกษาการเทรด' ของกองทุน XUE Trading (ทองคำ XAUUSD). "
    "งานของคุณคือให้ความเห็นสั้น กระชับ เป็นภาษาไทย ต่อการตัดสินใจของ 'คณะกรรมการ' (ระบบกฎ) "
    "ว่าเห็นด้วยไหม มีข้อควรระวังอะไร และถ้าเป็นไม้ที่ไม่เทรด/น่าจะแพ้ ให้เสนอว่าควรพัฒนาอะไร. "
    "สำคัญ: คุณเป็นแค่ที่ปรึกษา ห้ามสั่งเทรดเอง. ตอบไม่เกิน 3-4 ประโยค กระชับ ตรงประเด็น."
)


def _read_env(key: str) -> str:
    """os.environ first, then the backend .env (pydantic-settings doesn't populate os.environ)."""
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


def advise(scorecard: dict, symbol: str) -> dict:
    """Ask Claude for a short opinion on this decision. Returns {ok, text, cost}.
    Never raises — any failure returns ok=False so trading is never affected."""
    key = _read_env("ANTHROPIC_API_KEY")
    if not key:
        return {"ok": False, "text": "", "cost": 0.0}
    model = _read_env("ANTHROPIC_MODEL") or getattr(settings, "ADVISOR_MODEL", "claude-haiku-4-5-20251001")

    user = (
        f"สินทรัพย์: {symbol}\n"
        f"คำตัดสินคณะกรรมการ: {scorecard.get('recommendation')}\n"
        f"คะแนนรวม: {scorecard.get('total')}/100 · เทคนิค: {scorecard.get('technique')}\n"
        f"คะแนนรายหมวด: {json.dumps(scorecard.get('scores', {}), ensure_ascii=False)}\n"
        f"เหตุผลสนับสนุน: {scorecard.get('reasons')}\n"
        f"ความเสี่ยง/Red Team: {scorecard.get('risks')}\n\n"
        "ขอความเห็นสั้นๆ: เห็นด้วยกับคำตัดสินไหม มีข้อควรระวัง หรือข้อเสนอพัฒนาอะไร?"
    )
    body = json.dumps({
        "model": model,
        "max_tokens": 320,
        "system": _SYSTEM,
        "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    req = urllib.request.Request(
        _API_URL, data=body, method="POST",
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = "".join(
            b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"
        ).strip()
        usage = data.get("usage", {})
        cost = usage.get("input_tokens", 0) * _PRICE_IN + usage.get("output_tokens", 0) * _PRICE_OUT
        return {"ok": True, "text": text or "(ไม่มีข้อความตอบกลับ)", "cost": round(cost, 6)}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "text": f"(ที่ปรึกษา AI ไม่พร้อม: {exc})", "cost": 0.0}
