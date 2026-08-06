"""
Experience Center (ศูนย์ประสบการณ์) — the company's SCHOOL LEDGER.

Every time a trade CLOSES, this department writes a rich, permanent record of what
happened: where it entered, the REAL profit (read per-trade straight from MT5, so it
is not polluted by deposits/withdrawals), the market context at entry, WHICH AI
ordered it, why the committee approved it, and a data-grounded note on WHY it won or
lost. It accumulates forever in the same external DB as the rest of the memory, so it
survives a VPS move.

At the 4-ทุ่ม boardroom it hands the CEO a summary of the day's lessons.

DESIGN NOTES
  * Records HARD FACTS objectively (entry, real pnl, technique, ordering AI, context).
    The "why win/lose" is an honest INFERENCE from those facts (markets are noisy —
    we never claim absolute causation).
  * Every row is keyed by `market` (today always the gold symbol) — the Brain OS seam
    so the very same ledger serves other markets later with zero migration.
  * Writing must NEVER break the trading loop (all wrapped by the caller in try/except).
"""
from __future__ import annotations

import json

from sqlalchemy import Column, Float, Integer, MetaData, String, Table, insert, select

from app.services.learning import learning, _CTX_MIN

_md = MetaData()

exp_t = Table(
    "experience_log", _md,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("ticket", Integer, index=True),
    Column("market", String(24), index=True),      # Brain OS seam (symbol) — future multi-market
    Column("side", String(8)),
    Column("technique", String(32)),
    Column("technique_name", String(64)),
    Column("entry", Float), Column("exit", Float),
    Column("sl", Float), Column("tp", Float), Column("lots", Float),
    Column("pnl", Float),                           # REAL per-trade net (from MT5 history)
    Column("outcome", String(8)),                   # win / loss / be
    Column("trend", String(8)), Column("session", String(12)), Column("vol", String(4)),
    Column("context", String),                      # full JSON fingerprint at entry
    Column("cmt_total", Float), Column("cmt_rec", String(12)),
    Column("ordered_by", String(160)),              # which AI/brain led to this entry
    Column("why", String(400)),                     # data-grounded reason it won/lost
    Column("closed_at", String(32)),
    Column("ts", String(32)),
)


