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
from app.services.techniques import analyze, market_context
from app.core.config import settings
from app.services.mt5_client import client
from app.services import committee

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
    # 260 M15 candles so EMA200 and swing/structure lookbacks are well-formed.
    candles = get_candles(symbol, "M15", 260)

    # Read the current market context FIRST (trend / session / volatility) so the
    # brain can rank techniques by how well each performs in THIS context — not by
    # a single global score. contextual_score() safely degrades to the overall
    # score until a context has enough real trades (overfit guard).
    ctx = market_context(candles)

    # Check EVERY enabled technique on the real candles; trade the technique that
    # currently has a valid setup AND the best learned score for this context.
    # This trades far more often and accumulates real results faster, while
    # staying signal-driven and context-aware.
    candidates = []  # (key, signal, contextual_score)
    for key, strat in learning.strategies.items():
        if not strat.enabled:
            continue
        s = analyze(key, candles)
        if s.get("side"):
            # มติที่ประชุมทบทวนเทคนิค: เทคนิคที่กำลังแพ้ถูกงดเฉพาะสภาพตลาดที่พิสูจน์
            # แล้วว่าแพ้ (ปรับให้ดีขึ้น) — ยังเทรดในสภาพที่เก่ง/สภาพใหม่ได้. lot ไม่เปลี่ยน.
            if not learning.technique_allowed(key, ctx):
                continue
            candidates.append((key, s, learning.contextual_score(key, ctx)))

    if candidates:
        candidates.sort(key=lambda c: c[2], reverse=True)  # best context score first
        technique_key, sig, _ = candidates[0]
    else:
        # nobody has a setup this cycle — watch with the best technique for this context
        top_key = max(
            learning.strategies.keys(),
            key=lambda k: learning.contextual_score(k, ctx),
        )
        technique_key = top_key
        sig = {"side": None, "reason": "no setup on any technique", "strength": 0.0}

    learning.note_technique(technique_key)
    technique_name = learning.name_of(technique_key)
    signal_side = sig.get("side")
    strength = float(sig.get("strength") or 0.0)
    n_setups = len(candidates)

    # ---- Investment Committee: institutional quality gate over the signal ----
    # A technique proposed `signal_side`; the committee runs a 12-step review and
    # can VETO it (NO TRADE). Capital preservation first. Toggle via COMMITTEE_ENABLED.
    scorecard: dict = {}
    committee_veto = False
    if signal_side is not None and getattr(settings, "COMMITTEE_ENABLED", True):
        try:
            acct = client.account()
            bid, ask = client.tick(symbol)
            scorecard = committee.review(
                symbol=symbol, side=signal_side, technique_name=technique_name, m15=candles,
                account_balance=float(getattr(acct, "balance", 0.0) or 0.0),
                account_equity=float(getattr(acct, "equity", 0.0) or 0.0),
                spread=abs(ask - bid), sl_points=settings.SL_POINTS, tp_points=settings.TP_POINTS,
            )
            committee_veto = scorecard.get("recommendation") == "NO TRADE"
        except Exception as exc:  # noqa: BLE001 — fail SAFE (no trade) on any error
            scorecard = {"recommendation": "NO TRADE", "summary": f"committee error: {exc}", "total": 0}
            committee_veto = True

    votes: dict[str, str] = {}
    if signal_side is None or committee_veto:
        for _, _n, role, _t in AGENT_DEFS:
            votes[role] = "WAIT"
        decision = "WAIT"
        approved = len(votes)
        if committee_veto:
            confidence = int(scorecard.get("total", 40) or 40)
            rationale = "คณะกรรมการลงทุน: NO TRADE — " + scorecard.get("summary", "คุณภาพต่ำกว่าเกณฑ์")
        else:
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
        # committee's institutional score IS the confidence when it ran
        confidence = int(scorecard.get("total") or min(99, round(58 + strength * 30 + agreement * 12)))
        rationale = (
            f"คณะกรรมการอนุมัติ {decision} · {technique_name}: {sig.get('reason')}. "
            f"คะแนนรวม {scorecard.get('total', '—')}/100 · {approved}/{len(votes)} agents aligned."
        )

    return DecisionOut(
        symbol=symbol, decision=decision, confidence=confidence, votes=votes,
        approved=approved, total=len(votes), rationale=rationale,
        technique=technique_key, technique_name=technique_name,
        context={**ctx, "strength": round(strength, 3), "n_setups": n_setups,
                 "committee": scorecard},
        scorecard=scorecard,
    )
