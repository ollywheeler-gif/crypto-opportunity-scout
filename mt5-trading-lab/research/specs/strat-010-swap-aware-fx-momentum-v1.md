# CARRY-FX-10 — Swap-aware FX momentum

Candidate ID: STRAT-010
Version: v1
Status: SPECIFICATION DRAFT — not implemented, compiled, backtested or approved.

## Hypothesis
A simple, deterministic swap-aware fx momentum rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £200 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: D1.
- Instruments: One major FX symbol only after historical broker swap schedule and symbol specifications are obtained.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
Use 63-bar D1 return direction: long if close[1] > close[64], short if lower. Entry only if the broker's documented current long/short swap rate for the intended direction is non-negative after triple-swap day treatment is understood; if the broker does not expose reliable historical swap data, mark the strategy untestable rather than assume historical carry. Stop 3.0 × ATR(20). Exit on 63-bar direction change, stop, or after 60 completed D1 bars. Tester swap history must be verified separately from the current quoted rate.

## Frozen v1 parameters
63-bar direction; ATR20 stop 3; maximum hold 60 D1 bars; documented swap filter.

## Main falsification risks
Historical swap schedule unavailable, swap changes, triple rollover, holidays, spread and conversion. Hard-blocked without defensible historical financing assumptions.

## Shared hard gates
- Research-only. No live account, no paid data, no performance claim until actual MT5 evidence exists.
- First feasibility instrument must be chosen from a broker's published symbol contract. £200 account reference; target risk 0.25%, reject if modeled minimum-volume loss including spread, commission, swaps, slippage and gap reserve exceeds 0.50% equity or margin is insufficient.
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
