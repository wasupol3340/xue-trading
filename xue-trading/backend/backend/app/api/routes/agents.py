from fastapi import APIRouter

from app.core.config import settings
from app.schemas.trading import AgentOut, DecisionOut
from app.services import news_data
from app.services.ai_engine import run_meeting, snapshot_agents
from app.services.autotrader import autotrader

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=list[AgentOut])
async def list_agents() -> list[AgentOut]:
    # CEO / Research / Strategy / News / Monitor now report REAL work (live P/L,
    # market read, trade plan, economic calendar, system health).
    agents = snapshot_agents()
    try:
        news_msg = news_data.report()["message"]
    except Exception:  # noqa: BLE001
        news_msg = "Scanning macro feed"
    reports = {
        "CEO": autotrader.ceo_report()["message"],
        "Research": autotrader.research_report()["message"],
        "Strategy": autotrader.strategy_report()["message"],
        "News": news_msg,
        "Monitor": autotrader.monitor_report()["message"],
    }
    for a in agents:
        if a.role in reports:
            a.current_task = reports[a.role]
    return agents


@router.get("/decision", response_model=DecisionOut)
async def latest_decision(symbol: str | None = None) -> DecisionOut:
    # Default to the account's real trading symbol (e.g. XAUUSD.sc), NOT a raw
    # "XAUUSD" that may not exist on the broker and would fall back to synthetic
    # candles — which made this diagnostic unreliable.
    return run_meeting(symbol or settings.SYMBOL)


@router.get("/brains")
async def agent_brains() -> list[dict]:
    """บริษัท AI: แต่ละ agent มีความจำ/KPI/ความแม่นยำ/จุดแข็ง/จุดอ่อน + วงจรเรียนรู้จากความผิดพลาด."""
    from app.services.agents_brain import agent_profiles
    return agent_profiles()


@router.get("/reviews")
async def technique_reviews() -> list[dict]:
    """มติที่ประชุมทบทวนเทคนิค: เทคนิคไหนแพ้ → ใช้ต่อ(ปรับ)/พัก/เฝ้าดู พร้อมเหตุผล."""
    from app.services.agents_brain import technique_reviews as _tr
    return _tr()


@router.get("/live")
async def agents_live(symbol: str | None = None) -> list[dict]:
    """แดชบอร์ดสดของแต่ละ agent — ตอนนี้แต่ละตัวเห็น/ทำอะไรอยู่ (ข้อมูลจริง ไม่ใช่ 'Analyzing...')."""
    from app.services.agents_live import agents_live as _live
    return _live(symbol or settings.SYMBOL)


@router.get("/experience")
async def experience_log(limit: int = 60) -> dict:
    """ศูนย์ประสบการณ์: สมุดพกทุกไม้ (จุดเข้า/กำไรจริง/ทำไม/AI ตัวไหนสั่ง) + สถิติ."""
    from app.services.experience import experience
    return {"trades": experience.recent(limit=limit), "stats": experience.stats()}


@router.get("/boardroom")
async def boardroom_latest() -> dict:
    """ผลประชุมใหญ่ 4 ทุ่มล่าสุด (บทสนทนา + สรุป CEO)."""
    from app.services.boardroom import latest
    return latest()


@router.api_route("/boardroom/run", methods=["GET", "POST"])
async def boardroom_run() -> dict:
    """สั่งจัดประชุมใหญ่ทันที (สำหรับทดสอบ) — คุยจริง + ส่งเข้า Telegram + คุมงบ.
    รองรับ GET เพื่อให้เปิดจากเบราว์เซอร์ทดสอบได้ (มี budget cap คุมอยู่แล้ว)."""
    from app.services.boardroom import run
    return run(settings.SYMBOL, force=True)


@router.get("/company")
async def company_status() -> dict:
    """Real per-department reports for the dashboard."""
    out = {
        "ceo": autotrader.ceo_report(),
        "research": autotrader.research_report(),
        "strategy": autotrader.strategy_report(),
        "monitor": autotrader.monitor_report(),
    }
    try:
        out["news"] = news_data.report()
    except Exception:  # noqa: BLE001
        out["news"] = {"status": "scanning", "message": "Scanning macro feed", "gated": False}
    return out
