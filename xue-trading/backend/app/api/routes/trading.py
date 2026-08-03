from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.services.autotrader import autotrader
from app.services.mt5_client import client

router = APIRouter(prefix="/trading", tags=["trading"])


@router.get("/status")
async def status(_: str = Depends(get_current_user)) -> dict:
    """Engine + MT5 + current-technique snapshot."""
    return autotrader.snapshot()


@router.get("/account")
async def account(_: str = Depends(get_current_user)) -> dict:
    return client.account().__dict__


@router.get("/positions")
async def positions(_: str = Depends(get_current_user)) -> list[dict]:
    return [p.__dict__ for p in client.positions()]


@router.post("/start")
async def start(_: str = Depends(get_current_user)) -> dict:
    return await autotrader.start()


@router.post("/stop")
async def stop(flatten: bool = False, _: str = Depends(get_current_user)) -> dict:
    return await autotrader.stop(flatten=flatten)


@router.post("/panic")
async def panic(_: str = Depends(get_current_user)) -> dict:
    """Emergency kill-switch: stop the engine and flatten everything."""
    return await autotrader.stop(flatten=True)


@router.post("/order/close/{ticket}")
async def close_order(ticket: int, _: str = Depends(get_current_user)) -> dict:
    r = client.close_position(ticket)
    return {"ok": r.ok, "ticket": ticket, "retcode": r.retcode, "comment": r.comment}
