# Connecting XUE Trading to MetaTrader 5 (autonomous execution)

This guide wires the platform to a **real** MT5 account so the AI company opens,
manages and closes trades on its own.

> ⚠️ **Read this first.** Autonomous trading places real orders with no
> confirmation. Start on a **demo account** and keep it there until you have
> watched the engine run for days and are happy with its behaviour. The master
> switch `AUTO_TRADING_ENABLED` is **off** by default, and live accounts refuse
> to arm unless you explicitly opt in.

---

## 1. The one constraint that dictates the whole design

The official `MetaTrader5` Python package is **Windows-only** and talks to a
**locally installed, logged-in MT5 terminal** on the same machine. It cannot run
inside the Linux/Docker backend. So the component that actually sends orders must
live on Windows — in practice a **Windows VPS** left running 24/7.

You have two supported topologies:

```
TOPOLOGY A — all-in-one (simplest)
┌────────────────────── Windows VPS ──────────────────────┐
│  MT5 terminal (logged in)                                │
│  XUE backend (FastAPI)  ── MetaTrader5 API ──► terminal  │
│  ▲ dashboard/API on :8000                                │
└──────────────────────────────────────────────────────────┘

TOPOLOGY B — split (keep your Linux/Docker API, add a Windows worker)
┌── Linux / Docker ──┐        ┌──────── Windows VPS ────────┐
│ XUE backend + UI   │        │ MT5 terminal (logged in)     │
│ Postgres           │        │ XUE worker (python -m app.   │
│ (simulated broker) │        │ worker) ── MetaTrader5 ──►    │
└────────────────────┘        └──────────────────────────────┘
```

Both use the **same codebase**. The executor (`services/mt5_client.py`)
auto-detects: on Windows with the library present it trades live; anywhere else
it runs a clearly-labelled **simulated broker** so you can develop on Linux.

---

## 2. Prepare the Windows host

1. Install the **MetaTrader 5 terminal** from your broker and log into the
   account (demo first). Leave it running.
2. In the terminal: **Tools → Options → Expert Advisors → Allow algorithmic
   trading** must be enabled.
3. Install Python 3.11+ and the deps:
   ```bat
   pip install -r requirements.txt
   pip install MetaTrader5
   ```
   (`MetaTrader5` is commented out in `requirements.txt` because it only
   installs on Windows.)

## 3. Configure `.env`

```env
MT5_LOGIN=51234567
MT5_PASSWORD=your-mt5-password
MT5_SERVER=MetaQuotes-Demo
MT5_PATH=                 # usually blank; set if you run multiple terminals
MT5_ACCOUNT_TYPE=demo     # keep demo until you're confident
SYMBOL=XAUUSD

AUTO_TRADING_ENABLED=false   # flip to true only when you're ready
MIN_CONFIDENCE=70
RISK_PER_TRADE=5.0
DAILY_LOSS_LIMIT=8.0
MAX_EXPOSURE_LOTS=1.0
```

## 4. Run it

**Topology A** (backend on Windows):
```bat
set AUTO_TRADING_ENABLED=true
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
The engine arms on startup and starts holding meetings.

**Topology B** (worker on Windows, API elsewhere):
```bat
python -m app.worker
```
The worker connects to MT5, arms the engine, and runs the meeting +
management loops with no web server. `Ctrl+C` stops it cleanly
(`python -m app.worker --flatten` also closes open trades on exit).

---

## 3b. Verify the connection quickly

```python
import MetaTrader5 as mt5
mt5.initialize(login=51234567, password="...", server="MetaQuotes-Demo")
print(mt5.account_info())
print(mt5.symbol_info_tick("XAUUSD"))
mt5.shutdown()
```
If `account_info()` prints your balance, the platform will connect too.

---

## 5. How a trade happens (the autonomous loop)

```
every MEETING_INTERVAL_SEC (default 15m):
  1. run_meeting()          → 8 agents vote → decision + confidence
  2. gate: confidence ≥ MIN_CONFIDENCE?  open trades < MAX_OPEN_TRADES?  not halted?
  3. RiskManager.evaluate() → drawdown / daily-loss / exposure checks + lot sizing
  4. mt5_client.open_order() with magic=MT5_MAGIC, SL & TP attached

every MANAGE_INTERVAL_SEC (default 5s):
  • trail stops once a position is TRAILING_START in profit
  • trip the daily-loss breaker → halt new trades
```

Risk AI runs **after** consensus and can veto or downsize any trade — agents
cannot override the hard limits.

## 6. Control from the dashboard / API

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/trading/status` | engine + MT5 snapshot (poll this) |
| GET | `/api/trading/account` | live balance / equity / margin |
| GET | `/api/trading/positions` | open positions (magic-filtered) |
| POST | `/api/trading/start` | arm the engine (auth required) |
| POST | `/api/trading/stop?flatten=true` | disarm (optionally close all) |
| POST | `/api/trading/panic` | **kill-switch**: stop + flatten now |
| POST | `/api/trading/order/close/{ticket}` | close one position |

## 7. Going live (checklist)

1. Run on **demo** for days; review `trades_today`, drawdown, the trailing behaviour.
2. Tune `RISK_PER_TRADE`, `SL_POINTS`, `TP_POINTS`, `MIN_CONFIDENCE`.
3. Replace the heuristic signal in `services/ai_engine.py` with your real
   model — the `open_order` interface stays identical.
4. Only then: set `MT5_ACCOUNT_TYPE=live` **and** `AUTO_TRADING_ENABLED=true`,
   start with the smallest `MAX_EXPOSURE_LOTS`, and keep the panic endpoint handy.

> Trading leveraged gold is high-risk. This software can lose money quickly when
> misconfigured. Size positions you can afford to lose and supervise the engine.
