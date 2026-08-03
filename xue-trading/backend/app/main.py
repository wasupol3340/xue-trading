from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import agents, auth, market, news, portfolio, strategies, trading
from app.services.mt5_bridge import bridge
from app.websocket.routes import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect broker bridge (falls back to simulation on non-Windows hosts)
    bridge.connect()
    # Create tables in dev; production uses Alembic migrations
    try:
        from app.db.session import init_db

        await init_db()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] DB init skipped: {exc}")

    # Optionally arm the autonomous engine on boot (explicit opt-in only).
    # On a Linux/Docker host this drives the SIMULATED broker; run real
    # execution on a Windows MT5 host (whole API here, or `python -m app.worker`).
    if settings.AUTO_TRADING_ENABLED:
        from app.services.autotrader import autotrader

        res = await autotrader.start()
        print(f"[startup] autotrader: {res['message']}")

    yield

    if settings.AUTO_TRADING_ENABLED:
        from app.services.autotrader import autotrader

        await autotrader.stop(flatten=False)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Autonomous AI Trading Platform — 8-agent decision engine, risk management & MT5 execution.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = settings.API_V1_PREFIX
for r in (
    auth.router,
    agents.router,
    market.router,
    portfolio.router,
    news.router,
    strategies.router,
    trading.router,
):
    app.include_router(r, prefix=API)

app.include_router(ws_router)


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "service": settings.PROJECT_NAME, "mt5": bridge.status()}


@app.get("/", tags=["system"])
async def root() -> dict:
    return {"name": settings.PROJECT_NAME, "docs": "/docs", "health": "/health"}
