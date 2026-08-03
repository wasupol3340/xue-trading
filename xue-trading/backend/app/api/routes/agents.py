from fastapi import APIRouter

from app.schemas.trading import AgentOut, DecisionOut
from app.services.ai_engine import run_meeting, snapshot_agents

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=list[AgentOut])
async def list_agents() -> list[AgentOut]:
    return snapshot_agents()


@router.get("/decision", response_model=DecisionOut)
async def latest_decision(symbol: str = "XAUUSD") -> DecisionOut:
    return run_meeting(symbol)
