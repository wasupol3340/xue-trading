from fastapi import APIRouter

from app.schemas.trading import NewsOut

router = APIRouter(prefix="/news", tags=["news"])

_NEWS = [
    NewsOut(id="n1", time="08:30", currency="USD", title="Non-Farm Payrolls (May)", impact="high", actual="272K", forecast="185K", previous="175K"),
    NewsOut(id="n2", time="07:00", currency="EUR", title="CPI (YoY) (May)", impact="medium", actual="2.6%", forecast="2.4%", previous="2.4%"),
    NewsOut(id="n3", time="06:00", currency="GBP", title="GDP (QoQ) (Q1)", impact="low", actual="0.7%", forecast="0.6%", previous="0.3%"),
    NewsOut(id="n4", time="05:30", currency="USD", title="Crude Oil Inventories", impact="medium", actual="-2.3M", forecast="-1.8M", previous="1.2M"),
    NewsOut(id="n5", time="04:00", currency="USD", title="Fed Chair Powell Speaks", impact="high", actual="—", forecast="—", previous="—"),
]


@router.get("", response_model=list[NewsOut])
async def news(impact: str | None = None) -> list[NewsOut]:
    if impact:
        return [n for n in _NEWS if n.impact == impact]
    return _NEWS
