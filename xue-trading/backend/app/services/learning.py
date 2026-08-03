"""
Learning engine — the real "Learning AI".

Tracks every closed trade against the technique/strategy that produced it and
recomputes a live score, win-rate, profit factor, Sharpe and max drawdown per
strategy. The autotrader picks the next technique weighted by these scores, so
the system genuinely favours what has worked on THIS account over time.

State is persisted to a JSON file so it survives restarts of the worker.
"""
from __future__ import annotations

import json
import os
import random
from dataclasses import dataclass, field, asdict
from statistics import mean, pstdev
from typing import Optional

STATE_FILE = os.environ.get("LEARNING_STATE_FILE", "learning_state.json")

# key, display name, category — the technique universe
SEED = [
    ("smc", "Smart Money Concepts", "SMC", 62),
    ("ict", "ICT (Inner Circle Trader)", "ICT", 60),
    ("fvg", "Fair Value Gap", "ICT", 57),
    ("liquidity", "Liquidity Sweep", "SMC", 58),
    ("orderblock", "Order Block", "SMC", 58),
    ("supplydemand", "Supply & Demand", "SMC", 55),
    ("ema", "EMA Confluence", "Indicator", 50),
    ("rsi", "RSI Divergence", "Indicator", 48),
    ("macd", "MACD Momentum", "Indicator", 47),
    ("wyckoff", "Wyckoff Method", "Volume", 55),
]


@dataclass
class StrategyStat:
    key: str
    name: str
    category: str
    prior_score: float
    trades: int = 0
    wins: int = 0
    gross_profit: float = 0.0
    gross_loss: float = 0.0  # stored as a positive number
    pnls: list = field(default_factory=list)  # capped recent pnl series
    enabled: bool = True

    # ---- derived metrics ---- #
    @property
    def win_rate(self) -> float:
        return round(self.wins / self.trades * 100, 1) if self.trades else 0.0

    @property
    def profit_factor(self) -> float:
        if self.gross_loss <= 0:
            return round(self.gross_profit, 2) if self.gross_profit else 0.0
        return round(self.gross_profit / self.gross_loss, 2)

    @property
    def sharpe(self) -> float:
        if len(self.pnls) < 3:
            return 0.0
        sd = pstdev(self.pnls)
        return round(mean(self.pnls) / sd, 2) if sd else 0.0

    @property
    def max_drawdown(self) -> float:
        if not self.pnls:
            return 0.0
        cum, peak, mdd = 0.0, 0.0, 0.0
        for p in self.pnls:
            cum += p
            peak = max(peak, cum)
            mdd = min(mdd, cum - peak)
        return round(abs(mdd), 2)

    @property
    def score(self) -> float:
        """Blend win-rate + profit factor, shrunk toward the prior by sample size."""
        if self.trades == 0:
            return round(self.prior_score, 1)
        wr = self.win_rate
        pf = min(100.0, self.profit_factor * 40.0)  # pf 2.5 -> 100
        raw = 0.5 * wr + 0.5 * pf
        weight = self.trades / (self.trades + 8)  # trust grows with samples
        blended = self.prior_score * (1 - weight) + raw * weight
        return round(max(1.0, min(99.0, blended)), 1)


class LearningEngine:
    def __init__(self) -> None:
        self.strategies: dict[str, StrategyStat] = {}
        self.current_technique: str = ""
        self.last_update: str = ""
        self._load()

    # ---- persistence ---- #
    def _load(self) -> None:
        raw = {}
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r", encoding="utf-8") as f:
                    raw = json.load(f)
            except Exception:  # noqa: BLE001
                raw = {}
        saved = {s["key"]: s for s in raw.get("strategies", [])}
        for key, name, cat, prior in SEED:
            if key in saved:
                d = saved[key]
                self.strategies[key] = StrategyStat(
                    key=key, name=name, category=cat, prior_score=prior,
                    trades=d.get("trades", 0), wins=d.get("wins", 0),
                    gross_profit=d.get("gross_profit", 0.0), gross_loss=d.get("gross_loss", 0.0),
                    pnls=d.get("pnls", []), enabled=d.get("enabled", True),
                )
            else:
                self.strategies[key] = StrategyStat(key=key, name=name, category=cat, prior_score=prior)
        self.current_technique = raw.get("current_technique", "")
        self.last_update = raw.get("last_update", "")

    def _save(self) -> None:
        data = {
            "current_technique": self.current_technique,
            "last_update": self.last_update,
            "strategies": [
                {
                    "key": s.key, "trades": s.trades, "wins": s.wins,
                    "gross_profit": round(s.gross_profit, 4), "gross_loss": round(s.gross_loss, 4),
                    "pnls": s.pnls[-100:], "enabled": s.enabled,
                }
                for s in self.strategies.values()
            ],
        }
        try:
            with open(STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:  # noqa: BLE001
            pass

    # ---- learning ---- #
    def record_trade(self, key: str, pnl: float, timestamp: str = "") -> None:
        s = self.strategies.get(key)
        if not s:
            return
        s.trades += 1
        if pnl >= 0:
            s.wins += 1
            s.gross_profit += pnl
        else:
            s.gross_loss += abs(pnl)
        s.pnls.append(round(pnl, 4))
        s.pnls = s.pnls[-100:]
        self.last_update = timestamp
        self._save()

    def pick_technique(self) -> str:
        """Weighted choice by score among enabled strategies (exploration + exploitation)."""
        pool = [s for s in self.strategies.values() if s.enabled]
        if not pool:
            pool = list(self.strategies.values())
        weights = [max(1.0, s.score) for s in pool]
        chosen = random.choices(pool, weights=weights, k=1)[0]
        self.current_technique = chosen.key
        self._save()
        return chosen.key

    def name_of(self, key: str) -> str:
        s = self.strategies.get(key)
        return s.name if s else key

    def snapshot(self) -> list[dict]:
        rows = []
        for s in self.strategies.values():
            rows.append({
                "key": s.key, "name": s.name, "category": s.category,
                "score": s.score, "confidence": round(min(99.0, s.score + 2), 1),
                "win_rate": s.win_rate, "profit_factor": s.profit_factor,
                "sharpe": s.sharpe, "max_drawdown": s.max_drawdown,
                "trades": s.trades, "enabled": s.enabled,
            })
        return sorted(rows, key=lambda r: r["score"], reverse=True)


learning = LearningEngine()
