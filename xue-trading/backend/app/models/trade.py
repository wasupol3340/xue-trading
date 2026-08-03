from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(16), default="XAUUSD")
    side: Mapped[str] = mapped_column(String(4))  # BUY / SELL
    lots: Mapped[float] = mapped_column(Float)
    entry: Mapped[float] = mapped_column(Float)
    exit: Mapped[float] = mapped_column(Float, default=0.0)
    sl: Mapped[float] = mapped_column(Float, default=0.0)
    tp: Mapped[float] = mapped_column(Float, default=0.0)
    pnl: Mapped[float] = mapped_column(Float, default=0.0)
    strategy: Mapped[str] = mapped_column(String(64), default="")
    magic: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="open")  # open / closed
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
