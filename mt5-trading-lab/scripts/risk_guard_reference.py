"""Reference model for TradingLab's persistent risk circuit-breaker.

This model checks policy arithmetic/state transitions, not the compiled MQL5
implementation or broker execution. Keep the two implementations aligned.
"""
from dataclasses import asdict, dataclass
import math


@dataclass
class GuardState:
    server_day: int
    day_start_equity: float
    peak_equity: float
    daily_halt: bool = False
    peak_halt: bool = False
    review_logged: bool = False
    halt_logged: bool = False


def update_state(state, equity, server_day, daily_limit_pct=1.0,
                 review_pct=5.0, halt_pct=10.0):
    values = (equity, daily_limit_pct, review_pct, halt_pct,
              state.day_start_equity, state.peak_equity)
    if not all(math.isfinite(v) for v in values):
        raise ValueError("risk guard values must be finite")
    if equity <= 0 or state.day_start_equity <= 0 or state.peak_equity <= 0:
        raise ValueError("equity references must be positive")
    if daily_limit_pct <= 0 or review_pct <= 0 or halt_pct <= review_pct:
        raise ValueError("risk thresholds invalid")

    if server_day != state.server_day:
        state.server_day = server_day
        state.day_start_equity = equity
        state.daily_halt = False
        state.review_logged = False
        state.halt_logged = False

    state.peak_equity = max(state.peak_equity, equity)
    drawdown = max(0.0, (state.peak_equity - equity) / state.peak_equity * 100.0)
    daily_loss = max(0.0, (state.day_start_equity - equity) / state.day_start_equity * 100.0)
    if drawdown >= review_pct:
        state.review_logged = True
    if drawdown >= halt_pct:
        state.peak_halt = True
    if daily_loss >= daily_limit_pct:
        state.daily_halt = True
    halted = state.daily_halt or state.peak_halt
    if halted:
        state.halt_logged = True
    return {
        "halted": halted,
        "close_strategy_positions": halted,
        "daily_loss_pct": daily_loss,
        "peak_drawdown_pct": drawdown,
        "review_logged": state.review_logged,
        "state": asdict(state),
    }
