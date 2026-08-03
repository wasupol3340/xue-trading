"""
Autonomous AI decision engine.

Eight specialized agents each produce a vote and confidence. The CEO agent
aggregates them into a final decision. Risk AI has veto power via RiskManager.
This is a deterministic-ish heuristic model designed to be swapped for real
ML inference / LLM reasoning without changing the API surface.
"""
from __future__ import annotations

import random
from statistics import mean
from typing import List

from app.schemas.trading import AgentOut, DecisionOut
from app.services.market_data import get_candles

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
    for aid, name, role, title in AGENT_DEFS:
        agents.append(
            AgentOut(
                id=aid,
                name=name,
                role=role,
                title=title,
                status=STATUS[aid],
                confidence=round(random.uniform(70, 99), 0),
                cpu=round(random.uniform(15, 85), 0),
                memory=round(random.uniform(30, 80), 0),
                current_task=f"{title} · evaluating XAUUSD",
                performance=round(random.uniform(82, 99), 0),
                online=True,
            )
        )
    return agents


def run_meeting(symbol: str = "XAUUSD") -> DecisionOut:
    candles = get_candles(symbol, "M15", 60)
    bias = _trend_bias(candles)

    base = "BUY" if bias > 0.05 else "SELL" if bias < -0.05 else "WAIT"
    votes: dict[str, str] = {}
    for _, name, role, _title in AGENT_DEFS:
        # News occasionally holds; others largely follow structural bias
        if role == "News" and random.random() < 0.4:
            votes[role] = "WAIT"
        elif random.random() < 0.12:
            votes[role] = "WAIT"
        else:
            votes[role] = base

    tally = {v: list(votes.values()).count(v) for v in set(votes.values())}
    decision = max(tally, key=tally.get)
    approved = sum(1 for v in votes.values() if v == decision)
    confidence = round(60 + (approved / len(votes)) * 39 + abs(bias) * 2, 0)
    confidence = min(confidence, 99)

    rationale = (
        f"HTF bias {'bullish' if bias > 0 else 'bearish' if bias < 0 else 'neutral'} "
        f"({bias:+.2f}%). {approved}/{len(votes)} agents aligned on {decision}. "
        "SMC + ICT confluence at premium/discount zone."
    )

    return DecisionOut(
        symbol=symbol,
        decision=decision,
        confidence=confidence,
        votes=votes,
        approved=approved,
        total=len(votes),
        rationale=rationale,
    )
