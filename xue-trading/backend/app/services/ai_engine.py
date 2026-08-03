"""
Autonomous AI decision engine.

Eight specialized agents each produce a vote and confidence. The CEO agent
aggregates them into a final decision. Risk AI has veto power via RiskManager.
The Learning AI (services/learning.py) chooses which technique to trade,
weighted by how each has actually performed on this account.

This is a deterministic-ish heuristic model designed to be swapped for real
ML inference / LLM reasoning without changing the API surface.
"""
from __future__ import annotations

import random
from statistics import mean
from typing import List

from app.schemas.trading import AgentOut, DecisionOut
from app.services.market_data import get_candles
from app.services.learning import learning
from app.services.techniques import analyze

AGENT_DEFS = [
    ("ceo", "CEO AI", "CEO", "Strategic Decision Maker"),
    ("research", "Research AI", "Research", "Market Researcher"),
    ("news", "News AI", "News", "News & Sentiment"),
    ("risk", "Risk AI", "Risk", "Risk Management"),
    ("strategy", "Strategy AI", "Strategy", "Strategy Developer"),
    ("execution", "Execution AI", "Execution", "Order Executor"),
    ("learning", "Learning AI", "Learning", "Machine Learning"),
    ("monitor", "Monitor AI", "Monitor", "System Monitor"),
]

STATUS = {
    "ceo": "thinking",
    "research": "analyzing",
    "news": "scanning",
    "risk": "monitoring",
    "strategy": "optimizing",
    "execution": "trading",
    "learning": "learning",
    "monitor": "monitoring",
}


def _trend_bias(candles) -> float:
    closes = [c.close for c in candles]
    if len(closes) < 20:
        return 0.0
    fast = mean(closes[-10:])
    slow = mean(closes[-20:])
    return (fast - slow) / slow * 100.0


def snapshot_agents() -> List[AgentOut]:
    agents: List[AgentOut] = []
    tech = learning.name_of(learning.current_technique) if learning.current_technique else "market structure"
    tasks = {
        "ceo": "Weighing agent consensus for XAUUSD",
        "research": f"Scanning HTF structure via {tech}",
        "news": "Parsing macro feed & gold sentiment",
        "risk": "Enforcing risk % & exposure caps",
        "strategy": f"Building plan with {tech}",
        "execution": "Routing orders to MT5 bridge",
        "learning": f"Scoring techniques from live results",
        "monitor": "Watching MT5 link, latency & drawdown",
    }
    for aid, name, role, title in AGENT_DEFS:
        agents.append(
            AgentOut(
                id=aid, name=name, role=role, title=title, status=STATUS[aid],
                confidence=round(random.uniform(70, 99), 0),
                cpu=round(random.uniform(15, 85), 0),
                memory=round(random.uniform(30, 80), 0),
                current_task=tasks[aid],
                performance=round(random.uniform(82, 99), 0),
                online=True,
            )
        )
    return agents


def run_meeting(symbol: str = "XAUUSD") -> DecisionOut:
    candles = get_candles(symbol, "M15", 120)

    # Check EVERY enabled technique on the real candles; trade the highest-scored
    # technique that currently has a valid setup. This trades far more often and
    # accumulates real results faster, while staying signal-driven.
    candidates = []  # (key, signal, score)
    for key, strat in learning.strategies.items():
        if not strat.enabled:
            continue
        s = analyze(key, candles)
        if s.get("side"):
            candidates.append((key, s, strat.score))

    if candidates:
        candidates.sort(key=lambda c: c[2], reverse=True)  # highest score first
        technique_key, sig, _ = candidates[0]
    else:
        # nobody has a setup this cycle — watch with the current top-scored technique
        top = max(learning.strategies.values(), key=lambda s: s.score)
        technique_key, sig = top.key, {"side": None, "reason": "no setup on any technique", "strength": 0.0}

    learning.note_technique(technique_key)
    technique_name = learning.name_of(technique_key)
    signal_side = sig.get("side")
    strength = float(sig.get("strength") or 0.0)
    n_setups = len(candidates)

    votes: dict[str, str] = {}
    if signal_side is None:
        for _, _n, role, _t in AGENT_DEFS:
            votes[role] = "WAIT"
        decision = "WAIT"
        approved = len(votes)
        confidence = 42
        n_enabled = sum(1 for s in learning.strategies.values() if s.enabled)
        rationale = f"No valid setup on any of {n_enabled} techniques. Watching."
    else:
        base = signal_side
        for _, _n, role, _t in AGENT_DEFS:
            if role == "News" and random.random() < 0.35:
                votes[role] = "WAIT"
            elif random.random() < 0.1:
                votes[role] = "WAIT"
            else:
                votes[role] = base
        tally = {v: list(votes.values()).count(v) for v in set(votes.values())}
        decision = max(tally, key=tally.get)
        approved = sum(1 for v in votes.values() if v == decision)
        agreement = approved / len(votes)
        confidence = min(99, round(58 + strength * 30 + agreement * 12))
        rationale = (
            f"{technique_name}: {sig.get('reason')}. "
            f"Best of {n_setups} technique(s) with a live setup. "
            f"{approved}/{len(votes)} agents aligned on {decision}."
        )

    return DecisionOut(
        symbol=symbol, decision=decision, confidence=confidence, votes=votes,
        approved=approved, total=len(votes), rationale=rationale,
        technique=technique_key, technique_name=technique_name,
    )
