# INDEX-ORB-06 — Index opening-range breakout

Candidate ID: STRAT-006
Version: v1
Status: SPECIFICATION DRAFT — not implemented, compiled, backtested or approved.

## Hypothesis
A simple, deterministic index opening-range breakout rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £100 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: M15.
- Instruments: One cash-index CFD only after official broker trading hours and minimum size are verified.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
Use broker-documented cash-session open converted to broker server time for each date. Opening range is high/low of the first four completed M15 bars from session open. Starting after the range is complete, enter on a completed M15 close above/below the range. One attempt per session, no re-entry. Stop at the opposite side of the range; skip if range is zero or estimated minimum-volume risk breaches cap. Close at the broker-documented session end minus 15 minutes; no overnight positions.

## Frozen v1 parameters
Four M15 bars; one attempt/session; no parameter tuning before first test.

## Main falsification risks
Session calendars/holidays, index CFD contract size, opening slippage and gap exposure. No test before broker hours are recorded.

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
