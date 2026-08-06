from fastapi import APIRouter

from app.schemas.trading import PortfolioOut, PositionOut
from app.services.market_data import get_price

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("", response_model=PortfolioOut)
async def portfolio() -> PortfolioOut:
    return PortfolioOut(
        balance=1000.0,
        equity=1720.45,
        profit=720.45,
        profit_pct=72.0,
        drawdown=4.12,
        open_positions=3,
        total_profit=720.45,
        today_profit=216.30,
        win_rate=68.4,
        risk_meter=4.12,
    )


@router.get("/positions", response_model=list[PositionOut])
async def positions() -> list[PositionOut]:
    price = get_price("XAUUSD")
    raw = [
        ("p1", "BUY", 0.10, 2331.4, 2320.0, 2370.0),
        ("p2", "BUY", 0.05, 2338.2, 2325.0, 2372.0),
        ("p3", "SELL", 0.05, 2352.9, 2360.0, 2330.0),
    ]
    out = []
    for pid, side, lots, entry, sl, tp in raw:
        direction = 1 if side == "BUY" else -1
        pnl = round((price - entry) * direction * lots * 100, 2)
        out.append(
            PositionOut(
                id=pid, symbol="XAUUSD", side=side, lots=lots, entry=entry,
                current=price, sl=sl, tp=tp, pnl=pnl, magic=20260803,
            )
        )
    return out
