# STRAT-002 — Donchian breakout with ATR risk control (v1)

Status: FROZEN RESEARCH SPECIFICATION v1 — EA compiled with zero errors and zero warnings; not Strategy Tester tested, not broker-feasibility validated, and not approved for demo/live use.

## Hypothesis
A close beyond a prior-period price channel may capture persistent directional moves in liquid instruments. The effect may disappear after costs, be regime-dependent, or be too expensive to trade at £200. The experiment is designed to falsify the hypothesis, not assume profitability.

## Initial test scope
- First instrument: one broker-specific major FX symbol selected only after contract, costs and minimum volume are known.
- Timeframe: H1.
- Direction: long and short.
- No multi-symbol portfolio in v1. No pyramiding, averaging down, martingale or grid.
- Use the broker's MT5 historical data and record server timezone and daylight-saving treatment.

## Deterministic rules
At the close of each completed H1 bar:
1. Compute the highest high and lowest low over the preceding 20 completed bars, excluding the current bar.
2. Long entry signal: the just-closed bar closes strictly above the prior 20-bar highest high.
3. Short entry signal: the just-closed bar closes strictly below the prior 20-bar lowest low.
4. Only evaluate a new signal once per completed bar. At most one position per symbol/magic number; no reverse-and-reenter on the same bar.
5. Initial protective stop distance is 2.0 times ATR(20), calculated from completed bars. Reject a trade if ATR is zero/invalid or the stop violates broker stop/freeze constraints.
6. Exit long if a completed bar closes below the prior 10-bar lowest low; exit short if a completed bar closes above the prior 10-bar highest high. Exits are evaluated before a new entry. The exit channel excludes the current bar.
7. No fixed profit target in v1. No discretionary/news filter. All decisions use completed bars only.

## Risk and feasibility
- Intended account reference is £200, but do not assume a minimum volume can meet the risk budget.
- Target risk budget for feasibility analysis: 0.25% of equity; hard reject if estimated loss at minimum volume including stop, spread, commission, slippage and gap allowance exceeds 0.5% of equity.
- Size positions from stop distance and broker tick value only when the calculated volume can be rounded down to a legal volume step and remains at or above the minimum volume. Otherwise skip the trade.
- If broker-specific loss/margin calculation cannot be verified, do not trade; mark the symbol infeasible/unknown.
- A stop price is not a guarantee of execution price, especially across gaps or illiquid conditions.

## Pre-registered parameters
- Entry channel: 20 bars.
- Exit channel: 10 bars.
- ATR period: 20 bars.
- Stop multiplier: 2.0.
- Test H1 only for this version. Any other parameter combination is a separately recorded experiment, not a replacement for this version.

## Test protocol
1. Verify data integrity and broker symbol economics.
2. Run a compile smoke test; archive full compiler log and source hash.
3. Run a short tester smoke test only to validate order/exit mechanics; do not interpret it as performance evidence.
4. Run chronological train/validation/locked out-of-sample windows, with dates fixed before results are inspected.
5. Run walk-forward and stress scenarios with worse spread, commission, slippage and parameter perturbations.
6. Preserve every run, including failures. Reconcile MT5 raw reports and trade exports.
7. Have the independent reviewer check look-ahead bias, bar indexing, sizing, stop logic, trading constraints, costs and multiple-testing risk.

## Fail conditions
- Any look-ahead/current-bar leakage.
- Unexplained difference between raw report and normalized trade ledger.
- Minimum-lot risk above the hard cap or insufficient margin.
- Net results depend on unrealistic cost assumptions or a tiny number of trades.
- Results collapse under modest cost/parameter stress.
- Compiler warnings/errors affecting correctness, unsafe order handling, or missing protective stops.

## Required evidence before changing status
Source and commit hash; compiler/build details; compile log; exact tester configuration; raw tester report; tester/terminal logs; normalized trades; cost reconciliation; train/validation/OOS definitions; stress/walk-forward outputs; independent review. Until then, status remains RESEARCH.


## Implementation evidence status
- Windows MetaEditor 5.0.0.6257 compile run: [38391736678](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391736678), source revision `0676e9066aaf98f12aa22c5a5b3da769cd144a4a`.
- Compiler summary: `Result: 0 errors, 0 warnings`.
- Source SHA-256: `2B1E3E48BBD7EDCE5B1C80EC25B98F1764468464BCD30B7351271F6269810CFB`.
- EX5 SHA-256: `17506A9D1AC08FDD8624039EF6A348081CDB70E402738E4A9E6B0326F8E401E6`.
- Retained compile artifact: [11809281108](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391736678/artifacts/11809281108).
- This evidence proves compilation only. It does not prove correct order behavior, feasible minimum size, realistic costs or positive expectancy.
