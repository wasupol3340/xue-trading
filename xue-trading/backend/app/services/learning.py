"""
Learning engine — the real "Learning AI", backed by a SQL database via SQLAlchemy.

Tracks every closed trade against the technique that produced it and recomputes a
live score, win-rate, profit factor, Sharpe and max drawdown per technique. The
autotrader/decision engine favours what has actually worked on THIS account.

Storage is driver-agnostic: ONE connection string (env `LEARNING_DB_URL`) selects
where the memory lives — no code change to move it:
    * local file (default):  sqlite:///learning.db
    * cloud Postgres:        postgresql+psycopg2://USER:PASS@HOST:5432/DBNAME
A `postgresql+asyncpg://` or bare `postgres://` URL (what most cloud providers
hand you) is auto-normalised to the sync psycopg2 driver.

If the configured DB is unreachable at startup, the engine falls back to a local
SQLite file and logs a warning, so trading is never blocked by a DB outage.

Every closed trade is stored as its own immutable row (an audit trail); the schema
is future-ready for multi-user — add a `user_id` column and key everything by it.

Public API is unchanged, so nothing else in the app needs to change:
    learning.strategies, learning.current_technique, learning.name_of,
    learning.record_trade, learning.pick_technique, learning.note_technique,
    learning.snapshot
"""
from __future__ import annotations

import json
import os
import random
import threading
from dataclasses import dataclass, field
from statistics import mean, pstdev

from sqlalchemy import (
    Column, Float, Integer, MetaData, String, Table,
    create_engine, insert, select, text, update,
)

# --------------------------------------------------------------------------- #
# connection string resolution
# --------------------------------------------------------------------------- #
_DEFAULT_URL = "sqlite:///learning.db"


def _read_env_file(key: str) -> str:
    """Read KEY=value directly from the backend .env.

    pydantic-settings loads .env into its own Settings object, NOT into
    os.environ — so a plain os.environ.get() never sees LEARNING_DB_URL. We look
    in the .env file ourselves (cwd and the backend root next to app/).
    """
    here = os.path.dirname(os.path.abspath(__file__))               # .../backend/app/services
    backend_root = os.path.abspath(os.path.join(here, "..", ".."))  # .../backend
    candidates, seen = [os.path.join(os.getcwd(), ".env"),
                        os.path.join(backend_root, ".env"), ".env"], set()
    for path in candidates:
        if path in seen:
            continue
        seen.add(path)
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(key + "="):
                        val = line.split("=", 1)[1].strip()
                        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                            val = val[1:-1]
                        return val
        except Exception:  # noqa: BLE001
            continue
    return ""


def _resolve_url() -> str:
    url = os.environ.get("LEARNING_DB_URL") or _read_env_file("LEARNING_DB_URL")
    if not url:
        legacy = os.environ.get("LEARNING_DB_FILE") or _read_env_file("LEARNING_DB_FILE")
        return f"sqlite:///{legacy}" if legacy else _DEFAULT_URL
    return url


def _to_sync_url(url: str) -> str:
    """Force a synchronous driver — this engine is used from sync code."""
    if url.startswith("postgresql+asyncpg"):
        return url.replace("+asyncpg", "+psycopg2", 1)
    if url.startswith("postgres://"):
        return "postgresql+psycopg2://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def _make_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(_to_sync_url(url), pool_pre_ping=True, future=True, connect_args=connect_args)


# --------------------------------------------------------------------------- #
# schema (SQLAlchemy Core — same DDL runs on SQLite and Postgres)
# --------------------------------------------------------------------------- #
_md = MetaData()

strategies_t = Table(
    "learning_strategies", _md,
    Column("key", String(32), primary_key=True),
    Column("trades", Integer, nullable=False, default=0),
    Column("wins", Integer, nullable=False, default=0),
    Column("gross_profit", Float, nullable=False, default=0.0),
    Column("gross_loss", Float, nullable=False, default=0.0),
    Column("enabled", Integer, nullable=False, default=1),
)

trades_t = Table(
    "learning_trades", _md,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("key", String(32), nullable=False, index=True),
    Column("pnl", Float, nullable=False),
    Column("ts", String(32)),
    Column("context", String),  # JSON: market situation at entry (trend/session/vol/...)
)

