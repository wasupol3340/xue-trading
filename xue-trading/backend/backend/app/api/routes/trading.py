from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.services.autotrader import autotrader
from app.services.learning import learning
from app.services.mt5_client import client
from app.services import notifier

router = APIRouter(prefix="/trading", tags=["trading"])


@router.get("/test-notify")
async def test_notify() -> dict:
    """Diagnostic (no auth): fire a Telegram test straight from the running bot and
    report whether it can read the .env keys. Open in a browser to see the result."""
    sent = notifier.send("🔔 ทดสอบแจ้งเตือนจาก XUE Trading bot")
    return {"available": notifier.available(), "sent": sent, **notifier.debug()}


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


@router.get("/history")
async def history(_: str = Depends(get_current_user)) -> dict:
    """REAL closed-trade history read from MT5 (entry/exit/pnl), with the technique
    recovered from each order's comment (e.g. 'XUE-orderblock'). Empty on the
    simulated broker."""
    raw = client.closed_trades(limit=80)
    trades: list[dict] = []
    wins = 0
    net = 0.0
    tech_pnl: dict[str, float] = {}
    for t in raw:
        comment = t.get("comment", "") or ""
        key = comment[4:] if comment.startswith("XUE-") else ""
        name = learning.name_of(key) if key else (comment or "AI")
        pnl = float(t.get("pnl", 0.0))
        net += pnl
        if pnl >= 0:
            wins += 1
        if name:
            tech_pnl[name] = tech_pnl.get(name, 0.0) + pnl
        trades.append({
            "id": f"{t.get('closed_at', 0)}-{t.get('symbol', '')}",
            "symbol": t.get("symbol", ""), "side": t.get("side", ""),
            "lots": t.get("lots", 0.0), "entry": t.get("entry", 0.0),
            "exit": t.get("exit", 0.0), "pnl": round(pnl, 2),
            "technique": name, "result": "win" if pnl >= 0 else "loss",
            "closed_at": t.get("closed_at", 0),
        })
    n = len(trades)
    best = max(tech_pnl, key=lambda k: tech_pnl[k]) if tech_pnl else "—"
    return {
        "trades": trades,
        "stats": {
            "total": n,
            "win_rate": round(wins / n * 100, 1) if n else 0.0,
            "net_pnl": round(net, 2),
            "best_technique": best,
        },
    }


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
