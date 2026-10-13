# STRAT-002 v1 — Code-only independent review

Date: 2026-10-13
Reviewer role: Agent 4 (independent review)
Scope: written specification and MQL5 source inspection only.
Disposition: BLOCKED — not compiled; no Strategy Tester evidence; no broker contract data.
This is not a performance approval.

## Findings

### CR-01 — Cost sizing inputs are estimates, not broker-derived values (HIGH)
The EA sizes with `OrderCalcProfit` and per-lot cost allowances. That is a defensible fail-closed shape, but it is only as conservative as the configured spread, round-turn, slippage and gap values. Swaps depend on direction, holding time, symbol and rollover; a single fixed reserve may understate long-duration positions. Require the run manifest to record how each allowance was derived and compare it with tester-reported costs. No trade is acceptable while the values are unverified.

### CR-02 — Tester costs and sizing reserves can double-count or omit costs (HIGH)
The EA's sizing reserve is not itself the MT5 tester's cost model. Define and audit the two separately: sizing allowances must conservatively bound plausible adverse costs; tester spread/commission/swap settings must represent the tested broker conditions. In reporting, subtract actual costs once only. Add a reconciliation check comparing raw deal P/L, commissions, swaps and normalized net P/L.

### CR-03 — Bar-channel semantics require a fixture test (MEDIUM)
The implementation uses shifts 2..N+1, which excludes the current live bar and the just-closed signal bar from the channel. That matches the spec's interpretation of a breakout beyond the previous channel. Before strategy testing, create a deterministic synthetic-bar test where the signal bar breaks the prior channel, and verify no look-ahead and no signal-bar inclusion.

### CR-04 — Stop and broker constraints need real symbol validation (HIGH)
The EA checks `SYMBOL_TRADE_STOPS_LEVEL` but does not separately check freeze-level behavior, tick-size alignment, market execution mode, or broker-specific filling/rejection behavior. `NormalizeDouble(..., _Digits)` aligns decimal digits but does not necessarily align to `SYMBOL_TRADE_TICK_SIZE`. Add tick-size price normalization and test against real contract metadata. Verify stop placement and retcodes in a tester smoke test.

### CR-05 — Risk cap is a model, not a guaranteed maximum loss (HIGH)
Gap reserve cannot cap losses during discontinuous markets. The EA rejects minimum volume when the modeled loss exceeds 0.5% equity, but actual loss can exceed this. The owner-facing documentation must never describe the cap as guaranteed. Consider maximum spread and stale quote guards, daily equity/drawdown circuit-breakers and a fail-closed trading-hours/data-health policy before any demo proposal.

### CR-06 — Position management assumes a single position per symbol/magic (MEDIUM)
The code finds the first matching position and returns after exit handling. It intentionally blocks foreign positions on the symbol, but hedging accounts and duplicated instances should still be tested. Add a one-instance guard or explicit account-mode support; verify no duplicate order can be opened if multiple copies are attached.

### CR-07 — EA versioning is not yet tied to a test manifest (MEDIUM)
`#property version` and source filename are not sufficient evidence. Every run must bind source commit/hash, strategy-spec hash, exact tester config, terminal build, broker symbol contract, data range and cost assumptions to the report. The runner should write this automatically.

## Required actions before any performance claim
1. Obtain a zero-warning MetaEditor compile and preserve the compiler log and EX5 hash.
2. Fix CR-04 tick-size alignment and test order constraints; verify CR-06 duplicate-instance behavior.
3. Run a short mechanics-only MT5 Strategy Tester test with an explicit non-real-account configuration.
4. Record broker contract/cost data and evaluate minimum-volume loss/margin for £100.
5. Reconcile raw report and trade ledger, then run frozen chronological and stress tests.
6. Re-review all findings against actual artifacts.

## Final disposition
BLOCKED. No claim of profitability or readiness for live trading is supported.


## Follow-up after initial review
- CR-04 partial mitigation committed: the EA now rounds protective-stop prices to `SYMBOL_TRADE_TICK_SIZE` and requires a broker-reviewed `MaxSpreadPoints` ceiling before strategy enablement. This reduces known price-alignment/spread risks but is **not resolved** until compiled and exercised against real broker contract data; freeze-level and filling-mode behavior still require tester evidence.
- The local and CI compile runners now wait for the MetaEditor process and reject compiler warnings before tester execution. Automated compile is currently being retried after the first observed run revealed the process had been launched asynchronously.
- Remaining CR-01, CR-02, CR-03, CR-05, CR-06 and CR-07 remain open. No performance approval is possible at this stage.
