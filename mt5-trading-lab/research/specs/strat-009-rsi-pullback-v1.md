# RSI-PB-09 — RSI pullback in higher-timeframe trend

Candidate ID: STRAT-009
Version: v1
Status: FROZEN SPECIFICATION v1 — deterministic rules accepted for implementation. Not backtested or approved for demo/live.

## Hypothesis
A simple, deterministic rsi pullback in higher-timeframe trend rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £100 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: H1 signal with H4 trend filter.
- Instruments: Major FX only after feasibility.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
H4 trend: completed H4 EMA(50) > EMA(200) for long bias and inverse for short. On H1, RSI(14) must cross up through 30 while long bias is true, or cross down through 70 while short bias is true. Require the signal bar close to remain on the trend side of H1 EMA(100). Enter at next quote. Stop 2.0 × H1 ATR(14). Exit when RSI reaches 60 for longs / 40 for shorts, H4 trend reverses, stop is hit, or 16 completed H1 bars elapse. One position, no averaging.

## Frozen v1 parameters
H4 EMA50/200; H1 EMA100; RSI14 entry 30/70 and exit 60/40; ATR14 stop 2; time exit 16.

## Main falsification risks
Signal frequency, multi-timeframe alignment, thresholds overfit, stop gaps and costs.

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
Frozen v1 research rules only. The freeze record above fixes the initial experiment; no candidate is approved for demo or live use by this document.


## Agent 0 freeze record
- Freeze date: 2026-10-13.
- Rules frozen: completed H4 EMA(50/200) direction; H1 RSI(14) crosses up through 30 or down through 70; H1 close remains on the trend side of EMA(100); 2.0 × ATR(14) stop; exit at RSI 60/40, opposite H4 trend or after 16 completed H1 bars.
- Agent 2 source: `mql5/Experts/STRAT-009_RsiPullback.mq5`.
- Freeze is not compile, broker-feasibility, tester or deployment approval.
