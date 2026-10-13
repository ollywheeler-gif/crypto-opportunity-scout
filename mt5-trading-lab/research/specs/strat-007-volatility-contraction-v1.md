# VOL-COMP-07 — Volatility contraction breakout

Candidate ID: STRAT-007
Version: v1
Status: FROZEN SPECIFICATION v1 — deterministic setup state and expiry accepted for implementation. Not backtested or approved for demo/live.

## Hypothesis
A simple, deterministic volatility contraction breakout rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £100 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: H1.
- Instruments: One major FX symbol; extend to gold/indices only after separate feasibility.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
On completed H1 bars compute ATR(10) and ATR(50). Arm a setup only when the ratio crosses from at/above 0.70 to below 0.70. The contraction bar itself cannot trigger an entry. For each of the next 12 completed H1 bars, enter long if the close is above the high of the preceding 20 bars (excluding the signal bar), or short if the close is below the low. Enter at the next quote. Stop at 2.0 × ATR(20). Exit on an opposite 10-bar Donchian close or stop. If no breakout occurs within those 12 eligible bars, expire the setup. Do not arm another setup until the ratio has returned to at/above 0.70 and crosses below again.

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


## Agent 0 freeze record
- Freeze date: 2026-10-13.
- Rules frozen: ATR(10)/ATR(50) crosses below 0.70 to arm; contraction bar cannot trigger; next 12 completed H1 bars are eligible; 20-bar prior channel breakout; 2.0 × ATR(20) stop; opposite 10-bar exit channel; setup expires without a breakout.
- Agent 2 source: `mql5/Experts/STRAT-007_VolatilityContraction.mq5`.
- Freeze is not compile, broker-feasibility, tester or deployment approval.
