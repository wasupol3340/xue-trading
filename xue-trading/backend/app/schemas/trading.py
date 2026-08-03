from pydantic import BaseModel


class AgentOut(BaseModel):
    id: str
    name: str
    role: str
    title: str
    status: str
    confidence: float
    cpu: float
    memory: float
    current_task: str
    performance: float
    online: bool


class StrategyOut(BaseModel):
    key: str
    name: str
    category: str
    score: float
    confidence: float
    win_rate: float
    profit_factor: float
    sharpe: float
    max_drawdown: float
    trades: int
    enabled: bool


class PositionOut(BaseModel):
    id: str
    symbol: str
    side: str
    lots: float
    entry: float
    current: float
    sl: float
    tp: float
    pnl: float
    magic: int


class PortfolioOut(BaseModel):
    balance: float
    equity: float
    profit: float
    profit_pct: float
    drawdown: float
    open_positions: int
    total_profit: float
    today_profit: float
    win_rate: float
    risk_meter: float


class NewsOut(BaseModel):
    id: str
    time: str
    currency: str
    title: str
    impact: str
    actual: str | None = None
    forecast: str | None = None
    previous: str | None = None


class CandleOut(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class DecisionOut(BaseModel):
    symbol: str
    decision: str
    confidence: float
    votes: dict[str, str]
    approved: int
    total: int
    rationale: str
