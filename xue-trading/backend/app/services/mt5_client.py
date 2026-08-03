"""
Real MetaTrader 5 client.

`MetaTrader5` is Windows-only and must run on the SAME machine as an installed,
logged-in MT5 terminal. This module therefore imports it lazily and degrades to
a clearly-labelled SIMULATED broker on any host where the package/terminal is
unavailable (e.g. the Linux Docker backend). Run the real path on a Windows VPS
— either as the whole backend, or via `app.worker` (see docs/MT5_SETUP.md).

Nothing here trades on its own; the autotrader (services/autotrader.py) drives it.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from app.core.config import settings

log = logging.getLogger("xue.mt5")

try:  # pragma: no cover - platform dependent
    import MetaTrader5 as mt5  # type: ignore

    _HAS_MT5 = True
except Exception:  # noqa: BLE001
    mt5 = None  # type: ignore
    _HAS_MT5 = False


# --------------------------------------------------------------------------- #
# Data structures
# --------------------------------------------------------------------------- #
@dataclass
class AccountInfo:
    login: int
    balance: float
    equity: float
    margin: float
    margin_free: float
    profit: float
    currency: str
    leverage: int
    server: str


@dataclass
class Position:
    ticket: int
    symbol: str
    side: str  # BUY / SELL
    lots: float
    entry: float
    current: float
    sl: float
    tp: float
    pnl: float
    magic: int
    opened_at: float = field(default_factory=time.time)


@dataclass
class OrderResult:
    ok: bool
    ticket: int = 0
    price: float = 0.0
    retcode: int = 0
    comment: str = ""


# --------------------------------------------------------------------------- #
# Client
# --------------------------------------------------------------------------- #
class MT5Client:
    def __init__(self) -> None:
        self.connected = False
        self.live = _HAS_MT5
        self.magic = settings.MT5_MAGIC
        self.deviation = settings.MT5_DEVIATION
        # simulated broker state
        self._sim_ticket = 500000
        self._sim_positions: dict[int, Position] = {}
        self._sim_balance = 1000.0

    # ---- lifecycle -------------------------------------------------------- #
    def connect(self) -> bool:
        if not _HAS_MT5:
            self.connected = True
            log.warning("MetaTrader5 not available — running SIMULATED broker.")
            return True

        kwargs = {}
        if settings.MT5_PATH:
            kwargs["path"] = settings.MT5_PATH
        if not mt5.initialize(**kwargs):  # type: ignore
            log.error("mt5.initialize failed: %s", mt5.last_error())  # type: ignore
            self.connected = False
            return False

        if settings.MT5_LOGIN:
            authorized = mt5.login(  # type: ignore
                settings.MT5_LOGIN,
                password=settings.MT5_PASSWORD,
                server=settings.MT5_SERVER,
            )
            if not authorized:
                log.error("mt5.login failed: %s", mt5.last_error())  # type: ignore
                self.connected = False
                return False

        self.connected = True
        info = mt5.account_info()  # type: ignore
        log.info("MT5 connected: login=%s server=%s", getattr(info, "login", "?"), settings.MT5_SERVER)
        return True

    def shutdown(self) -> None:
        if _HAS_MT5 and self.connected:  # pragma: no cover
            mt5.shutdown()  # type: ignore
        self.connected = False

    def ensure_symbol(self, symbol: str) -> bool:
        if not _HAS_MT5:
            return True
        info = mt5.symbol_info(symbol)  # type: ignore
        if info is None:
            log.error("Symbol %s not found", symbol)
            return False
        if not info.visible:
            return bool(mt5.symbol_select(symbol, True))  # type: ignore
        return True

    def status(self) -> dict:
        return {
            "connected": self.connected,
            "mode": "live" if _HAS_MT5 else "simulated",
            "server": settings.MT5_SERVER,
            "magic": self.magic,
        }

    # ---- market data ------------------------------------------------------ #
    def tick(self, symbol: str) -> tuple[float, float]:
        """Return (bid, ask)."""
        if _HAS_MT5 and self.connected:  # pragma: no cover
            t = mt5.symbol_info_tick(symbol)  # type: ignore
            return (t.bid, t.ask)
        from app.services.market_data import get_price

        p = get_price(symbol)
        return (round(p - 0.15, 2), round(p + 0.15, 2))

    # ---- account & positions --------------------------------------------- #
    def account(self) -> AccountInfo:
        if _HAS_MT5 and self.connected:  # pragma: no cover
            a = mt5.account_info()  # type: ignore
            return AccountInfo(
                login=a.login, balance=a.balance, equity=a.equity, margin=a.margin,
                margin_free=a.margin_free, profit=a.profit, currency=a.currency,
                leverage=a.leverage, server=a.server,
            )
        floating = sum(p.pnl for p in self._sim_positions.values())
        return AccountInfo(
            login=settings.MT5_LOGIN or 0, balance=round(self._sim_balance, 2),
            equity=round(self._sim_balance + floating, 2), margin=0.0,
            margin_free=round(self._sim_balance + floating, 2), profit=round(floating, 2),
            currency="USD", leverage=100, server=settings.MT5_SERVER,
        )

    def positions(self, symbol: Optional[str] = None) -> list[Position]:
        if _HAS_MT5 and self.connected:  # pragma: no cover
            raw = mt5.positions_get(symbol=symbol) if symbol else mt5.positions_get()  # type: ignore
            out: list[Position] = []
            for p in raw or []:
                if p.magic and p.magic != self.magic:
                    continue
                bid, ask = self.tick(p.symbol)
                cur = bid if p.type == mt5.POSITION_TYPE_BUY else ask  # type: ignore
                out.append(
                    Position(
                        ticket=p.ticket, symbol=p.symbol,
                        side="BUY" if p.type == mt5.POSITION_TYPE_BUY else "SELL",  # type: ignore
                        lots=p.volume, entry=p.price_open, current=cur,
                        sl=p.sl, tp=p.tp, pnl=p.profit, magic=p.magic,
                    )
                )
            return out

        for p in self._sim_positions.values():
            bid, ask = self.tick(p.symbol)
            p.current = bid if p.side == "BUY" else ask
            direction = 1 if p.side == "BUY" else -1
            p.pnl = round((p.current - p.entry) * direction * p.lots * 100, 2)
        vals = list(self._sim_positions.values())
        return [p for p in vals if symbol is None or p.symbol == symbol]

    def exposure(self, symbol: Optional[str] = None) -> float:
        return round(sum(p.lots for p in self.positions(symbol)), 2)

    def closed_pnl(self, ticket: int) -> Optional[float]:
        """Exact realized net profit (profit + swap + commission) of a closed
        position, read from MT5 history. Returns None if unavailable."""
        if _HAS_MT5 and self.connected:  # pragma: no cover
            deals = mt5.history_deals_get(position=ticket)  # type: ignore
            if deals:
                return round(sum(d.profit + d.swap + d.commission for d in deals), 2)
            return None
        return None  # simulated broker → caller falls back to last floating pnl

    # ---- lot sizing ------------------------------------------------------- #
    def calc_lot(self, symbol: str, entry: float, sl: float, risk_pct: float, balance: float) -> float:
        risk_amount = balance * (risk_pct / 100.0)
        stop_dist = abs(entry - sl)
        if stop_dist <= 0:
            return 0.0

        if _HAS_MT5 and self.connected:  # pragma: no cover
            info = mt5.symbol_info(symbol)  # type: ignore
            tick_value = info.trade_tick_value or 1.0
            tick_size = info.trade_tick_size or 0.01
            ticks = stop_dist / tick_size
            lots = risk_amount / (ticks * tick_value) if ticks else 0.0
            step = info.volume_step or 0.01
            lots = max(info.volume_min, min(lots, info.volume_max))
            lots = round(round(lots / step) * step, 2)
            return lots

        # simulated: XAUUSD contract 100 oz, $1 move ≈ $100 / lot
        lots = risk_amount / (stop_dist * 100.0)
        return max(0.01, round(lots, 2))

    # ---- order execution -------------------------------------------------- #
    def _filling(self, symbol: str):  # pragma: no cover
        info = mt5.symbol_info(symbol)  # type: ignore
        mode = info.filling_mode
        if mode & 1:
            return mt5.ORDER_FILLING_FOK  # type: ignore
        if mode & 2:
            return mt5.ORDER_FILLING_IOC  # type: ignore
        return mt5.ORDER_FILLING_RETURN  # type: ignore

    def open_order(
        self, symbol: str, side: str, lots: float, sl: float, tp: float, comment: str = "XUE-AI"
    ) -> OrderResult:
        bid, ask = self.tick(symbol)
        price = ask if side == "BUY" else bid

        if _HAS_MT5 and self.connected:  # pragma: no cover
            self.ensure_symbol(symbol)
            order_type = mt5.ORDER_TYPE_BUY if side == "BUY" else mt5.ORDER_TYPE_SELL  # type: ignore
            request = {
                "action": mt5.TRADE_ACTION_DEAL,  # type: ignore
                "symbol": symbol,
                "volume": float(lots),
                "type": order_type,
                "price": price,
                "sl": float(sl),
                "tp": float(tp),
                "deviation": self.deviation,
                "magic": self.magic,
                "comment": comment,
                "type_time": mt5.ORDER_TIME_GTC,  # type: ignore
                "type_filling": self._filling(symbol),
            }
            result = mt5.order_send(request)  # type: ignore
            if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:  # type: ignore
                rc = getattr(result, "retcode", -1)
                cmt = getattr(result, "comment", "no result")
                log.error("open_order rejected retcode=%s %s", rc, cmt)
                return OrderResult(False, retcode=rc, comment=cmt)
            log.info("OPEN %s %s %s lot @ %.2f ticket=%s", side, symbol, lots, result.price, result.order)
            return OrderResult(True, ticket=result.order, price=result.price, retcode=result.retcode, comment="done")

        # simulated
        self._sim_ticket += 1
        pos = Position(
            ticket=self._sim_ticket, symbol=symbol, side=side, lots=lots,
            entry=price, current=price, sl=sl, tp=tp, pnl=0.0, magic=self.magic,
        )
        self._sim_positions[pos.ticket] = pos
        log.info("[SIM] OPEN %s %s %s lot @ %.2f ticket=%s", side, symbol, lots, price, pos.ticket)
        return OrderResult(True, ticket=pos.ticket, price=price, comment="simulated")

    def close_position(self, ticket: int) -> OrderResult:
        if _HAS_MT5 and self.connected:  # pragma: no cover
            pos = next(iter(mt5.positions_get(ticket=ticket) or []), None)  # type: ignore
            if pos is None:
                return OrderResult(False, comment="position not found")
            bid, ask = self.tick(pos.symbol)
            is_buy = pos.type == mt5.POSITION_TYPE_BUY  # type: ignore
            request = {
                "action": mt5.TRADE_ACTION_DEAL,  # type: ignore
                "symbol": pos.symbol,
                "volume": pos.volume,
                "type": mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY,  # type: ignore
                "position": ticket,
                "price": bid if is_buy else ask,
                "deviation": self.deviation,
                "magic": self.magic,
                "comment": "XUE-AI close",
                "type_time": mt5.ORDER_TIME_GTC,  # type: ignore
                "type_filling": self._filling(pos.symbol),
            }
            result = mt5.order_send(request)  # type: ignore
            ok = result is not None and result.retcode == mt5.TRADE_RETCODE_DONE  # type: ignore
            return OrderResult(ok, ticket=ticket, retcode=getattr(result, "retcode", -1))

        pos = self._sim_positions.pop(ticket, None)
        if pos:
            self._sim_balance += pos.pnl
            return OrderResult(True, ticket=ticket, comment="simulated close")
        return OrderResult(False, comment="not found")

    def modify_sl_tp(self, ticket: int, sl: Optional[float] = None, tp: Optional[float] = None) -> OrderResult:
        if _HAS_MT5 and self.connected:  # pragma: no cover
            pos = next(iter(mt5.positions_get(ticket=ticket) or []), None)  # type: ignore
            if pos is None:
                return OrderResult(False, comment="position not found")
            request = {
                "action": mt5.TRADE_ACTION_SLTP,  # type: ignore
                "symbol": pos.symbol,
                "position": ticket,
                "sl": float(sl if sl is not None else pos.sl),
                "tp": float(tp if tp is not None else pos.tp),
                "magic": self.magic,
            }
            result = mt5.order_send(request)  # type: ignore
            ok = result is not None and result.retcode == mt5.TRADE_RETCODE_DONE  # type: ignore
            return OrderResult(ok, ticket=ticket, retcode=getattr(result, "retcode", -1))

        pos = self._sim_positions.get(ticket)
        if not pos:
            return OrderResult(False, comment="not found")
        if sl is not None:
            pos.sl = sl
        if tp is not None:
            pos.tp = tp
        return OrderResult(True, ticket=ticket, comment="simulated modify")


# Singleton used across the app
client = MT5Client()
