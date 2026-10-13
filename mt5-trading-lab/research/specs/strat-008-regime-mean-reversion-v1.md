# REGIME-MR-08 — Range-bound mean reversion

Candidate ID: STRAT-008
Version: v1
Status: FROZEN SPECIFICATION v1 — EA compiled with zero errors and zero warnings. Not Strategy Tester tested, not broker-feasibility validated, and not approved for demo/live.

## Hypothesis
A simple, deterministic range-bound mean reversion rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £100 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: H1.
- Instruments: EURUSD/EURGBP only after feasibility and cost validation.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
Use ADX(14) from completed H1 bars as regime filter; only enter when ADX < 18. Use Bollinger Bands(20, 2 standard deviations). Long when a completed bar closes below the lower band and RSI(2) < 10; short when close is above upper band and RSI(2) > 90. Enter at next quote. Stop at 2.0 × ATR(20). Exit on close back at the Bollinger middle band, at stop, or after 8 completed H1 bars. No averaging, adding, or widening stop. Do not enter if the filter is unavailable.

## Frozen v1 parameters
ADX14 <18; BB20/2σ; RSI2 <10/>90; ATR20 stop 2; time exit 8 bars.

## Main falsification risks
Rare trend continuation losses, regime misclassification, small targets overwhelmed by costs, indicator synchronization.

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
- Rules frozen: H1 ADX(14) below 18; Bollinger(20, 2σ) close excursion plus RSI(2) below 10/above 90; 2.0 × ATR(20) stop; exit at middle band or after 8 completed H1 bars; no averaging.
- Agent 2 source: `mql5/Experts/STRAT-008_RegimeMeanReversion.mq5`.
- Freeze is not compile, broker-feasibility, tester or deployment approval.


## Implementation evidence status
- Windows MetaEditor 5.0.0.6257 compile run: [38392508850](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38392508850), source revision `63c88464af602353902e45a894a108ef9b1f385c`.
- Compiler summary: `Result: 0 errors, 0 warnings`.
- Source SHA-256: `0A53F9F05F7D186D9E17702987B45F17F6D0ED2700DABEF6B3C3FD729590B833`.
- EX5 SHA-256: `963A8399CDD53E3420C8DAD14FCA7DD79D8AC1B58EE5F4ACB5035F9B75D9392B`.
- Retained compile artifact: [11810845970](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38392508850/artifacts/11810845970).
- Compile evidence does not establish runtime behavior or strategy performance.