meta_t = Table(
    "learning_meta", _md,
    Column("k", String(64), primary_key=True),
    Column("v", String(256)),
)

# Per-agent attribution log — turns each AI "department" into a MEASURED entity.
# One immutable row per event; aggregates are recomputed on load. Survives a VPS
# move because it lives in the same external DB as the rest of the memory.
agent_events_t = Table(
    "learning_agent_events", _md,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("agent", String(16), nullable=False, index=True),  # ceo/cio/research/macro/risk/execution/learning/monitor
    Column("kind", String(24), nullable=False),               # decision/pick/fill/news/uptime/incident
    Column("correct", Integer),                               # 1/0, or NULL when not a right-wrong event
    Column("value", Float),                                   # pnl / slippage / news-score / epoch ...
    Column("detail", String(128)),
    Column("ts", String(32)),
)

# key, display name, category, starting score — REPUTATION-BASED PRIORS from
# research (see TECHNIQUE_RESEARCH.md); live results override them over time.
SEED = [
    ("smc", "Smart Money Concepts", "SMC", 66),
    ("ict", "ICT (Inner Circle Trader)", "ICT", 64),
    ("orderblock", "Order Block", "SMC", 62),
    ("liquidity", "Liquidity Sweep", "SMC", 61),
    ("fvg", "Fair Value Gap", "ICT", 60),
    ("wyckoff", "Wyckoff Method", "Volume", 58),
    ("supplydemand", "Supply & Demand", "SMC", 57),
    ("ema", "EMA Confluence", "Indicator", 50),
    ("rsi", "RSI Divergence", "Indicator", 49),
    ("macd", "MACD Momentum", "Indicator", 47),
]
_PNL_CAP = 100  # recent pnl series kept in-memory for Sharpe / drawdown
_CTX_MIN = 5    # min trades in a context before the brain trusts it (overfit guard)
_CMT_MIN = 25   # min committee-gated trades before adapting category weights

# ---- Technique Review ("การประชุมทบทวนเทคนิค") ----
# เมื่อเทคนิคแพ้ติดกัน องค์กรจะ "ประชุม" ว่าใช้ต่อไหม — ผลลัพธ์ปรับ "การใช้งาน"
# ของเทคนิค (จำกัดสภาพตลาด / พัก) โดย **ไม่แตะขนาด lot** (lot คงที่เสมอ)
_REVIEW_MIN = 4    # ต้องมีผลเทรดเทคนิคนี้อย่างน้อยเท่านี้จึงพิจารณา
_REVIEW_LOOK = 8   # ดูผลล่าสุดกี่ไม้ต่อเทคนิค
_GOOD_WR = 50.0    # สภาพตลาดที่ win-rate >= นี้ = "เก่ง"
_BAD_WR = 40.0     # สภาพตลาดที่ win-rate <= นี้ = "แพ้"


