"""
Autonomous trading engine.

Two concurrent loops:
  1. meeting_loop  — every MEETING_INTERVAL_SEC: run the 8-agent meeting,
     apply the risk gate, and open a trade if consensus + risk allow.
  2. manage_loop   — every MANAGE_INTERVAL_SEC: trail stops and enforce the
     daily-loss kill-switch on open positions.

Safety by design:
  * Master switch AUTO_TRADING_ENABLED defaults to False.
  * Live accounts require MT5_ACCOUNT_TYPE="live" AND explicit start(); otherwise
    the engine refuses to arm.
  * Risk AI (RiskManager) sizing + hard limits run before every order and cannot
    be overridden by agent consensus.
  * A daily realized-loss breaker halts new trades and flattens on request.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import date

from app.core.config import settings
from app.services.ai_engine import run_meeting
from app.services.mt5_client import client
from app.services.risk import RiskManager
from app.websocket.manager import manager

log = logging.getLogger("xue.autotrader")


@dataclass
class EngineState:
    running: bool = False
    armed: bool = False
    last_decision: str = "—"
    last_confidence: float = 0.0
    last_reason: str = ""
    trades_today: int = 0
    realized_pnl_today: float = 0.0
    day: date = field(default_factory=date.today)
    halted_reason: str = ""


class AutoTrader:
    def __init__(self) -> None:
        self.state = EngineState()
        self.risk = RiskManager()
        self._tasks: list[asyncio.Task] = []
        self._symbol = settings.SYMBOL

    # ---- control ---------------------------------------------------------- #
    def _can_arm(self) -> tuple[bool, str]:
        if settings.MT5_ACCOUNT_TYPE.lower() == "live" and not settings.AUTO_TRADING_ENABLED:
            return False, "Live account requires AUTO_TRADING_ENABLED=true (explicit opt-in)."
        if not client.connected:
            return False, "MT5 client not connected."
        return True, ""

    async def start(self) -> dict:
        if self.state.running:
            return {"ok": True, "message": "already running", **self.snapshot()}
        ok, reason = self._can_arm()
        if not ok:
            self.state.halted_reason = reason
            return {"ok": False, "message": reason, **self.snapshot()}

        self.state.running = True
        self.state.armed = True
        self.state.halted_reason = ""
        self._tasks = [
            asyncio.create_task(self._meeting_loop(), name="meeting_loop"),
            asyncio.create_task(self._manage_loop(), name="manage_loop"),
        ]
        log.info("AutoTrader started (%s account, symbol=%s)", settings.MT5_ACCOUNT_TYPE, self._symbol)
        await self._broadcast("engine", {"running": True})
        return {"ok": True, "message": "autotrader started", **self.snapshot()}

    async def stop(self, flatten: bool = False) -> dict:
        self.state.running = False
        self.state.armed = False
        for t in self._tasks:
            t.cancel()
        self._tasks = []
        closed = 0
        if flatten:
            for p in client.positions(self._symbol):
                if client.close_position(p.ticket).ok:
                    closed += 1
        log.info("AutoTrader stopped (flatten=%s, closed=%s)", flatten, closed)
        await self._broadcast("engine", {"running": False})
        return {"ok": True, "message": f"stopped (closed {closed})", **self.snapshot()}

    # ---- loops ------------------------------------------------------------ #
    async def _meeting_loop(self) -> None:
        try:
            while self.state.running:
                await self._run_cycle()
                await asyncio.sleep(settings.MEETING_INTERVAL_SEC)
        except asyncio.CancelledError:  # graceful shutdown
            pass
        except Exception:  # noqa: BLE001
            log.exception("meeting_loop crashed")

    async def _manage_loop(self) -> None:
        try:
            while self.state.running:
                self._manage_positions()
                self._check_daily_breaker()
                await asyncio.sleep(settings.MANAGE_INTERVAL_SEC)
        except asyncio.CancelledError:
            pass
        except Exception:  # noqa: BLE001
            log.exception("manage_loop crashed")

    # ---- one decision cycle ---------------------------------------------- #
    async def _run_cycle(self) -> None:
        self._roll_day()
        decision = run_meeting(self._symbol)
        self.state.last_decision = decision.decision
        self.state.last_confidence = decision.confidence
        self.state.last_reason = decision.rationale
        await self._broadcast("meeting", decision.model_dump())

        if self.state.halted_reason:
            log.warning("Cycle skipped — halted: %s", self.state.halted_reason)
            return
        if decision.decision not in ("BUY", "SELL"):
            return
        if decision.confidence < settings.MIN_CONFIDENCE:
            log.info("Skip: confidence %.0f < %.0f", decision.confidence, settings.MIN_CONFIDENCE)
            return
        if len(client.positions(self._symbol)) >= settings.MAX_OPEN_TRADES:
            log.info("Skip: max open trades reached")
            return

        await self._execute(decision.decision)

    async def _execute(self, side: str) -> None:
        acct = client.account()
        bid, ask = client.tick(self._symbol)
        price = ask if side == "BUY" else bid
        sl = price - settings.SL_POINTS if side == "BUY" else price + settings.SL_POINTS
        tp = price + settings.TP_POINTS if side == "BUY" else price - settings.TP_POINTS

        # Risk gate — hard limits + position sizing (Risk AI has veto)
        rd = self.risk.evaluate(
            balance=acct.balance,
            entry=price,
            sl=sl,
            current_drawdown=max(0.0, (acct.balance - acct.equity) / acct.balance * 100 if acct.balance else 0.0),
            today_pnl_pct=(self.state.realized_pnl_today / acct.balance * 100) if acct.balance else 0.0,
            open_exposure=client.exposure(self._symbol),
        )
        if not rd.approved:
            log.info("Risk veto: %s", rd.reason)
            await self._broadcast("risk", {"approved": False, "reason": rd.reason})
            return

        result = client.open_order(self._symbol, side, rd.lots, round(sl, 2), round(tp, 2))
        if result.ok:
            self.state.trades_today += 1
            log.info("EXECUTED %s %s %.2f lot @ %.2f (ticket %s)", side, self._symbol, rd.lots, result.price, result.ticket)
            await self._broadcast(
                "order",
                {"side": side, "lots": rd.lots, "price": result.price, "ticket": result.ticket, "sl": sl, "tp": tp},
            )
        else:
            log.error("Order failed: %s (%s)", result.comment, result.retcode)

    # ---- position management --------------------------------------------- #
    def _manage_positions(self) -> None:
        if not settings.TRAILING_ENABLED:
            return
        for p in client.positions(self._symbol):
            if p.side == "BUY":
                profit = p.current - p.entry
                if profit >= settings.TRAILING_START:
                    new_sl = round(p.current - settings.TRAILING_DISTANCE, 2)
                    if new_sl > p.sl:
                        client.modify_sl_tp(p.ticket, sl=new_sl)
            else:
                profit = p.entry - p.current
                if profit >= settings.TRAILING_START:
                    new_sl = round(p.current + settings.TRAILING_DISTANCE, 2)
                    if p.sl == 0 or new_sl < p.sl:
                        client.modify_sl_tp(p.ticket, sl=new_sl)

    def _check_daily_breaker(self) -> None:
        acct = client.account()
        if not acct.balance:
            return
        loss_pct = self.state.realized_pnl_today / acct.balance * 100
        if loss_pct <= -settings.DAILY_LOSS_LIMIT:
            self.state.halted_reason = f"Daily loss limit hit ({loss_pct:.1f}%)"

    # ---- helpers ---------------------------------------------------------- #
    def _roll_day(self) -> None:
        if self.state.day != date.today():
            self.state.day = date.today()
            self.state.trades_today = 0
            self.state.realized_pnl_today = 0.0
            self.state.halted_reason = ""

    def record_close(self, pnl: float) -> None:
        self.state.realized_pnl_today += pnl

    async def _broadcast(self, kind: str, data: dict) -> None:
        try:
            await manager.broadcast({"type": f"autotrader.{kind}", "data": data})
        except Exception:  # noqa: BLE001
            pass

    def snapshot(self) -> dict:
        return {
            "running": self.state.running,
            "armed": self.state.armed,
            "account_type": settings.MT5_ACCOUNT_TYPE,
            "symbol": self._symbol,
            "last_decision": self.state.last_decision,
            "last_confidence": self.state.last_confidence,
            "trades_today": self.state.trades_today,
            "realized_pnl_today": round(self.state.realized_pnl_today, 2),
            "halted_reason": self.state.halted_reason,
            "meeting_interval_sec": settings.MEETING_INTERVAL_SEC,
            "mt5": client.status(),
        }


autotrader = AutoTrader()
