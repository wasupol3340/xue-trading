from fastapi import APIRouter

from app.schemas.trading import StrategyOut
from app.services.learning import learning

router = APIRouter(prefix="/strategies", tags=["strategies"])


@router.get("", response_model=list[StrategyOut])
async def strategies() -> list[StrategyOut]:
    """Live, self-updating technique scores from the Learning AI."""
    return [StrategyOut(**row) for row in learning.snapshot()]


@router.get("/current")
async def current_technique() -> dict:
    """The technique the AI is trading with right now."""
    key = learning.current_technique
    return {"technique": key, "name": learning.name_of(key) if key else None}
