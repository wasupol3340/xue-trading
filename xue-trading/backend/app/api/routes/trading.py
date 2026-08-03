from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.services.autotrader import autotrader
from app.services.mt5_client import client

router = APIRouter(prefix="/trading", tags=["trading"])


@router.get("/status")
async def status() -> dict:
    """Engine + MT5 connection snapshot (safe to poll from the dashboard)."""
    return autotrader.snapshot()


@router.get("/account")
async def account() -> dict:
    a = client.account()
    return a.__dict__


@router.get("/positions")
async def positions() -> list[dict]:
    return [p.__dict__ for p in client.positions()]


@router.post("/start")
async def start(user: User = Depends(get_current_user)) -> dict:
    """Arm the autonomous engine. Requires auth. Live accounts must opt in via config."""
    return await autotrader.start()


@router.post("/stop")
async def stop(flatten: bool = False, user: User = Depends(get_current_user)) -> dict:
    """Disarm the engine. Pass flatten=true to also close all open positions."""
    return await autotrader.stop(flatten=flatten)


@router.post("/panic")
async def panic(user: User = Depends(get_current_user)) -> dict:
    """Emergency kill-switch: stop the engine and flatten everything immediately."""
    return await autotrader.stop(flatten=True)


@router.post("/order/close/{ticket}")
async def close_order(ticket: int, user: User = Depends(get_current_user)) -> dict:
    r = client.close_position(ticket)
    return {"ok": r.ok, "ticket": ticket, "retcode": r.retcode, "comment": r.comment}
