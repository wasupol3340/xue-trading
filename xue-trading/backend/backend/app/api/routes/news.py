from fastapi import APIRouter

from app.schemas.trading import NewsOut
from app.services import news_data

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=list[NewsOut])
async def news(impact: str | None = None) -> list[NewsOut]:
    """REAL this-week economic calendar (gold-relevant currencies)."""
    try:
        rows = [NewsOut(**r) for r in news_data.as_news_out()]
    except Exception:  # noqa: BLE001 — fail-open, empty rather than crash
        rows = []
    if impact:
        return [n for n in rows if n.impact == impact]
    return rows
