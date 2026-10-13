# TS-MOM-01 — Time-series momentum

Candidate ID: STRAT-001
Version: v1
Status: FROZEN SPECIFICATION v1 — deterministic rules accepted for implementation. Not backtested or approved for demo/live.

## Hypothesis
A simple, deterministic time-series momentum rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £100 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: D1.
- Instruments: Major FX symbols first; indices/metals only after independent contract feasibility.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
Use a 126-bar lookback return (close[1] / close[127] - 1) and a 20-bar ATR on completed D1 bars. Long if the lookback return is positive; short if negative. No entry if return is exactly zero or ATR is invalid. Enter at the next available market quote after the signal bar closes. Exit on a completed-bar sign change, or protective stop at 3.0 × ATR(20) from entry. Recompute the stop only on entry; no trailing in v1. One position per symbol. No same-bar reverse.

## Frozen v1 parameters
Lookback 126 bars; ATR 20; stop 3.0 ATR. No optimization in v1.

## Main falsification risks
Trend reversals, overnight/weekend gaps, financing and conversion, proxy/broker differences, and weak signal-to-cost ratio.

## Shared hard gates
- Research-only. No live account, no paid data, no performance claim until actual MT5 evidence exists.
- First feasibility instrument must be chosen from a broker's published symbol contract. £100 account reference; target risk 0.25%, reject if modeled minimum-volume loss including spread, commission, swaps, slippage and gap reserve exceeds 0.50% equity or margin is insufficient.
- Size down to a legal volume step; if minimum volume breaches the hard cap, skip/reject the symbol rather than distort risk.
- Use completed bars only; no look-ahead, repainting or same-bar reverse/re-entry. One position per symbol and strategy magic number. No averaging down, martingale, grid, pyramiding or discretionary filters.
- Cost assumptions and server timezone/DST must be recorded. Backtests require chronological train/validation/locked-out-of-sample splits, walk-forward, modest parameter perturbations, higher-cost stress and independent Agent 4 review.
- Any change to a rule or parameter is a new specification version. The locked test is not used for tuning.

## Required evidence
Compile log with warnings resolved; source/spec/config hashes; exact MT5 build; broker symbol metadata; raw tester report and terminal/tester logs; normalized trade ledger with costs included exactly once; cost reconciliation; chronological splits; stress/walk-forward results; independent review disposition.


## Fail conditions
- Any look-ahead, use of unfinished bars, ambiguous session conversion, or unregistered rule change.
- Minimum-volume risk exceeds 0.50% equity, margin is inadequate, or cost assumptions cannot be substantiated.
- Raw report and normalized ledger do not reconcile, or costs are omitted/double-counted.
- Performance depends on a small number of trades, unrealistic costs, or collapses under modest cost/parameter stress.
- Material code warnings, rejected/invalid orders, missing protective stops or unsupported broker assumptions.

## Approval status
Draft v1 research rules only. Agent 0 must freeze the specification after a rule/code consistency review. No candidate is approved for demo or live use by this document.


## Agent 0 freeze record
- Freeze date: 2026-10-13.
- Rules frozen: D1 126-bar close-return direction; ATR(20) stop at 3.0 ATR; exit on completed-bar direction change or stop; no same-bar reversal.
- Agent 2 source: `mql5/Experts/STRAT-001_TimeSeriesMomentum.mq5`.
- Freeze is a specification milestone only. Compile, broker feasibility and tester gates remain separate.
