from fastapi import APIRouter

from app.schemas.trading import StrategyOut

router = APIRouter(prefix="/strategies", tags=["strategies"])

_STRATEGIES = [
    StrategyOut(key="smc", name="Smart Money Concepts", category="SMC", score=92, confidence=89, win_rate=71.4, profit_factor=2.31, sharpe=1.94, max_drawdown=6.2, trades=412, enabled=True),
    StrategyOut(key="ict", name="ICT (Inner Circle Trader)", category="ICT", score=90, confidence=87, win_rate=68.9, profit_factor=2.18, sharpe=1.81, max_drawdown=7.1, trades=388, enabled=True),
    StrategyOut(key="liquidity", name="Liquidity Sweep", category="SMC", score=88, confidence=85, win_rate=66.7, profit_factor=2.04, sharpe=1.72, max_drawdown=7.8, trades=274, enabled=True),
    StrategyOut(key="orderblock", name="Order Block", category="SMC", score=87, confidence=84, win_rate=65.9, profit_factor=1.98, sharpe=1.66, max_drawdown=8.0, trades=336, enabled=True),
    StrategyOut(key="fvg", name="Fair Value Gap", category="ICT", score=85, confidence=82, win_rate=64.2, profit_factor=1.92, sharpe=1.57, max_drawdown=8.4, trades=301, enabled=True),
    StrategyOut(key="wyckoff", name="Wyckoff Method", category="Volume", score=83, confidence=80, win_rate=63.0, profit_factor=1.86, sharpe=1.52, max_drawdown=8.9, trades=198, enabled=True),
    StrategyOut(key="supplydemand", name="Supply & Demand", category="SMC", score=81, confidence=78, win_rate=61.3, profit_factor=1.74, sharpe=1.42, max_drawdown=9.6, trades=259, enabled=True),
    StrategyOut(key="ema", name="EMA Confluence", category="Indicator", score=73, confidence=70, win_rate=57.8, profit_factor=1.51, sharpe=1.18, max_drawdown=11.2, trades=520, enabled=True),
    StrategyOut(key="rsi", name="RSI Divergence", category="Indicator", score=69, confidence=66, win_rate=55.1, profit_factor=1.39, sharpe=1.02, max_drawdown=12.7, trades=480, enabled=False),
    StrategyOut(key="macd", name="MACD Momentum", category="Indicator", score=66, confidence=63, win_rate=53.4, profit_factor=1.31, sharpe=0.94, max_drawdown=13.5, trades=445, enabled=False),
]


@router.get("", response_model=list[StrategyOut])
async def strategies() -> list[StrategyOut]:
    return sorted(_STRATEGIES, key=lambda s: s.score, reverse=True)
