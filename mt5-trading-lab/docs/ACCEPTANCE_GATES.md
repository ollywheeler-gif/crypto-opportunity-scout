# Strategy acceptance gates

A candidate is a research hypothesis until it passes every gate below. A positive backtest alone is not sufficient.

## Gate 0 — Feasibility before coding
- Identify broker, exact symbol, contract size, tick size/value, volume step/minimum, margin requirement, trading hours, spread, commission, swaps/financing, and account currency.
- For £100 starting equity, calculate worst-case loss at minimum permitted volume using realistic stop distance plus spread, commission, slippage and gap allowance.
- Reject the market/strategy combination if minimum volume breaches the predeclared per-trade risk ceiling or a stop cannot be placed legally. Never inflate the deposit, silently understate risk, or remove the stop to make a candidate pass.
- Confirm whether the broker's symbol is a CFD, spot FX, future, or another instrument. Do not assume identical economics across brokers.
- The per-trade risk cap is not a maximum-loss guarantee. Define and test an account-level daily-loss stop and peak-to-trough drawdown circuit-breaker before any demo proposal; document how state persists across terminal restarts and what action is taken after a breach.

## Gate 1 — Written hypothesis
- State market mechanism, expected holding period, entry/exit rules, stop/target logic, trade frequency, allowed sessions, and failure conditions.
- State the hypothesis before viewing validation or locked out-of-sample results.
- Pre-register parameter ranges and a small, justified search budget. Record every tested variant to expose multiple-testing bias.

## Gate 2 — Data and costs
- Record broker/data source, symbol mapping, timezone/DST, data period, missing-data checks, tick/bar resolution and test model.
- Include variable spreads where available, commission, swap/financing, slippage, currency conversion, and any applicable fees. Do not subtract costs twice.
- Keep the raw MT5 report, tester log, compile log, configuration, EA source hash, terminal/build version and a run manifest.
- Reconcile trades, profit, costs, deposit currency and dates between raw report and any normalized CSV. Unexplained mismatches fail the gate.

## Gate 3 — Chronological testing
- Split chronologically into development/train, validation, and a locked out-of-sample period. Do not tune on locked results.
- Include walk-forward windows; preserve the window definitions and all runs, including failed variants.
- Run stress scenarios for worse spread, commission and slippage, delayed entry, missed trades, and parameter perturbation.
- Examine equity drawdown and intratrade risk where available, not only closed-trade drawdown.

## Gate 4 — Robustness and economics
- Report net return, trade count, exposure, average trade, profit factor, drawdown, recovery, expectancy, concentration by month/session/symbol, and uncertainty/limitations.
- Show results before and after costs, but make decisions on net-of-cost results.
- Reject fragile candidates whose result depends on a narrow parameter peak, a tiny number of trades, one exceptional period, or unrealistic execution assumptions.
- A candidate must remain feasible at the actual intended capital and broker constraints. Small sample sizes must be explicitly marked as inconclusive.

## Gate 5 — Independent review
- Reviewer receives source, written hypothesis, all run artifacts and all variants—not just the best run.
- Reviewer attempts to falsify the result, checks look-ahead/data leakage, survivorship, selection bias, execution assumptions, position sizing, and code safety.
- Any material change to rules or parameters creates a new candidate version and requires retesting.

## Gate 6 — Demo forward test
- Use a demo account only, with fixed version and logged expected-vs-actual fills, spreads, slippage, rejects, swaps and outages.
- Verify the daily-loss and peak-drawdown circuit-breakers trigger at their registered thresholds, persist correctly across restarts, and require deliberate review/reset after a breach. Do not assume stop-loss orders cap gap losses.
- Predeclare a minimum duration/trade count appropriate to the strategy; do not stop early because results look good.
- No automatic transition to a live account. Live use requires separate, explicit owner approval after reviewing evidence and risks.

## Decision labels
- REJECTED: hard constraint, safety issue or material failure.
- INCONCLUSIVE: insufficient trades/data or conflicting evidence.
- RESEARCH: plausible hypothesis; evidence incomplete.
- DEMO_CANDIDATE: all research gates passed; demo evidence pending/underway.
- LIVE_REVIEW_ONLY: demo gate passed and package ready for a separate human decision. This label never authorizes live trading.
