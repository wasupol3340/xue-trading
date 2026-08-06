import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ai_engine import snapshot_agents
from app.services.market_data import get_price
from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/ws/market")
async def ws_market(ws: WebSocket) -> None:
    """Streams live price + agent telemetry to the dashboard."""
    await manager.connect(ws)
    try:
        while True:
            payload = {
                "type": "tick",
                "symbol": "XAUUSD",
                "price": get_price("XAUUSD"),
                "agents": [a.model_dump() for a in snapshot_agents()],
            }
            await ws.send_json(payload)
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception:  # noqa: BLE001
        await manager.disconnect(ws)
