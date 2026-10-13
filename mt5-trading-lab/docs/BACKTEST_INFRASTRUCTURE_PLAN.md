# Backtest infrastructure: lowest-friction route

## Decision
Do not purchase a permanent Windows VM yet. Use the existing GitHub Actions Windows hosted runner for batch MT5 Strategy Tester jobs. The repository already runs official MT5/MetaEditor installation and EA compilation on `windows-latest`; the next step is to extend this into a tester job with auditable artifacts.

For the first broker-specific test environment, use a **free Pepperstone MT5 demo account** as the candidate source of broker history and symbol specifications. This is a candidate selection for research only, not an endorsement or a live-account recommendation. Account-holder registration must be completed by the owner. Demo conditions may not match live execution.

For independent data checks and a parallel Python research stream, use **Dukascopy's free historical-data export** where the instrument coverage, time zone, and data format can be aligned. Do not treat Dukascopy data as identical to a broker's CFD quote history.

## Sourced references
- Official MT5 Windows runner is already defined in `../.github/workflows/mt5-mql5-compile.yml`; hosted execution uses `windows-latest`.
- [Pepperstone UK demo account](https://pepperstone.com/en-gb/trading/demo-account): free demo; MT5 available; includes access to FX, indices and commodities; demo accounts may expire after inactivity and demo execution may not reflect live conditions.
- [Pepperstone UK costs and fees](https://pepperstone.com/en-gb/trading/costs-and-fees): published spread/commission/funding information. Use the demo terminal's exact symbol metadata as the source of truth for symbol-specific settings.
- [Dukascopy Historical Data Export](https://www.dukascopy.com/swiss/english/marketwatch/historical/): free downloadable historical data for a range of instruments, including CSV exports.
- [MT5 official startup configuration](https://www.metatrader5.com/en/terminal/help/start_advanced/start): documents `terminal64.exe /config:<ini>` and the `[Tester]` configuration keys used to start a backtest.
- [MT5 historical-data preparation](https://www.metatrader5.com/en/terminal/help/algotrading/test_preparation): explains tester history synchronization and real-tick availability/limitations.
- [Tracking issue](https://github.com/ollywheeler-gif/crypto-opportunity-scout/issues/2): acceptance checklist for implementing the workflow.

## Why this is the quickest low-cost route
- No always-on VPS bill while the work is primarily research and batch tests.
- Windows is available on-demand through the repository's existing CI provider.
- Broker history and symbol metadata can be captured from a demo account without depositing funds.
- A second data source supports independent spot checks and research, while its differences from broker CFD quotes are recorded rather than hidden.

## The one unavoidable external dependency
A broker-specific MT5 history feed and exact symbol contract need a broker demo environment. The owner must register for the free demo directly, because it requires personal details. If credentials are needed by unattended CI, add them only as GitHub Actions repository secrets and never paste them into ChatGPT, issues, source files or logs. The workflow must fail closed when secrets are missing and must never connect to a live account.

No paid cloud resource, subscription, funded account or live trading is authorized.

## Engineering sequence
1. Add a dedicated Windows tester workflow, separate from compile-only checks.
2. Install and Authenticode-verify the official MT5 installer; compile every EA source that changed.
3. Build the test INI at runtime from reviewed, non-secret settings. Keep authentication outside the INI/artifacts; redact logs and clean temporary credential files.
4. Test one frozen strategy and one instrument first, with a short smoke period to verify report generation and shutdown.
5. Run a pre-registered chronological period with real ticks when the broker has them; otherwise label the modelling mode and coverage precisely.
6. Retain source hash, build/compiler log, test INI with secrets excluded, symbol contract CSV, terminal/tester journals, raw report, normalized trades, cost reconciliation and SHA-256 manifest.
7. Run the £100 feasibility gate before expanding to more symbols/strategies.
8. Independently audit data, costs, leakage, drawdown and robustness before reporting a result.
9. Cross-check a small subset against Dukascopy where a valid comparable instrument and period exist.

## Reporting labels
- `COMPILE_ONLY`: source compiled; no performance result.
- `SMOKE_TEST`: tests that the tester pipeline and report capture work; not evidence of profitability.
- `BACKTEST_PENDING_RECONCILIATION`: actual tester report exists but has not passed the evidence checks.
- `BACKTEST_RECONCILED`: raw report, logs, settings, data coverage and costs reconciled.
- `INDEPENDENT_REVIEW_PASSED`: independent reviewer accepted the evidence. This still does not guarantee future performance.

## Critical caution
Do not optimize parameters on the final evaluation period. Freeze hypotheses and settings before chronological out-of-sample and walk-forward tests. Real-tick mode is preferred where available, but it is only as good as the underlying broker history. A clean compile, a synthetic test, or a Python proxy must never be described as a completed MT5 backtest.