class ExperienceCenter:
    def __init__(self) -> None:
        self.ready = False
        try:
            _md.create_all(learning.engine)           # shares the learning DB
            self.ready = True
        except Exception as exc:  # noqa: BLE001
            print(f"[experience] table init failed: {exc}")

    # ---- write one lesson when a trade closes ---- #
    def record_close(self, ticket: int, symbol: str, tech: str, tech_name: str,
                     pnl: float, ctx: dict | None, timestamp: str = "") -> dict:
        ctx = ctx or {}
        side = ctx.get("side") or ""
        entry = float(ctx.get("entry") or 0.0)
        lots = float(ctx.get("lots") or 0.0)
        trend = ctx.get("trend", "?")
        session = ctx.get("session", "?")
        vol = ctx.get("vol", "?")
        cm = ctx.get("committee") or {}
        cmt_total = cm.get("total")
        cmt_rec = (cm.get("recommendation") or "")

        # estimate exit from the realized move (XAUUSD: pnl ≈ (exit-entry)*dir*lots*100)
        exit_px = 0.0
        if entry and lots:
            direction = 1.0 if side == "BUY" else -1.0
            exit_px = round(entry + (pnl / (lots * 100.0)) * direction, 2)

        outcome = "win" if pnl > 0 else ("loss" if pnl < 0 else "be")
        ordered_by = f"Research เลือก {tech_name or tech or 'AI'}"
        if cmt_total is not None:
            ordered_by += f" · คณะกรรมการ (CIO) อนุมัติ {cmt_total}/100"

        why = self._explain(tech, tech_name, pnl, outcome, trend, session, vol, cmt_total)

        row = {
            "ticket": int(ticket), "market": symbol, "side": side,
            "technique": tech, "technique_name": tech_name,
            "entry": entry, "exit": exit_px,
            "sl": float(ctx.get("sl") or 0.0), "tp": float(ctx.get("tp") or 0.0), "lots": lots,
            "pnl": round(float(pnl), 2), "outcome": outcome,
            "trend": trend, "session": session, "vol": vol,
            "context": json.dumps(ctx, ensure_ascii=False),
            "cmt_total": (float(cmt_total) if cmt_total is not None else None),
            "cmt_rec": cmt_rec, "ordered_by": ordered_by[:160], "why": why[:400],
            "closed_at": timestamp, "ts": timestamp,
        }
        try:
            with learning.engine.begin() as conn:
                conn.execute(insert(exp_t).values(**row))
        except Exception as exc:  # noqa: BLE001
            print(f"[experience] persist failed: {exc}")
        return row

    def _explain(self, tech, tech_name, pnl, outcome, trend, session, vol, cmt_total) -> str:
        """A factual, data-grounded 'why' — never claims absolute causation."""
        bucket = f"{trend}|{session}"
        st = learning.ctx_stats.get((tech, bucket))
        ctx_note = ""
        if st and st["trades"] >= _CTX_MIN:
            wr = round(st["wins"] / st["trades"] * 100)
            tone = "เก่ง" if wr >= 55 else ("อ่อน" if wr <= 40 else "กลางๆ")
            ctx_note = f" · สภาพ {bucket} เทคนิคนี้ชนะ {wr}% ({tone})"
        head = "ชนะ" if outcome == "win" else ("แพ้" if outcome == "loss" else "เสมอ")
        score = f" · คณะกรรมการ {cmt_total}/100" if cmt_total is not None else ""
        return (f"{head} {pnl:+.2f} · เข้าไม้ช่วง {trend}/{session} (vol {vol}) "
                f"ด้วย {tech_name or tech}{score}{ctx_note}")

    # ---- read ---- #
    def recent(self, limit: int = 60, market: str | None = None) -> list[dict]:
        try:
            with learning.engine.begin() as conn:
                q = select(exp_t).order_by(exp_t.c.id.desc()).limit(limit)
                if market:
                    q = select(exp_t).where(exp_t.c.market == market).order_by(exp_t.c.id.desc()).limit(limit)
                rows = [dict(r._mapping) for r in conn.execute(q)]
            for r in rows:
                r.pop("context", None)                 # keep the list light
            return rows
        except Exception:  # noqa: BLE001
            return []

    def stats(self, market: str | None = None) -> dict:
        rows = self._all(market)
        n = len(rows)
        wins = sum(1 for r in rows if r["outcome"] == "win")
        net = round(sum(r["pnl"] for r in rows), 2)
        by_tech: dict = {}
        by_ctx: dict = {}
        for r in rows:
            for key, bucket in ((r.get("technique_name") or r.get("technique") or "—", by_tech),
                                (f"{r.get('trend')}|{r.get('session')}", by_ctx)):
                b = bucket.setdefault(key, {"n": 0, "wins": 0, "pnl": 0.0})
                b["n"] += 1
                b["wins"] += 1 if r["outcome"] == "win" else 0
                b["pnl"] = round(b["pnl"] + r["pnl"], 2)
        return {
            "trades": n, "wins": wins,
            "win_rate": round(wins / n * 100, 1) if n else 0.0,
            "net_pnl": net,
            "by_technique": by_tech, "by_context": by_ctx,
        }

    def today_summary(self, day: str, market: str | None = None) -> str:
        """Compact lesson digest for the boardroom (fed to the CEO)."""
        rows = [r for r in self._all(market) if (r.get("closed_at") or "").startswith(day)]
        if not rows:
            return "วันนี้ยังไม่มีไม้ปิด (ไม่มีบทเรียนใหม่)"
        wins = sum(1 for r in rows if r["outcome"] == "win")
        net = round(sum(r["pnl"] for r in rows), 2)
        lines = [f"ไม้ปิดวันนี้ {len(rows)} ไม้ · ชนะ {wins} · สุทธิ {net:+.2f} USD"]
        for r in rows[:6]:
            lines.append(f"- {r.get('technique_name') or r.get('technique')} {r['pnl']:+.2f}: {r.get('why')}")
        return "\n".join(lines)

    def _all(self, market: str | None = None) -> list[dict]:
        try:
            with learning.engine.begin() as conn:
                q = select(exp_t).order_by(exp_t.c.id.desc()).limit(5000)
                if market:
                    q = select(exp_t).where(exp_t.c.market == market).order_by(exp_t.c.id.desc()).limit(5000)
                return [dict(r._mapping) for r in conn.execute(q)]
        except Exception:  # noqa: BLE001
            return []


experience = ExperienceCenter()