def _ctx_levels(context: dict) -> list[str]:
    """The chart 'fingerprint' at several resolutions, MOST specific first.

    The brain remembers a technique's results at every resolution at once, then at
    decision time uses the MOST DETAILED fingerprint that already has enough real
    trades and falls back to coarser ones (finally the overall score) when data is
    thin. That is what lets memory be very detailed WITHOUT needing a huge number
    of trades before it becomes useful — the overfit guard picks the right level.

        L4  trend|session|vol|mom|loc   (full fingerprint — 'a chart exactly like this')
        L3  trend|session|vol|mom
        L2  trend|session|vol
        L1  trend|session                (the original coarse bucket — back-compatible)

    Older trades recorded before the richer fields existed still match at L1, so no
    history is lost; new trades enrich the finer levels over time.
    """
    if not context:
        return []
    t = context.get("trend", "?")
    s = context.get("session", "?")
    v = context.get("vol", "?")
    m = context.get("mom", "?")
    loc = context.get("loc", "?")
    return [
        f"{t}|{s}|{v}|{m}|{loc}",
        f"{t}|{s}|{v}|{m}",
        f"{t}|{s}|{v}",
        f"{t}|{s}",
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
        self.ctx_stats: dict = {}  # (technique, context-bucket) -> {trades,wins,gp,gl}
        self.cmt: dict = {}        # committee category -> win/lose score sums (adaptive weights)
        self.cmt_n: int = 0        # number of committee-gated trades seen
        self.recent_pnls: list = []  # last ~50 closed-trade pnls (chronological)
        self.tech_recent: dict = {}  # technique key -> last ~15 pnls (chrono) — Technique Review
        self.agent_events: dict = {}  # agent -> newest-first list of {kind,correct,value,detail} (Phase 2)
        self.current_technique: str = ""
        self.last_update: str = ""
        self._lock = threading.Lock()

        url = _resolve_url()
        try:
            self.engine = _make_engine(url)
            _md.create_all(self.engine)
            self.backend = _to_sync_url(url).split("://", 1)[0]
        except Exception as exc:  # noqa: BLE001 — never let a DB outage block trading
            print(f"[learning] DB '{url}' unreachable ({exc}); falling back to local SQLite")
            self.engine = _make_engine(_DEFAULT_URL)
            _md.create_all(self.engine)
            self.backend = "sqlite(fallback)"

        self._migrate()
        self._seed()
        self._load()
        print(f"[learning] memory backend: {self.backend}")

    def _migrate(self) -> None:
        """Add columns to a pre-existing table (create_all won't alter it)."""
        for ddl in ("ALTER TABLE learning_trades ADD COLUMN context TEXT",):
            try:
                with self.engine.begin() as conn:
                    conn.execute(text(ddl))
            except Exception:  # noqa: BLE001 — column already exists
                pass

    # ---- persistence helpers ---- #
    def _seed(self) -> None:
        with self.engine.begin() as conn:
            existing = set(conn.execute(select(strategies_t.c.key)).scalars())
            for key, _n, _c, _p in SEED:
                if key not in existing:
                    conn.execute(insert(strategies_t).values(key=key, enabled=1))

    def _load(self) -> None:
        with self.engine.begin() as conn:
            rows = {r.key: r for r in conn.execute(select(strategies_t))}
            for key, name, cat, prior in SEED:
                r = rows.get(key)
                pnls = list(conn.execute(
                    select(trades_t.c.pnl).where(trades_t.c.key == key)
                    .order_by(trades_t.c.id.desc()).limit(_PNL_CAP)
                ).scalars())[::-1]
                self.strategies[key] = StrategyStat(
                    key=key, name=name, category=cat, prior_score=prior,
                    trades=(r.trades if r else 0),
                    wins=(r.wins if r else 0),
                    gross_profit=(r.gross_profit if r else 0.0),
                    gross_loss=(r.gross_loss if r else 0.0),
                    pnls=pnls,
                    enabled=(bool(r.enabled) if r else True),
                )
            # contextual brain — bucket every trade by (technique, context)
            self.ctx_stats = {}
            self.cmt = {}; self.cmt_n = 0
            recent_tmp = []  # newest-first
            tech_tmp: dict = {}  # key -> newest-first pnls
            for tr in conn.execute(
                select(trades_t.c.key, trades_t.c.pnl, trades_t.c.context)
                .order_by(trades_t.c.id.desc()).limit(5000)
            ):
                try:
                    c = json.loads(tr.context) if tr.context else {}
                except Exception:  # noqa: BLE001
                    c = {}
                self._bump_ctx(tr.key, c, tr.pnl)
                self._bump_committee(c, tr.pnl)
                recent_tmp.append(tr.pnl)
                lst = tech_tmp.setdefault(tr.key, [])
                if len(lst) < _REVIEW_LOOK:
                    lst.append(tr.pnl)
            self.recent_pnls = recent_tmp[:50][::-1]  # 50 ล่าสุด เรียงเก่า→ใหม่
            self.tech_recent = {k: v[::-1] for k, v in tech_tmp.items()}  # เก่า→ใหม่ ต่อเทคนิค
            # per-agent attribution log (newest-first, capped per agent)
            self.agent_events = {}
            try:
                for ev in conn.execute(
                    select(agent_events_t.c.agent, agent_events_t.c.kind, agent_events_t.c.correct,
                           agent_events_t.c.value, agent_events_t.c.detail)
                    .order_by(agent_events_t.c.id.desc()).limit(4000)
                ):
                    lst = self.agent_events.setdefault(ev.agent, [])
                    if len(lst) < 200:
                        lst.append({"kind": ev.kind, "correct": ev.correct,
                                    "value": ev.value, "detail": ev.detail})
            except Exception:  # noqa: BLE001 — table may not exist on very first run
                self.agent_events = {}
            self.current_technique = self._get_meta(conn, "current_technique", "")
            self.last_update = self._get_meta(conn, "last_update", "")

    def _bump_ctx(self, key: str, context: dict, pnl: float) -> None:
        # Record the result at EVERY fingerprint resolution (L4..L1) so each level
        # accumulates its own sample. Different levels have different field counts,
        # so their bucket strings never collide.
        for bucket in _ctx_levels(context):
            st = self.ctx_stats.setdefault((key, bucket), {"trades": 0, "wins": 0, "gp": 0.0, "gl": 0.0})
            st["trades"] += 1
            if pnl >= 0:
                st["wins"] += 1
                st["gp"] += pnl
            else:
                st["gl"] += abs(pnl)

    def _bump_committee(self, context: dict, pnl: float) -> None:
        """Accumulate each committee category's score, split by win/loss, so the
        weights can later shift toward categories that actually predict wins."""
        cm = (context or {}).get("committee") or {}
        scores = cm.get("scores") or {}
        if not scores:
            return
        win = pnl >= 0
        self.cmt_n += 1
        for cat, val in scores.items():
            try:
                val = float(val)
            except Exception:  # noqa: BLE001
                continue
            st = self.cmt.setdefault(cat, {"ws": 0.0, "wn": 0, "ls": 0.0, "ln": 0})
            if win:
                st["ws"] += val; st["wn"] += 1
            else:
                st["ls"] += val; st["ln"] += 1

    def committee_weights(self, base: dict) -> dict:
        """Adaptive committee weights: categories whose HIGH scores separated real
        winners from losers get more weight; others less. Bounded and shrunk toward
        the base by sample size (overfit guard). Returns base until _CMT_MIN trades."""
        if self.cmt_n < _CMT_MIN:
            return dict(base)
        shrink = self.cmt_n / (self.cmt_n + 40)
        out: dict = {}
        for cat, w in base.items():
            st = self.cmt.get(cat)
            if st and st["wn"] and st["ln"]:
                sep = (st["ws"] / st["wn"]) - (st["ls"] / st["ln"])   # >0 = predicts wins
                factor = 1.0 + max(-0.4, min(0.6, sep / 50.0))
            else:
                factor = 1.0
            out[cat] = w * (1.0 + (factor - 1.0) * shrink)
        tot = sum(out.values()) or 1.0
        return {k: v / tot for k, v in out.items()}

    def _tech_contexts(self, key: str):
        """คืน (good, bad) — รายการ context bucket (L1 = trend|session) ที่มีข้อมูล
        พอ (>= _CTX_MIN) ของเทคนิคนี้ แยกตามว่าเก่ง (>= _GOOD_WR) หรือแพ้ (<= _BAD_WR)."""
        good, bad = [], []
        for (k, bucket), st in self.ctx_stats.items():
            if k != key or bucket.count("|") != 1 or st["trades"] < _CTX_MIN:
                continue
            bwr = st["wins"] / st["trades"] * 100.0
            row = {"context": bucket, "trades": st["trades"], "win_rate": round(bwr, 1)}
            if bwr >= _GOOD_WR:
                good.append(row)
            elif bwr <= _BAD_WR:
                bad.append(row)
        good.sort(key=lambda r: r["win_rate"], reverse=True)
        bad.sort(key=lambda r: r["win_rate"])
        return good, bad

    def technique_review(self, key: str) -> dict:
        """การประชุมทบทวนเทคนิค (deterministic) — เมื่อเทคนิคแพ้ติดกัน องค์กร 'ลงมติ'
        ว่าใช้ต่อไหม โดยดูหลักฐานว่ายังมีสภาพตลาดที่มันเก่งอยู่หรือเปล่า:
          * ok     — ผลปกติ / ข้อมูลยังน้อย → ใช้ต่อตามเดิม
          * refine — แพ้ช่วงนี้ แต่ยังเก่งในบางสภาพ → ใช้ต่อ แต่ 'จำกัดสภาพ' (ปรับให้ดีขึ้น)
          * bench  — แพ้ในทุกสภาพที่มีข้อมูล ไม่มีสภาพที่เก่ง → พักการใช้งานในสภาพเหล่านั้น
          * watch  — แพ้ช่วงนี้ แต่ข้อมูลรายสภาพยังไม่พอชี้ชัด → ยังไม่ตัดสิน
        **ไม่แตะขนาด lot** — มติมีผลกับ 'การเลือกเทคนิค' เท่านั้น (ดู technique_allowed)."""
        s = self.strategies.get(key)
        recent = list(self.tech_recent.get(key, []))[-_REVIEW_LOOK:]
        n = len(recent)
        streak = 0
        for p in reversed(recent):
            if p < 0:
                streak += 1
            else:
                break
        wr = (sum(1 for p in recent if p >= 0) / n * 100.0) if n else 0.0
        good, bad = self._tech_contexts(key)
        triggered = n >= _REVIEW_MIN and (streak >= 3 or wr <= _BAD_WR)
        if not triggered:
            status, verdict = "ok", "ใช้ต่อ"
            reason = "ผลงานอยู่ในเกณฑ์" if n >= _REVIEW_MIN else "ข้อมูลยังน้อย — เก็บสถิติต่อ"
        elif good:
            status, verdict = "refine", "ใช้ต่อ (ปรับให้ดีขึ้น)"
            reason = (f"แพ้ช่วงนี้ (สตรีค {streak}, ชนะ {round(wr)}%) แต่ยังเก่งใน {len(good)} สภาพ "
                      f"→ จำกัดให้เทรดเฉพาะสภาพที่เก่ง งดสภาพที่แพ้ (ขนาดไม้เท่าเดิม)")
        elif bad:
            status, verdict = "bench", "พักการใช้งาน"
            reason = (f"แพ้ในทุกสภาพที่มีข้อมูล ({len(bad)} สภาพ) และไม่มีสภาพที่เก่ง "
                      f"→ หยุดใช้ในสภาพเหล่านั้น (รอสภาพตลาดใหม่จึงทดสอบใหม่)")
        else:
            status, verdict = "watch", "เฝ้าดู"
            reason = "แพ้ช่วงนี้ แต่ข้อมูลรายสภาพยังไม่พอชี้ชัด → ยังไม่ตัดสิน (กันตัดสินบนข้อมูลบาง)"
        return {
            "key": key, "name": (s.name if s else key), "status": status, "verdict": verdict,
            "reason": reason, "streak": streak, "recent_n": n, "recent_win_rate": round(wr, 1),
            "good_contexts": good, "bad_contexts": bad,
        }

    def technique_allowed(self, key: str, context: dict | None = None) -> bool:
        """ผลของ 'มติที่ประชุม' ต่อการเทรดจริง: เทคนิคที่กำลังแพ้จะถูกงด **เฉพาะใน
        สภาพตลาดที่พิสูจน์แล้วว่าแพ้** (นี่คือ 'ปรับให้ดีขึ้น') แต่ยังเทรดได้ในสภาพที่เก่ง
        และสภาพใหม่ที่ยังไม่มีข้อมูล. self-healing: ถ้ากลับมาชนะ สถานะกลับเป็น ok เอง.
        **ไม่เกี่ยวกับขนาด lot** — lot คงที่เสมอ."""
        rv = self.technique_review(key)
        if rv["status"] in ("ok", "watch"):
            return True
        for bucket in _ctx_levels(context or {}):
            if bucket.count("|") != 1:      # ใช้ระดับ L1 (trend|session) ให้ตรงกับ review
                continue
            st = self.ctx_stats.get((key, bucket))
            if st and st["trades"] >= _CTX_MIN:
                bwr = st["wins"] / st["trades"] * 100.0
                if bwr <= _BAD_WR:
                    return False            # สภาพนี้พิสูจน์แล้วว่าแพ้ → มติ: งด
                if bwr >= _GOOD_WR:
                    return True             # สภาพที่เก่ง → เทรดได้
                break
        return True                         # สภาพใหม่/ก้ำกึ่ง → ให้เก็บข้อมูลต่อ (overfit guard)

    # ---- Phase 2: per-agent attribution ("บริษัท AI" — ทุก agent วัดผลได้จริง) ---- #
    def record_agent(self, agent: str, kind: str, correct: bool | None = None,
                     value: float | None = None, detail: str = "", timestamp: str = "") -> None:
        """บันทึก 'ผลงาน' ของ agent หนึ่งครั้ง (persist + in-memory). ใช้ให้คะแนน/ประวัติ
        ของแต่ละ agent เป็นของจริง ไม่ปลอม. เก็บลง DB เดียวกับความจำอื่น (ย้าย VPS ไม่หาย)."""
        rec = {"kind": kind,
               "correct": (None if correct is None else (1 if correct else 0)),
               "value": (None if value is None else round(float(value), 4)),
               "detail": (detail or "")[:128]}
        with self._lock:
            lst = self.agent_events.setdefault(agent, [])
            lst.insert(0, rec)                      # newest-first
            del lst[200:]
            try:
                with self.engine.begin() as conn:
                    conn.execute(insert(agent_events_t).values(
                        agent=agent, kind=kind, correct=rec["correct"],
                        value=rec["value"], detail=rec["detail"], ts=timestamp,
                    ))
            except Exception as exc:  # noqa: BLE001 — never block trading on logging
                print(f"[learning] record_agent persist failed: {exc}")

    def agent_stats(self, agent: str, recent_n: int = 10) -> dict:
        """สรุปผลงานของ agent: จำนวนครั้ง, ความแม่นยำ (จากอีเวนต์ที่มี correct),
        ความแม่นยำช่วงหลัง, ค่าเฉลี่ย value (เช่น slippage), และแยกตาม detail."""
        evs = self.agent_events.get(agent, [])
        judged = [e for e in evs if e["correct"] is not None]
        correct = sum(1 for e in judged if e["correct"] == 1)
        recent = judged[:recent_n]
        rec_correct = sum(1 for e in recent if e["correct"] == 1)
        vals = [e["value"] for e in evs if e["value"] is not None]
        by_detail: dict = {}
        for e in judged:
            d = e["detail"] or "—"
            b = by_detail.setdefault(d, {"judged": 0, "correct": 0})
            b["judged"] += 1
            b["correct"] += 1 if e["correct"] == 1 else 0
        return {
            "calls": len(evs),
            "judged": len(judged),
            "accuracy": (round(correct / len(judged) * 100, 1) if judged else None),
            "recent_accuracy": (round(rec_correct / len(recent) * 100, 1) if recent else None),
            "avg_value": (round(sum(vals) / len(vals), 4) if vals else None),
            "by_detail": by_detail,
        }

    def context_extremes(self, key: str):
        """คืน (best, worst) context bucket ของเทคนิค — สำหรับ 'จุดแข็ง/จุดอ่อน'.
        ใช้ bucket ระดับ trend|session (L1) ที่มีข้อมูล >= _CTX_MIN."""
        best = worst = None
        for (k, bucket), st in self.ctx_stats.items():
            if k != key or bucket.count("|") != 1 or st["trades"] < _CTX_MIN:
                continue
            wr = st["wins"] / st["trades"] * 100.0
            row = {"context": bucket, "trades": st["trades"], "win_rate": round(wr, 1)}
            if best is None or wr > best["win_rate"]:
                best = row
            if worst is None or wr < worst["win_rate"]:
                worst = row
        return best, worst

    @staticmethod
    def _get_meta(conn, k: str, default: str = "") -> str:
        row = conn.execute(select(meta_t.c.v).where(meta_t.c.k == k)).fetchone()
        return row[0] if row else default

    @staticmethod
    def _set_meta(conn, k: str, v: str) -> None:
        res = conn.execute(update(meta_t).where(meta_t.c.k == k).values(v=v))
        if res.rowcount == 0:
            conn.execute(insert(meta_t).values(k=k, v=v))

    # ---- learning ---- #
    def record_trade(self, key: str, pnl: float, timestamp: str = "", context: dict | None = None) -> None:
        s = self.strategies.get(key)
        if not s:
            return
        with self._lock:
            s.trades += 1
            if pnl >= 0:
                s.wins += 1
                s.gross_profit += pnl
            else:
                s.gross_loss += abs(pnl)
            s.pnls.append(round(pnl, 4))
            s.pnls = s.pnls[-_PNL_CAP:]
            self._bump_ctx(key, context or {}, pnl)  # feed the contextual brain
            self._bump_committee(context or {}, pnl)  # feed adaptive committee weights
            self.recent_pnls.append(round(pnl, 4))
            self.recent_pnls = self.recent_pnls[-50:]
            tl = self.tech_recent.setdefault(key, [])   # feed the Technique Review
            tl.append(round(pnl, 4))
            self.tech_recent[key] = tl[-_REVIEW_LOOK:]
            self.last_update = timestamp
            try:
                with self.engine.begin() as conn:  # one atomic transaction
                    conn.execute(insert(trades_t).values(
                        key=key, pnl=round(pnl, 4), ts=timestamp,
                        context=json.dumps(context or {}),
                    ))
                    conn.execute(
                        update(strategies_t).where(strategies_t.c.key == key).values(
                            trades=s.trades, wins=s.wins,
                            gross_profit=round(s.gross_profit, 4),
                            gross_loss=round(s.gross_loss, 4),
                        )
                    )
                    self._set_meta(conn, "last_update", timestamp)
            except Exception as exc:  # noqa: BLE001
                print(f"[learning] record_trade persist failed: {exc}")

    def contextual_score(self, key: str, context: dict | None = None) -> float:
        """Score for THIS technique IN THIS market context — the learning brain.

        Overfit-safe: with fewer than _CTX_MIN real trades in a context it just
        returns the overall score (identical to today's behaviour). As real
        trades accumulate in a context, it shifts toward what actually worked
        there — so the bot gets context-aware WITHOUT risking money on thin data.
        """
        s = self.strategies.get(key)
        if not s:
            return 0.0
        overall = s.score
        # Walk the fingerprint from MOST specific to coarsest; use the first level
        # that has enough real trades (_CTX_MIN). This makes the brain as detailed
        # as the data allows and no more — thin/fine contexts safely defer to
        # broader ones, and a brand-new context defers to the overall score.
        for bucket in _ctx_levels(context or {}):
            st = self.ctx_stats.get((key, bucket))
            n = st["trades"] if st else 0
            if n < _CTX_MIN:
                continue
            wr = st["wins"] / n * 100.0
            pf = (st["gp"] / st["gl"]) if st["gl"] > 0 else (st["gp"] if st["gp"] else 0.0)
            raw = 0.5 * wr + 0.5 * min(100.0, pf * 40.0)
            w = n / (n + 12)  # trust in the context grows with its sample size
            blended = overall * (1 - w) + raw * w
            return round(max(1.0, min(99.0, blended)), 1)
        return overall  # no fingerprint level has enough data yet -> safe fallback

    def pick_technique(self) -> str:
        """Weighted choice by score among enabled strategies (exploration + exploitation)."""
        pool = [s for s in self.strategies.values() if s.enabled] or list(self.strategies.values())
        weights = [max(1.0, s.score) for s in pool]
        chosen = random.choices(pool, weights=weights, k=1)[0]
        self.note_technique(chosen.key)
        return chosen.key

    def note_technique(self, key: str) -> None:
        """Record which technique is being traded/watched right now."""
        self.current_technique = key
        try:
            with self.engine.begin() as conn:
                self._set_meta(conn, "current_technique", key)
        except Exception as exc:  # noqa: BLE001
            print(f"[learning] note_technique persist failed: {exc}")

    def set_enabled(self, key: str, enabled: bool) -> None:
        """Enable/disable a technique (per-user in the multi-user future)."""
        s = self.strategies.get(key)
        if not s:
            return
        s.enabled = enabled
        try:
            with self.engine.begin() as conn:
                conn.execute(update(strategies_t).where(strategies_t.c.key == key).values(enabled=1 if enabled else 0))
        except Exception as exc:  # noqa: BLE001
            print(f"[learning] set_enabled persist failed: {exc}")

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
