# VOL-COMP-07 — Volatility contraction breakout

Candidate ID: STRAT-007
Version: v1
Status: SPECIFICATION DRAFT — not implemented, compiled, backtested or approved.

## Hypothesis
A simple, deterministic volatility contraction breakout rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £100 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: H1.
- Instruments: One major FX symbol; extend to gold/indices only after separate feasibility.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
On completed H1 bars compute ATR(10) and ATR(50). A contraction setup exists when ATR(10) / ATR(50) < 0.70 on the signal bar. Enter long if the same completed bar closes above the high of the preceding 20 bars (excluding the signal bar), short if below the low. Enter at next quote. Stop at 2.0 × ATR(20). Exit on opposite 10-bar Donchian close or stop. If no qualifying breakout occurs within the next 12 bars after contraction first appears, the setup expires.

## Frozen v1 parameters
ATR10/ATR50 ratio <0.70; entry channel 20; exit 10; stop 2 ATR20; setup expires after 12 bars.

## Main falsification risks
Threshold instability, overlapping setup definitions, low sample size, costs and volatility clustering.

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
