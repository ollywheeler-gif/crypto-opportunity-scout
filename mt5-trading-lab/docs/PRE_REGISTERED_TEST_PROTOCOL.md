# Pre-registered testing protocol — research-only

Version: 1.0
Applies to STRAT-001 time-series momentum, STRAT-002 Donchian breakout, STRAT-003 EMA trend and STRAT-004 trend pullback unless a candidate-specific addendum is committed before any results are inspected.
Status: Proposed fixed protocol; the data dates are conditional on available, verified history. Any change must be committed before looking at validation/locked results.

## Evidence hierarchy

1. Broker contract metadata and minimum-volume feasibility.
2. Clean zero-warning compile for the exact source commit.
3. Mechanics-only smoke test, including order requests, stop acceptance, position lifecycle and no duplicate instance.
4. Cost reconciliation on actual raw report/deal data.
5. Chronological performance tests.
6. Robustness and independent review.
7. Demo forward testing after earlier gates pass.

A later stage cannot rescue a failure in an earlier stage. No performance metric is meaningful until the raw report, configuration, logs, and cost ledger reconcile.

## Chronological split policy

Use broker-consistent, timestamped data and preserve the source coverage manifest. Preferred fixed calendar windows:
- **Training:** 2010-01-01 through 2017-12-31.
- **Validation:** 2018-01-01 through 2020-12-31.
- **Locked out-of-sample:** 2021-01-01 through 2025-12-31.

These windows are a pre-registration default, not an assertion that any selected broker has valid data back to 2010. If coverage is shorter, record the exact available dates and freeze replacement split boundaries before viewing results. Never silently treat missing bars as flat prices. Use a warm-up period before each evaluation window, excluded from scored results.

No parameter is tuned on the locked out-of-sample period. If a candidate is changed after any result is reviewed, increment the spec version and define a new future/untouched locked window before testing again.

## Fixed first-pass rules

- Test frozen v1 parameters only; no optimization pass on the first run.
- Use the same symbol contract, price history, account currency, deposit, leverage, timezone, and broker assumptions for comparisons wherever applicable.
- Use the most accurate MT5 tick model available for the source data. Document if "Every tick based on real ticks" is unavailable; do not describe a coarser model as equivalent.
- Include spread, commission, swaps/financing, slippage allowance, currency conversion and gap stress. Distinguish sizing reserves from actual tester costs to prevent double counting.
- Record trade count, net return, expectancy, profit factor, maximum drawdown, consecutive losses, monthly outcomes, exposure, holding time, and cost contribution. Metrics alone do not approve a strategy.
- Stress at minimum: baseline costs; 1.5× spread and commission; 2× slippage allowance; one-bar entry delay where implementable; and perturbed parameters ±10% without selecting the best variant. Report all variants.
- Keep all raw reports and failed runs. Do not publish only the best run.

## Rejection gates

Reject or keep blocked if:
- minimum-volume modeled loss exceeds 0.50% of equity, margin is inadequate, or broker contract data are not verified;
- no fresh zero-warning compile exists for the exact source hash;
- tester configuration or cost assumptions cannot be reproduced;
- raw deal P/L does not reconcile with commission, swap and fees exactly once;
- material tester warnings, order rejections, invalid stops, or duplicate-entry behavior remain unexplained;
- profitability is concentrated in a few trades, depends on one market regime, or fails under the predeclared stress tests;
- locked out-of-sample results have been used to tune rules.

## Required manifest fields

Candidate/spec version, source commit and SHA-256, EX5 SHA-256, MetaEditor/terminal build, broker/server, symbol contract metadata, data source and coverage, date split, tester model, timezone/DST, deposit/currency/leverage, spread/commission/swap/slippage assumptions, report/config/log hashes, normalized ledger, cost reconciliation output, stress variants, limitations and Agent 4 disposition.

## Current execution status

The first two EAs have compile evidence with zero errors and zero warnings. No mechanics smoke test, broker feasibility result, real-market backtest, cost-reconciled ledger or performance conclusion exists yet. This document is a method lock, not a result.
