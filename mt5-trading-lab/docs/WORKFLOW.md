# Acceptance gates
IDEA → RESEARCHED → SPEC_FROZEN → CODED → COMPILED → BACKTESTED → ROBUSTNESS_TESTED → INDEPENDENT_REVIEW → DEMO_FORWARD_TEST → OWNER_APPROVAL_REQUIRED.

Research must state a falsifiable hypothesis, exact rules, failure modes, data requirements, credible references and £100 feasibility. Freeze the specification before locked out-of-sample testing. Each candidate is a separate auditable EA with a source hash.

Compile in compatible MetaEditor and retain logs. Backtests must record symbol, timeframe, dates, data/tick model, initial balance/currency/leverage, spread, commissions, swaps, slippage, terminal build, test config, raw report and normalized trades. Include costs exactly once and reconcile report totals.

Use chronological train/validation/locked-test splits, walk-forward where applicable, cost stress tests, parameter sensitivity and regime breakdown. Independent review must challenge leakage, multiple testing, outlier dependence, small samples, cost realism, £100 lot-size/margin feasibility, tail risk and correlated exposure.

Demo forward-test at least 8–12 weeks and longer if trade count is insufficient. No live account funding or live order placement without separate explicit owner approval.

Guardrails: no martingale or uncontrolled grid; reject if £100 cannot support sensible sizing; review at 5% drawdown and halt/investigate at 10%. These are not guarantees.
