"""Small deterministic reference model for STRAT-002 channel semantics.

This is a unit-test oracle for indexing and signal rules only. It does not simulate
MQL5 order execution, broker costs, fills, or Strategy Tester behavior.
"""
from math import isfinite


def _validate_bars(bars):
    for i, bar in enumerate(bars):
        for key in ("high", "low", "close"):
            value = bar.get(key)
            if not isinstance(value, (int, float)) or not isfinite(value):
                raise ValueError(f"bar {i} has invalid {key}")
        if bar["high"] < bar["low"]:
            raise ValueError(f"bar {i} high is below low")
        if not bar["low"] <= bar["close"] <= bar["high"]:
            raise ValueError(f"bar {i} close lies outside its range")


def channel_before(bars, signal_index, lookback):
    """Return (highest high, lowest low) from bars immediately before signal_index."""
    _validate_bars(bars)
    if lookback < 1:
        raise ValueError("lookback must be positive")
    if signal_index < lookback or signal_index >= len(bars):
        return None
    window = bars[signal_index - lookback:signal_index]
    return max(b["high"] for b in window), min(b["low"] for b in window)


def entry_signal(bars, signal_index, lookback=20):
    """Return 'long', 'short', or None using the completed signal bar vs prior channel."""
    _validate_bars(bars)
    channel = channel_before(bars, signal_index, lookback)
    if channel is None:
        return None
    upper, lower = channel
    close = bars[signal_index]["close"]
    if close > upper:
        return "long"
    if close < lower:
        return "short"
    return None


def exit_signal(bars, signal_index, position, lookback=10):
    """Return True only when a completed bar closes beyond the prior exit channel."""
    if position not in ("long", "short"):
        raise ValueError("position must be 'long' or 'short'")
    channel = channel_before(bars, signal_index, lookback)
    if channel is None:
        return False
    upper, lower = channel
    close = bars[signal_index]["close"]
    return close < lower if position == "long" else close > upper
