# STRAT-002 v1 — Code-only independent review

Date: 2026-10-13
Reviewer role: Agent 4 (independent review)
Scope: written specification and MQL5 source inspection, plus verified compiler evidence. No runtime trade mechanics or performance review has been performed.
Disposition: BLOCKED — MetaEditor compile is verified with zero errors/warnings; no Strategy Tester evidence or broker contract data.
This is not a performance approval.

## Findings

### CR-01 — Cost sizing inputs are estimates, not broker-derived values (HIGH)
The EA sizes with `OrderCalcProfit` and per-lot cost allowances. That is a defensible fail-closed shape, but it is only as conservative as the configured spread, round-turn, slippage and gap values. Swaps depend on direction, holding time, symbol and rollover; a single fixed reserve may understate long-duration positions. Require the run manifest to record how each allowance was derived and compare it with tester-reported costs. No trade is acceptable while the values are unverified.

### CR-02 — Tester costs and sizing reserves can double-count or omit costs (HIGH)
The EA's sizing reserve is not itself the MT5 tester's cost model. Define and audit the two separately: sizing allowances must conservatively bound plausible adverse costs; tester spread/commission/swap settings must represent the tested broker conditions. In reporting, subtract actual costs once only. Add a reconciliation check comparing raw deal P/L, commissions, swaps and normalized net P/L.

### CR-03 — Bar-channel semantics require a fixture test (MEDIUM)
The implementation uses shifts 2..N+1, which excludes the current live bar and the just-closed signal bar from the channel. That matches the spec's interpretation of a breakout beyond the previous channel. Before strategy testing, create a deterministic synthetic-bar test where the signal bar breaks the prior channel, and verify no look-ahead and no signal-bar inclusion.

### CR-04 — Stop and broker constraints need real symbol validation (HIGH)
The EA now aligns protective-stop prices to `SYMBOL_TRADE_TICK_SIZE` and applies a broker-reviewed maximum-spread gate. Freeze-level behavior, market execution mode, and broker-specific filling/rejection behavior still need real-symbol validation. Verify stop placement and retcodes in a tester smoke test.

### CR-05 — Risk cap is a model, not a guaranteed maximum loss (HIGH)
Gap reserve cannot cap losses during discontinuous markets. The EA rejects minimum volume when the modeled loss exceeds 0.5% equity, but actual loss can exceed this. The owner-facing documentation must never describe the cap as guaranteed. Consider maximum spread and stale quote guards, daily equity/drawdown circuit-breakers and a fail-closed trading-hours/data-health policy before any demo proposal.

### CR-06 — Position management assumes a single position per symbol/magic (MEDIUM)
The code finds the first matching position and returns after exit handling. It intentionally blocks foreign positions on the symbol, but hedging accounts and duplicated instances should still be tested. A terminal global-variable lock has been added per symbol/magic to block duplicate instances. This must still be verified under MT5 lifecycle/restart tests.

### CR-07 — EA versioning is not yet tied to a test manifest (MEDIUM)
`#property version` and source filename are not sufficient evidence. Every run must bind source commit/hash, strategy-spec hash, exact tester config, terminal build, broker symbol contract, data range and cost assumptions to the report. The runner should write this automatically.

## Required actions before any performance claim
1. Keep zero-warning MetaEditor compile evidence and source/EX5 hashes for every EA revision.
2. Test tick-size alignment, freeze/filling behavior and duplicate-instance lock lifecycle in MT5.
3. Run a short mechanics-only MT5 Strategy Tester test with an explicit non-real-account configuration.
4. Record broker contract/cost data and evaluate minimum-volume loss/margin for £100.
5. Reconcile raw report and trade ledger, then run frozen chronological and stress tests.
6. Re-review all findings against actual artifacts.

## Final disposition
BLOCKED. No claim of profitability or readiness for live trading is supported.


## Follow-up after initial review
- CR-04 partial mitigation committed: the EA now rounds protective-stop prices to `SYMBOL_TRADE_TICK_SIZE` and requires a broker-reviewed `MaxSpreadPoints` ceiling before strategy enablement. This reduces known price-alignment/spread risks but is **not resolved** until compiled and exercised against real broker contract data; freeze-level and filling-mode behavior still require tester evidence.
- The local and CI compile runners now wait for the MetaEditor process and reject compiler warnings before tester execution. Automated Windows compilation is now verified for the current source set; runtime mechanics and broker-specific behavior remain untested.
- Remaining CR-01, CR-02, CR-03, CR-05, CR-06 and CR-07 remain open. No performance approval is possible at this stage.


## Compiler evidence update
- Windows MetaEditor compile completed with zero errors and zero warnings on MetaEditor 5.0.0.6257; this was repeated on commit `0bff4101125e454cf99832263f53f3dd8245218b`.
- Verified artifact: [latest compile evidence for run 38390561997](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390561997/artifacts/11809150759).
- EX5 SHA-256 on the latest verified compile: `887377FEC79B08C23B33559BF8EF7F1150F575635D4457672A19FA8137AB345F`.
- This resolves the compile prerequisite for the source revision represented by that run only. Any subsequent EA source change requires another compile. The overall disposition remains BLOCKED until mechanics testing, broker feasibility and cost reconciliation are complete.


## Latest compile status
Both STRAT-002 and STRAT-003 were compiled on Windows run [38390955133](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390955133) using MetaEditor 5.0.0.6257 with zero errors and zero warnings. Combined artifact: [11807953266](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390955133/artifacts/11807953266). This resolves compilation for that source revision only; no Strategy Tester or broker feasibility evidence exists. Review disposition remains BLOCKED.


## Latest verified compile — 2026-10-13
- Windows run [38394444863](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38394444863) compiled STRAT-001/002/003/004/005/007/008/009 plus the no-order symbol contract exporter on MetaEditor 5.0.0.6257 with zero errors and zero warnings.
- Combined artifact [11811545078](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38394444863/artifacts/11811545078) contains the compiler logs, EX5 binaries and manifests. Current STRAT-002 source SHA-256: `FB878706B50D6A6265020C95B8E665CAE4EEE96418E4A9F3343A51892953B298`; EX5 SHA-256: `777159AFD7BEBC8DA07548DE12420AC8F36D14DA04C23DE43395EBB7957DADBA`.
- Compilation is resolved for that exact source revision. CR-01, CR-02, CR-03, CR-05, CR-06 and CR-07 remain open; the overall disposition remains **BLOCKED** pending tester mechanics, broker feasibility, cost reconciliation and runtime lifecycle evidence.
