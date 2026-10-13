# EMA-TREND-03 — EMA trend baseline

Candidate ID: STRAT-003
Version: v1
Status: FROZEN SPECIFICATION v1 — EA compiled with zero errors and zero warnings. Not Strategy Tester tested, not broker-feasibility validated, and not approved for demo/live.

## Hypothesis
A simple, deterministic ema trend baseline rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £100 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: H4.
- Instruments: One major FX symbol, then gold only if feasible.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
On completed H4 bars calculate EMA(20) and EMA(100). Long when EMA20 crosses from at/below to above EMA100; short on the opposite cross. Enter at next available quote. Initial stop is 2.0 × ATR(20), computed on the signal bar. Exit on opposite EMA cross or stop. No profit target or trailing stop. At most one position; no reverse on the exit bar.

## Frozen v1 parameters
Fast EMA 20; slow EMA 100; ATR 20; stop 2.0 ATR.

## Main falsification risks
Whipsaw in ranges, indicator warm-up, financing, few independent trades.

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
- Rules frozen: H4 EMA(20/100) cross; ATR(20) initial stop at 2.0 ATR; exit on opposite completed-bar cross or stop; no same-bar reversal; no pyramiding.
- Agent 2 source: `mql5/Experts/STRAT-003_EMATrend.mq5`.
- Freeze is a specification milestone only. It does not imply compile, broker feasibility, strategy performance or deployment approval.


## Implementation evidence status
- Windows MetaEditor 5.0.0.6257 compile run: [38391736678](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391736678), source revision `0676e9066aaf98f12aa22c5a5b3da769cd144a4a`.
- Compiler summary: `Result: 0 errors, 0 warnings`.
- Source SHA-256: `955C5F25C05FE8B5BCEF6ED951EC97401B97B70F7FB07462477956234707701B`.
- EX5 SHA-256: `B0B51DA50FB242619D3D0D0C9D6BBBD22F5007164F696A14182732CC03570CFB`.
- Retained compile artifact: [11809281108](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391736678/artifacts/11809281108).
- Compile evidence does not establish runtime behavior or strategy performance.
