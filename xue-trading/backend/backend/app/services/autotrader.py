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
import threading
from dataclasses import dataclass, field
from datetime import date, datetime

from app.core.config import settings
from app.services.ai_engine import run_meeting
from app.services.learning import learning
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
    last_technique: str = ""
    last_technique_name: str = ""
    last_decision_full: dict = field(default_factory=dict)
    last_action: str = ""          # ผลของรอบล่าสุด: ทำไมออก/ไม่ออกออเดอร์
    last_action_at: str = ""       # เวลาที่บอทประเมินรอบล่าสุด (HH:MM:SS)
    advisor_text: str = ""         # ความเห็นล่าสุดของที่ปรึกษา AI (LLM)
    advisor_spend_today: float = 0.0   # ใช้งบ API ที่ปรึกษาไปแล้ววันนี้ ($)
    last_advisor_epoch: float = 0.0    # เวลาที่เรียกที่ปรึกษาล่าสุด (คุมความถี่)
    trades_today: int = 0
    realized_pnl_today: float = 0.0
    day: date = field(default_factory=date.today)
    halted_reason: str = ""
    last_meeting_date: str = ""    # วันที่จัดประชุมใหญ่ 4 ทุ่มล่าสุด (กันประชุมซ้ำ)


class AutoTrader:
    def __init__(self) -> None:
        self.state = EngineState()
        self.risk = RiskManager()
        self._tasks: list[asyncio.Task] = []
        self._symbol = settings.SYMBOL
        # ticket -> {"tech": key, "pnl": last_known_pnl}
        self._open_trades: dict[int, dict] = {}

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
        # Monitor AI — บันทึกการเริ่มระบบ (นับ restart + uptime) และสถานะ MT5 ตอนอาร์ม
        try:
            mt5_ok = bool(getattr(client, "connected", True))
            learning.record_agent("monitor", "start", correct=mt5_ok,
                                  value=datetime.now().timestamp(),
                                  detail=("mt5_ok" if mt5_ok else "mt5_down"),
                                  timestamp=str(date.today()))
        except Exception:  # noqa: BLE001
            pass
        self._notify(
            f"✅ <b>XUE Trading เชื่อมต่อ Telegram แล้ว</b>\nบอทเริ่มทำงาน · {self._symbol} · เช็คทุกรอบประชุม\n"
            "จะแจ้งเตือนทุกครั้งที่เปิด/ปิดออเดอร์"
        )
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
                self._reconcile_closed()
                self._manage_positions()
                self._check_daily_breaker()
                self._maybe_boardroom()
                await asyncio.sleep(settings.MANAGE_INTERVAL_SEC)
        except asyncio.CancelledError:
            pass
        except Exception:  # noqa: BLE001
            log.exception("manage_loop crashed")

    def _maybe_boardroom(self) -> None:
        """ประชุมใหญ่ 4 ทุ่ม — จันทร์-ศุกร์เท่านั้น, วันละครั้ง, รันในเธรดแยก (ไม่บล็อกลูปเทรด)."""
        if not getattr(settings, "BOARDROOM_ENABLED", True):
            return
        try:
            from datetime import timedelta, timezone
            local = datetime.now(timezone.utc) + timedelta(hours=int(settings.BOARDROOM_TZ_OFFSET))
            if local.weekday() >= 5:            # เสาร์(5)/อาทิตย์(6) ไม่ประชุม
                return
            if local.hour < int(settings.BOARDROOM_HOUR):
                return                          # ยังไม่ถึงเวลา
            today = local.strftime("%Y-%m-%d")
            if self.state.last_meeting_date == today:
                return                          # ประชุมไปแล้ววันนี้
            if getattr(self, "_boardroom_busy", False):
                return
            self.state.last_meeting_date = today
            self._boardroom_busy = True

            def _job():
                try:
                    from app.services import boardroom
                    boardroom.run(self._symbol)
                    log.info("Boardroom meeting held for %s", today)
                except Exception as exc:  # noqa: BLE001
                    log.warning("boardroom failed: %s", exc)
                finally:
                    self._boardroom_busy = False

            threading.Thread(target=_job, daemon=True, name="boardroom").start()
        except Exception as exc:  # noqa: BLE001 — scheduler must never break management loop
            log.warning("boardroom scheduler error: %s", exc)

    # ---- one decision cycle ---------------------------------------------- #
    async def _run_cycle(self) -> None:
        self._roll_day()
        decision = run_meeting(self._symbol)
        self.state.last_decision = decision.decision
        self.state.last_confidence = decision.confidence
        self.state.last_reason = decision.rationale
        self.state.last_technique = decision.technique
        self.state.last_technique_name = decision.technique_name
        self.state.last_decision_full = decision.model_dump()
        self.state.last_action_at = datetime.now().strftime("%H:%M:%S")
        log.info(
            "MEETING → decision=%s | technique=%s | confidence=%.0f%%",
            decision.decision, decision.technique_name, decision.confidence,
        )
        self._maybe_advise(decision)  # optional LLM second opinion (advisory only)
        await self._broadcast("meeting", decision.model_dump())

        if self.state.halted_reason:
            self.state.last_action = f"หยุดชั่วคราว: {self.state.halted_reason}"
            log.warning("Cycle skipped — halted: %s", self.state.halted_reason)
            return
        if decision.decision not in ("BUY", "SELL"):
            sc = decision.scorecard or {}
            if sc.get("recommendation") == "NO TRADE":
                self.state.last_action = f"คณะกรรมการไม่อนุมัติ (NO TRADE · {sc.get('total', '—')}/100)"
            else:
                self.state.last_action = "ไม่มีเทคนิคเข้าเงื่อนไขรอบนี้ (ยังไม่มีสัญญาณให้คณะกรรมการตรวจ)"
            return
        if decision.confidence < settings.MIN_CONFIDENCE:
            self.state.last_action = f"ความมั่นใจ {decision.confidence:.0f}% < เกณฑ์ {settings.MIN_CONFIDENCE:.0f}%"
            log.info("Skip: confidence %.0f < %.0f", decision.confidence, settings.MIN_CONFIDENCE)
            return
        if len(client.positions(self._symbol)) >= settings.MAX_OPEN_TRADES:
            self.state.last_action = "ไม้เปิดครบเพดานแล้ว — รอปิดก่อน"
            log.info("Skip: max open trades reached")
            return

        # News AI gate — stand aside ±15 min around high-impact releases (fail-open)
        try:
            from app.services.news_data import high_impact_now

            gated, ev = high_impact_now(15)
            if gated:
                log.info("News gate: high-impact %s imminent — standing aside", ev)
                self.state.last_reason = f"News AI: {ev} imminent — standing aside"
                self.state.last_action = f"เลี่ยงข่าวแรง: {ev}"
                return
        except Exception:  # noqa: BLE001
            pass

        await self._execute(decision.decision, decision.technique, decision.context)

    async def _execute(self, side: str, technique: str = "", context: dict | None = None) -> None:
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
            self.state.last_action = f"Risk AI veto: {rd.reason}"
            log.info("Risk veto: %s", rd.reason)
            await self._broadcast("risk", {"approved": False, "reason": rd.reason})
            return

        # ขนาดไม้คงที่ตาม Risk Manager เสมอ — ไม่ลดตามการแพ้. การจัดการ "ความผิดพลาด"
        # ทำผ่านการประชุมทบทวนเทคนิค (คัด/จำกัดเทคนิคที่แพ้) ไม่ใช่ลดขนาดไม้.
        lots = rd.lots
        comment = f"XUE-{technique}"[:28] if technique else "XUE-AI"
        result = client.open_order(self._symbol, side, lots, round(sl, 2), round(tp, 2), comment=comment)

        # Execution AI — วัด 'คุณภาพการยิงคำสั่ง': สำเร็จไหม + slippage (ราคาสั่ง vs ราคาได้)
        try:
            adverse = None
            if result.ok and result.price:
                adverse = (result.price - price) if side == "BUY" else (price - result.price)
            learning.record_agent("execution", "fill", correct=bool(result.ok),
                                  value=(round(adverse, 3) if adverse is not None else None),
                                  detail=f"{side} {lots}", timestamp=str(date.today()))
        except Exception:  # noqa: BLE001 — logging must never block trading
            pass

        if not result.ok:
            self.state.last_action = f"ส่งออเดอร์ไม่สำเร็จ: {result.comment}"
        if result.ok:
            self.state.last_action = f"✅ ส่งออเดอร์แล้ว: {side} {lots} lot @ {result.price}"
            self.state.trades_today += 1
            trade_ctx = dict(context or {})
            trade_ctx.update({
                "side": side, "entry": round(result.price, 2), "sl": round(sl, 2),
                "tp": round(tp, 2), "lots": lots,
            })
            self._open_trades[result.ticket] = {"tech": technique, "pnl": 0.0, "context": trade_ctx}
            self._notify(
                f"🟢 <b>เปิดออเดอร์ {side}</b>\n{self._symbol} · {lots} lot @ {result.price}\n"
                f"SL {round(sl, 2)} · TP {round(tp, 2)}\nเทคนิค: {technique or 'AI'}"
            )
            log.info(
                "EXECUTED %s %s %.2f lot @ %.2f (ticket %s) via %s",
                side, self._symbol, lots, result.price, result.ticket, technique or "n/a",
            )
            await self._broadcast(
                "order",
                {"side": side, "lots": lots, "price": result.price, "ticket": result.ticket,
                 "sl": sl, "tp": tp, "technique": technique},
            )
        else:
            log.error("Order failed: %s (%s)", result.comment, result.retcode)

    def _reconcile_closed(self) -> None:
        """Detect positions that vanished (TP/SL/close) and feed the result to the Learning AI."""
        live = {p.ticket: p.pnl for p in client.positions(self._symbol)}
        # refresh last-known pnl for still-open trades
        for ticket, meta in self._open_trades.items():
            if ticket in live:
                meta["pnl"] = live[ticket]
        # any tracked ticket no longer live has closed
        for ticket in [t for t in self._open_trades if t not in live]:
            meta = self._open_trades.pop(ticket)
            # exact realized P/L from MT5 history; fall back to last floating value
            realized = client.closed_pnl(ticket)
            pnl = realized if realized is not None else meta.get("pnl", 0.0)
            tech = meta.get("tech", "")
            self.state.realized_pnl_today += pnl
            if tech:
                learning.record_trade(tech, pnl, timestamp=str(date.today()), context=meta.get("context"))
            # Experience Center — จดบทเรียนของไม้นี้ลงสมุดพกถาวร (ไม่ให้พังลูปเทรด)
            try:
                from app.services.experience import experience
                experience.record_close(
                    ticket=ticket, symbol=self._symbol, tech=tech,
                    tech_name=learning.name_of(tech) if tech else "AI",
                    pnl=pnl, ctx=meta.get("context"), timestamp=str(date.today()),
                )
            except Exception as exc:  # noqa: BLE001
                log.warning("experience record failed: %s", exc)
            # Per-agent attribution on the closed outcome (บริษัท AI: ทุกตัววัดผลได้จริง)
            try:
                day = str(date.today())
                win = pnl >= 0
                ctx = meta.get("context") or {}
                cm = ctx.get("committee") or {}
                scores = cm.get("scores") or {}
                # CIO (คณะกรรมการ) — ไม้ที่มันอนุมัติ ถูกไหม
                learning.record_agent("cio", "decision", correct=win, value=round(pnl, 2),
                                      detail=(cm.get("recommendation") or "").upper() or "APPROVE", timestamp=day)
                # Research — เทคนิคที่มันเลือก ถูกไหม (แยกตามเทคนิค)
                if tech:
                    learning.record_agent("research", "pick", correct=win, value=round(pnl, 2),
                                          detail=tech, timestamp=day)
                # Macro — ไม้นี้ใกล้ข่าวไหม (news score ต่ำ = เสี่ยงข่าว) แล้วผลเป็นยังไง
                ns = scores.get("news")
                if ns is not None:
                    learning.record_agent("macro", "news", correct=win, value=float(ns),
                                          detail=("near" if float(ns) < 50 else "away"), timestamp=day)
            except Exception:  # noqa: BLE001 — attribution must never block the loop
                pass
            log.info("CLOSED ticket %s pnl=%.2f technique=%s → learning updated", ticket, pnl, tech or "n/a")
            emoji = "🟢" if pnl >= 0 else "🔴"
            self._notify(
                f"{emoji} <b>ปิดออเดอร์</b> ({learning.name_of(tech) if tech else 'AI'})\n"
                f"กำไร/ขาดทุน: <b>{pnl:+.2f} USD</b>\nรวมวันนี้: {self._realized_today():+.2f} USD"
            )

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
        if loss_pct <= -settings.DAILY_LOSS_LIMIT and not self.state.halted_reason:
            self.state.halted_reason = f"Daily loss limit hit ({loss_pct:.1f}%)"
            self._notify(
                f"⚠️ <b>ขาดทุนถึงเพดานวันนี้ ({loss_pct:.1f}%)</b>\nบอทหยุดเทรดวันนี้แล้ว — จะเริ่มใหม่พรุ่งนี้"
            )

    # ---- helpers ---------------------------------------------------------- #
    def _roll_day(self) -> None:
        if self.state.day != date.today():
            self.state.day = date.today()
            self.state.trades_today = 0
            self.state.realized_pnl_today = 0.0
            self.state.advisor_spend_today = 0.0  # reset AI advisor daily budget
            self.state.halted_reason = ""

    def record_close(self, pnl: float) -> None:
        self.state.realized_pnl_today += pnl

    def _realized_today(self) -> float:
        """MT5's true realized P/L for today; fall back to the session counter."""
        try:
            rt = client.realized_today()
        except Exception:  # noqa: BLE001
            rt = None
        return rt if rt is not None else round(self.state.realized_pnl_today, 2)

    def _notify(self, text: str) -> None:
        """Fire a Telegram alert in the background — never blocks trading, never raises."""
        if not getattr(settings, "NOTIFY_ENABLED", True):
            return
        try:
            from app.services import notifier
            if notifier.available():
                threading.Thread(target=notifier.send, args=(text,), daemon=True).start()
        except Exception:  # noqa: BLE001
            pass

    def _maybe_advise(self, decision) -> None:
        """Ask the LLM advisor for a plain-Thai second opinion — ADVISORY ONLY, and
        strictly budget-capped. Skips silently if disabled / no key / over budget."""
        sc = decision.scorecard or {}
        if not sc.get("recommendation"):
            return  # committee didn't evaluate (no signal) — nothing to discuss
        if not getattr(settings, "ADVISOR_ENABLED", True):
            return
        try:
            from app.services import advisor
            if not advisor.available():
                return
            cap = float(getattr(settings, "ADVISOR_DAILY_USD_CAP", 0.15))
            if self.state.advisor_spend_today >= cap:
                self.state.advisor_text = "(งบที่ปรึกษา AI วันนี้หมดแล้ว — รีเซ็ตพรุ่งนี้)"
                return
            now = datetime.now().timestamp()
            gap = float(getattr(settings, "ADVISOR_MIN_GAP_SEC", 1800))
            is_trade = decision.decision in ("BUY", "SELL")
            if not is_trade and (now - self.state.last_advisor_epoch) < gap:
                return  # throttle NO-TRADE chatter; always advise on a real trade
            res = advisor.advise(sc, self._symbol)
            if res.get("text"):
                self.state.advisor_text = res["text"]
            if res.get("ok"):
                self.state.advisor_spend_today += float(res.get("cost", 0.0))
                self.state.last_advisor_epoch = now
        except Exception as exc:  # noqa: BLE001 — advisor must NEVER break trading
            log.warning("advisor failed: %s", exc)

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
            "last_reason": self.state.last_reason,
            "current_technique": self.state.last_technique,
            "current_technique_name": self.state.last_technique_name
            or learning.name_of(learning.current_technique),
            "open_trades": len(self._open_trades),
            "trades_today": self.state.trades_today,
            # Prefer MT5's TRUE realized total for today (survives restarts); fall
            # back to the in-memory counter only if history is unavailable.
            "realized_pnl_today": self._realized_today(),
            "halted_reason": self.state.halted_reason,
            # the bot's ACTUAL last decision (real 15-min cycle) + why it acted/skipped
            "scorecard": self.state.last_decision_full.get("scorecard", {}),
            "last_action": self.state.last_action,
            "last_action_at": self.state.last_action_at,
            "advisor_text": self.state.advisor_text,
            "advisor_spend_today": round(self.state.advisor_spend_today, 4),
            "meeting_interval_sec": settings.MEETING_INTERVAL_SEC,
            "mt5": client.status(),
        }

    # ---- CEO AI: real profit/loss oversight ------------------------------- #
    def ceo_report(self) -> dict:
        """Read live account + today's realised P/L and produce a real status call."""
        try:
            acct = client.account()
            bal = float(getattr(acct, "balance", 0.0) or 0.0)
            eq = float(getattr(acct, "equity", 0.0) or 0.0)
        except Exception:  # noqa: BLE001
            bal = eq = 0.0
        realized = self._realized_today()
        dd = max(0.0, (bal - eq) / bal * 100) if bal else 0.0
        today_pct = (realized / bal * 100) if bal else 0.0
        limit = settings.DAILY_LOSS_LIMIT
        if self.state.halted_reason:
            status, msg = "halted", f"Halted: {self.state.halted_reason}"
        elif today_pct <= -limit * 0.6:
            status, msg = "warning", f"Down {today_pct:.1f}% today — nearing daily limit, cut risk"
        elif realized < 0:
            status, msg = "caution", f"Down {realized:.2f} today — watching closely"
        elif realized > 0:
            status, msg = "good", f"Up {realized:.2f} ({today_pct:+.2f}%) today — on track"
        else:
            status, msg = "idle", "Flat today — waiting for quality setups"
        return {
            "status": status, "message": msg,
            "today_pnl": round(realized, 2), "today_pct": round(today_pct, 2),
            "drawdown": round(dd, 2), "balance": round(bal, 2), "equity": round(eq, 2),
            "trades_today": self.state.trades_today,
        }

    # ---- Research AI: real market read ------------------------------------ #
    def research_report(self) -> dict:
        d = self.state.last_decision_full
        ctx = (d.get("context") or {}) if d else {}
        trend = ctx.get("trend", "—")
        session = ctx.get("session", "—")
        vol = ctx.get("volatility_pct", 0)
        n = ctx.get("n_setups", 0)
        tech = d.get("technique_name", "—") if d else "—"
        msg = f"Trend {trend} · {session} · vol {vol}% · {n} setup(s); leading {tech}"
        return {"status": "analyzing", "message": msg, "context": ctx}

    # ---- Strategy AI: real trade plan ------------------------------------- #
    def strategy_report(self) -> dict:
        d = self.state.last_decision_full
        if not d:
            return {"status": "idle", "message": "Awaiting first analysis"}
        dec = d.get("decision", "WAIT")
        tech = d.get("technique_name", "—")
        conf = d.get("confidence", 0)
        appr, tot = d.get("approved", 0), d.get("total", 0)
        if dec in ("BUY", "SELL"):
            msg = f"Plan: {dec} {tech} · {conf:.0f}% conf · {appr}/{tot} agents aligned"
        else:
            msg = f"No valid setup — watching {tech}"
        return {"status": "planning", "message": msg}

    # ---- Monitor AI: real system health ----------------------------------- #
    def monitor_report(self) -> dict:
        connected = bool(getattr(client, "connected", False))
        open_n = len(self._open_trades)
        if not connected:
            status, msg = "error", "MT5 disconnected — no live link!"
        elif self.state.halted_reason:
            status, msg = "warning", f"Engine halted: {self.state.halted_reason}"
        elif not self.state.running:
            status, msg = "idle", "Engine not running"
        else:
            status, msg = "ok", f"Systems nominal · MT5 linked · {open_n} open trade(s)"
        return {"status": status, "message": msg,
                "mt5_connected": connected, "open_trades": open_n,
                "running": self.state.running}


autotrader = AutoTrader()
