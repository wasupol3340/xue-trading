"""
News AI — REAL economic calendar.

Pulls this week's economic events from the free ForexFactory weekly JSON feed
(faireconomy.media), surfaces them on the dashboard, and lets the autotrader
STAND ASIDE around high-impact releases (NFP, CPI, FOMC, ...) that whipsaw gold.

Design:
  * Cached for 30 min so we don't hammer the feed.
  * FAIL-OPEN — if the feed is unreachable, trading is never blocked and the
    dashboard just shows no events. A news outage must not stop the bot.
  * Pure helpers (_events / _high_impact_now / _report) take (data, now) so they
    are unit-testable without the network.

Feed item shape: {"title","country","date"(ISO ±offset),"impact","forecast","previous"[,"actual"]}
"""
from __future__ import annotations

import json
import time
import urllib.request
from datetime import datetime, timezone

_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
# currencies that move XAUUSD (gold) the most  ("All" = global events e.g. OPEC)
_RELEVANT = {"USD", "EUR", "GBP", "All"}
_RANK = {"High": 3, "Medium": 2, "Low": 1, "Holiday": 0}
_TTL = 1800  # seconds
_CACHE: dict = {"ts": 0.0, "data": []}


# --------------------------------------------------------------------------- #
# network (not unit-tested; the trading host performs the real fetch)
# --------------------------------------------------------------------------- #
def _fetch() -> list:
    now = time.time()
    if _CACHE["data"] and (now - _CACHE["ts"]) < _TTL:
        return _CACHE["data"]
    try:
        req = urllib.request.Request(_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode("utf-8"))
        if isinstance(data, list):
            _CACHE["data"], _CACHE["ts"] = data, now
    except Exception:  # noqa: BLE001 — fail-open, keep last cache (or empty)
        pass
    return _CACHE["data"]


def _parse_dt(s: str):
    try:
        return datetime.fromisoformat(s).astimezone(timezone.utc)
    except Exception:  # noqa: BLE001
        return None


# --------------------------------------------------------------------------- #
# pure helpers (testable)
# --------------------------------------------------------------------------- #
def _events(data: list, only_relevant: bool = True, min_impact: str | None = None) -> list:
    floor = _RANK.get(min_impact or "", 0)
    out = []
    for e in data:
        if only_relevant and e.get("country") not in _RELEVANT:
            continue
        if _RANK.get(e.get("impact", ""), 0) < floor:
            continue
        out.append(e)
    return out


def _high_impact_now(data: list, now: datetime, window_min: int = 15):
    for e in data:
        if e.get("impact") != "High" or e.get("country") not in _RELEVANT:
            continue
        dt = _parse_dt(e.get("date", ""))
        if dt and abs((dt - now).total_seconds()) / 60.0 <= window_min:
            return True, f"{e.get('title', 'event')} ({e.get('country', '')})"
    return False, ""


def _report(data: list, now: datetime, window_min: int = 15) -> dict:
    highs = _events(data, only_relevant=True, min_impact="High")
    gated, ev = _high_impact_now(data, now, window_min)
    if gated:
        return {"status": "gating", "gated": True, "high_count": len(highs),
                "message": f"High-impact {ev} imminent — standing aside"}
    upcoming = sorted(
        [(dt, e) for e in highs if (dt := _parse_dt(e.get("date", ""))) and dt >= now],
        key=lambda x: x[0],
    )
    if upcoming:
        nxt = upcoming[0][1]
        return {"status": "scanning", "gated": False, "high_count": len(highs),
                "message": f"{len(highs)} high-impact events this week · next: {nxt.get('title')} ({nxt.get('country')})"}
    return {"status": "scanning", "gated": False, "high_count": len(highs),
            "message": f"Scanning macro feed · {len(highs)} high-impact events this week"}


# --------------------------------------------------------------------------- #
# public API
# --------------------------------------------------------------------------- #
def events(only_relevant: bool = True, min_impact: str | None = None) -> list:
    return _events(_fetch(), only_relevant, min_impact)


def high_impact_now(window_min: int = 15):
    return _high_impact_now(_fetch(), datetime.now(timezone.utc), window_min)


def report(window_min: int = 15) -> dict:
    return _report(_fetch(), datetime.now(timezone.utc), window_min)


def as_news_out(limit: int = 12) -> list[dict]:
    """Map calendar events -> the dashboard NewsOut shape (relevant currencies)."""
    rows = []
    for i, e in enumerate(events(only_relevant=True)):
        dt = _parse_dt(e.get("date", ""))
        rows.append({
            "id": f"ff{i}",
            "time": dt.strftime("%H:%M") if dt else "",
            "currency": e.get("country", ""),
            "title": e.get("title", ""),
            "impact": str(e.get("impact", "")).lower(),
            "actual": e.get("actual") or None,
            "forecast": e.get("forecast") or None,
            "previous": e.get("previous") or None,
        })
    # sort by time, high-impact first is handled client-side; cap the list
    return rows[:limit]
