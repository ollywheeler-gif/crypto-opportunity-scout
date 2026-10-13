# LONDON-05 — London range breakout

Candidate ID: STRAT-005
Version: v1
Status: FROZEN SPECIFICATION v1 — deterministic session rules accepted for implementation. Not backtested or approved for demo/live.

## Hypothesis
A simple, deterministic london range breakout rule may capture a repeatable market effect, but it may fail after realistic costs, regime changes and the £200 feasibility constraint. The test must attempt to falsify the idea.

## Initial scope
- Timeframe: M15.
- Instruments: EURUSD or GBPUSD only, if broker session and spread are documented.
- No multi-symbol portfolio in v1. Signals use completed bars only. Entries execute on the next available quote after signal close.

## Deterministic rules
Define the session in Europe/London civil time with daylight-saving conversion explicitly tested. Range is high/low of bars whose opening timestamps are 07:00–07:45 London time. Starting with the first completed bar whose close time is at/after 08:00 London, enter long if a completed M15 close is above range high, or short below range low. At most one entry attempt per London date. Stop on the opposite side of the range; skip if range is zero or stop distance exceeds 2.0 × ATR(20). Close any position at 16:00 London time; no overnight holding. Enter at next quote after signal close.

## Frozen v1 parameters
Range 07:00–07:45 London; trade window 08:00–15:45; max one attempt/date; ATR20 filter.

## Main falsification risks
DST/calendar errors, broker bar timestamps, spread spikes, entry slippage, stop too large for £200.

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


## Agent 0 freeze record
- Freeze date: 2026-10-13.
- Supported v1 broker-time scope: only brokers whose server clock uses European DST transitions and whose winter/summer UTC offsets are explicitly recorded. If that condition cannot be confirmed from broker documentation and tester history, this EA must remain disabled; do not infer offsets.
- Rules frozen: London 07:00–07:45 M15 range; breakout closes between 08:00 and 15:45 London time; one qualifying attempt per London date persisted across restarts; opposite-range stop; skip if range exceeds 2.0 × ATR(20); close at 16:00 London time.
- Agent 2 source: `mql5/Experts/STRAT-005_LondonBreakout.mq5`.
- Freeze is not compile, session-validation, broker-feasibility, tester or deployment approval.
