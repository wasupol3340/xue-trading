from dataclasses import dataclass

from app.core.config import settings


@dataclass
class RiskDecision:
    approved: bool
    lots: float
    reason: str


class RiskManager:
    """
    Enforces the hard limits configured by the operator. Runs before every
    execution — Risk AI cannot be overridden by consensus.
    """

    def __init__(
        self,
        risk_per_trade: float | None = None,
        max_drawdown: float | None = None,
        daily_loss_limit: float | None = None,
        max_exposure_lots: float | None = None,
    ) -> None:
        self.risk_per_trade = risk_per_trade or settings.RISK_PER_TRADE
        self.max_drawdown = max_drawdown or settings.MAX_DRAWDOWN
        self.daily_loss_limit = daily_loss_limit or settings.DAILY_LOSS_LIMIT
        self.max_exposure_lots = max_exposure_lots or settings.MAX_EXPOSURE_LOTS

    def calc_lot(self, balance: float, entry: float, sl: float, pip_value: float = 100.0) -> float:
        """Position sizing from account risk % and stop distance."""
        risk_amount = balance * (self.risk_per_trade / 100.0)
        stop_distance = abs(entry - sl)
        if stop_distance <= 0:
            return 0.01
        lots = risk_amount / (stop_distance * pip_value)
        return max(0.01, round(min(lots, self.max_exposure_lots), 2))

    def evaluate(
        self,
        *,
        balance: float,
        entry: float,
        sl: float,
        current_drawdown: float,
        today_pnl_pct: float,
        open_exposure: float,
    ) -> RiskDecision:
        if current_drawdown >= self.max_drawdown:
            return RiskDecision(False, 0.0, f"Max drawdown reached ({current_drawdown:.1f}%)")
        if today_pnl_pct <= -self.daily_loss_limit:
            return RiskDecision(False, 0.0, f"Daily loss limit hit ({today_pnl_pct:.1f}%)")
        if open_exposure >= self.max_exposure_lots:
            return RiskDecision(False, 0.0, "Max exposure reached")

        lots = self.calc_lot(balance, entry, sl)
        if open_exposure + lots > self.max_exposure_lots:
            lots = round(self.max_exposure_lots - open_exposure, 2)
        if lots < 0.01:
            return RiskDecision(False, 0.0, "Sized position below minimum lot")
        return RiskDecision(True, lots, f"Approved · risk {self.risk_per_trade}% · {lots} lot")
