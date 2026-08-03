# XUE Trading — Autonomous AI Trading Platform

An enterprise-grade, Bloomberg-Terminal-meets-Apple trading platform where a company of eight specialized AI agents autonomously researches the market, debates in a live meeting room, manages risk, and executes on MetaTrader 5 — no human confirmation required.

> **Safety note:** the platform ships in **simulated / demo mode** by default. The MT5 bridge falls back to a paper broker when the `MetaTrader5` library or a live terminal is not present, and the Risk AI enforces hard drawdown / daily-loss / exposure limits that cannot be overridden by agent consensus. Connect a live account only after you have reviewed the risk configuration.

---

## Tech stack

| Layer | Technology |
|------|------------|
| Frontend | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide, React Query |
| Charts | Self-contained SVG candlestick engine (SMC/ICT annotations), Recharts, TradingView Advanced widget (optional), ApexCharts |
| Backend | FastAPI (Python 3.11), SQLAlchemy 2 (async), Pydantic v2 |
| Database | PostgreSQL 16 |
| Auth | JWT access + refresh-token rotation, bcrypt |
| Realtime | WebSocket (price + agent telemetry stream) |
| Execution | MetaTrader 5 Python API (with simulated fallback) |
| Deploy | Docker + docker-compose |

---

## Quick start (Docker — recommended)

```bash
cd xue-trading
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API docs → http://localhost:8000/docs
- Health → http://localhost:8000/health

Seed the default superuser (in another terminal):

```bash
docker compose exec backend python -m app.db.seed
# login: master@xuetrading.ai  /  xue-admin-2026
```

## Local development

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The UI renders fully with realistic live-updating mock data even when the backend is offline, so you can preview it immediately.

---

## The AI company

```
Market Data → Research AI → Strategy AI → News AI → Risk AI → CEO AI → Execution AI → MT5
                                     ↑                                              │
                              Learning AI  ◄───────── evaluates every trade ────────┘
```

| Agent | Responsibility |
|-------|----------------|
| **CEO AI** | Aggregates all votes into the final decision |
| **Research AI** | HTF structure, order blocks, FVG, liquidity (SMC/ICT) |
| **Strategy AI** | Builds the trade plan from the highest-scoring strategies |
| **News AI** | Realtime macro feed, impact estimation, news filter |
| **Risk AI** | Position sizing + hard risk limits (veto power) |
| **Execution AI** | Order routing to MT5 (open/close/modify/trailing) |
| **Learning AI** | Reinforcement scoring of every strategy after each trade |
| **Monitor AI** | System health, MT5 link, latency, drawdown watch |

### Self-learning strategies
Each strategy (SMC, ICT, FVG, Liquidity, Order Block, Supply/Demand, EMA, RSI, MACD, Wyckoff) carries a live **Score, Confidence, Win Rate, Profit Factor, Sharpe Ratio and Max Drawdown** that the Learning AI updates automatically.

---

## Pages

Login · Dashboard · AI Headquarters · AI Agents · Research Lab · Meeting Room · Portfolio · Strategy Center · Economic News · Backtesting · Trading History · Settings · System Logs

---

## Project structure

```
xue-trading/
├── frontend/                 # Next.js 15 app
│   └── src/
│       ├── app/              # App Router: (auth) + (dashboard) route groups
│       ├── components/       # layout, dashboard, agents, charts, ui
│       ├── store/            # Zustand trading store
│       ├── hooks/            # useLiveTicker (WS + fallback)
│       ├── lib/              # api client, utils, mock data
│       └── types/            # shared TS types
├── backend/                  # FastAPI app
│   └── app/
│       ├── api/routes/       # auth, agents, market, portfolio, news, strategies
│       ├── core/             # config, security (JWT)
│       ├── models/ schemas/  # SQLAlchemy models + Pydantic schemas
│       ├── services/         # ai_engine, market_data, risk, mt5_bridge
│       ├── websocket/        # connection manager + /ws/market stream
│       └── db/               # async session, base, seed
├── docker-compose.yml
└── README.md
```

## API surface (selected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Issue access + refresh tokens |
| POST | `/api/auth/refresh` | Rotate access token |
| GET | `/api/agents` | Live agent telemetry |
| GET | `/api/agents/decision` | Latest meeting decision + votes |
| GET | `/api/market/candles` | OHLCV series |
| GET | `/api/portfolio` / `/positions` | Account + open trades |
| GET | `/api/strategies` | Ranked strategy scores |
| GET | `/api/news` | Macro news feed |
| WS | `/ws/market` | Realtime price + agent stream |

---

## Autonomous MT5 execution
To connect a real MetaTrader 5 account and let the AI trade on its own, follow
**[docs/MT5_SETUP.md](docs/MT5_SETUP.md)** — it covers the Windows-host
requirement, the two deployment topologies, the `.env` keys, the autonomous
loop, and the control/kill-switch endpoints (`/api/trading/*`). The engine ships
**off** by default (`AUTO_TRADING_ENABLED=false`) and runs a simulated broker on
non-Windows hosts.

## Going to production
1. Set a strong `SECRET_KEY` and rotate refresh tokens on reuse.
2. Replace `create_all` with Alembic migrations.
3. Install `MetaTrader5` on a Windows trading host and set `MT5_LOGIN/PASSWORD/SERVER` (see docs/MT5_SETUP.md).
4. Swap the synthetic `market_data` + `ai_engine` heuristics for your live feed and ML/LLM inference.
5. Put the frontend behind a CDN and the API behind TLS; scope CORS to your domain.

Built as a production-ready foundation — every layer is wired end to end and designed to be extended, not rewritten.
