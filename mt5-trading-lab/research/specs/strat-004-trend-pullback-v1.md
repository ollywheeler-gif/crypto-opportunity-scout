# PULLBACK-04 — Higher-timeframe trend pullback

Candidate ID: STRAT-004
Version: v1
Status: SPECIFICATION DRAFT — not implemented, compiled, backtested or approved.

## Hypothesis
A simple, deterministic higher-timeframe trend pullback rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £100 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: H1 signal with H4 trend filter.
- Instruments: Major FX only, selected after feasibility.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
H4 trend filter: last completed H4 EMA(50) > EMA(200) for longs, < for shorts. On H1, use RSI(2). In an H4 uptrend, enter long when completed H1 RSI(2) closes below 10 and the H1 close is above H4 EMA(50) sampled from the latest completed H4 bar. For shorts, inverse rules with RSI(2) above 90 and close below H4 EMA(50). Enter next available quote. Stop at 2.0 × H1 ATR(14); exit after 12 completed H1 bars, at stop, or if H4 trend filter reverses. No averaging or adding.

## Frozen v1 parameters
H4 EMA 50/200; H1 RSI 2 thresholds 10/90; ATR14; max holding 12 H1 bars; stop 2 ATR.

## Main falsification risks
Intrabar H4/H1 alignment, sparse trades, extreme RSI sensitivity, costs and trend filter timing.

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
