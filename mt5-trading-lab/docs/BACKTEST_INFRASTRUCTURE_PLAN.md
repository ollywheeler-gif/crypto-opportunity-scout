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
7. Run the £200 feasibility gate before expanding to more symbols/strategies.
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

## ChatGPT-led delivery clarification (2026-10-13)
Keep the work inside this ChatGPT conversation wherever possible: use ChatGPT for research, code changes, source review, test interpretation and decision-making; use GitHub as the auditable workspace and GitHub Actions for deterministic automation. Do not create or outsource to a separate multi-agent service as a prerequisite for backtesting.

The next engineering deliverable is the dedicated Windows Strategy Tester workflow, first in a no-credential validation mode that proves configuration validation, clean compilation, test launch safeguards, fresh-report detection, artifact packaging and failure reporting. This dry run must not be described as a completed backtest. Then add broker-demo history access only if the chosen MT5 testing route genuinely requires authentication.

The owner does not need to upload GitHub login details. If a broker demo login is eventually required for unattended broker-specific testing, the owner should enter it directly as a narrowly scoped GitHub Actions secret after we have verified the exact secret names and workflow permissions. Do not request or accept credentials in ChatGPT.

First backtest should use one frozen candidate and one instrument, selected only after the £200 feasibility check. The test's raw report, tester journal, source/build hashes, symbol metadata, cost ledger and report reconciliation are mandatory. Only after this passes should the team expand to additional candidates or symbols.

## Public broker evidence and preliminary £200 viability screen (2026-10-13)

### Public facts verified from Pepperstone UK pages
- Free demo accounts are available, MT5 is supported, and the broker says demo accounts can use virtual funds and live prices. The broker cautions that demo execution may not reflect live conditions: https://pepperstone.com/en-gb/trading/demo-account
- UK retail leverage for major FX pairs is listed as up to 1:30: https://pepperstone.com/en-gb/trading/costs-and-fees
- EURUSD Razor average spread is published as 0.1 pip for the August 2026 observation window; minimum spread is 0.0. Standard EURUSD spread is listed as 1.0 pip minimum and 1.1 pip average. Spreads vary: https://pepperstone.com/en-gb/markets/forex/pairs-and-spreads
- Razor MT4/MT5 commission for a GBP-denominated account is £2.25 per standard lot per side, proportionally adjusted for smaller trades: same spread/commission page.
- Forex standard lot size is 100,000 base units; Pepperstone's educational page describes micro lots as 1,000 units (0.01 standard lot): https://pepperstone.com/en-gb/insights/guides/cfds/what-is-cfd-trading and https://pepperstone.com/en-gb/markets/forex
- UK entity and retail major-FX leverage are listed in the regulated offices page: https://pepperstonegroup.com/en/regulated-offices

### Preliminary arithmetic — not broker-terminal verification
Assume EURUSD, GBP account, 0.01 lot minimum (must be confirmed in MT5), and roughly USD 10 pip value per standard lot, so about USD 0.10/pip at 0.01 lot. At a notional EURUSD rate near 1.10 and USD/GBP near 0.75, this is about £0.075/pip. This FX conversion is an illustrative sensitivity assumption, not a live quote.
- £200 × 0.25% target risk = £0.50.
- £200 × 0.50% hard risk ceiling = £1.00.
- Razor round-turn commission at 0.01 lot = £2.25 × 2 × 0.01 = £0.045, before spread, swap, slippage or gap reserve.
- Using a 0.1 pip average Razor spread as a rough baseline adds around £0.0075 at 0.01 lot. Actual spread and conversion vary.
- This leaves less than about £0.95 of the hard cap for stop-price loss and all other reserves, equivalent to roughly 12 pips at this illustrative pip value. The £0.50 target allows only around 6 pips before costs.
- STRAT-001 uses a frozen D1 stop at 3 × ATR(20). Unless daily ATR is unusually tiny (around 4 pips or less under the assumptions above), minimum volume is likely to exceed the £1 hard cap. Thus the £200 constraint is **preliminarily incompatible with STRAT-001 on EURUSD at 0.01 lot**, even though approximate margin for a 0.01-lot EURUSD position at 1:30 is likely within £200.

### Decision and next evidence
- Do not enable STRAT-001 or describe it as broker-feasible on a £200 account. Keep it blocked pending actual symbol metadata and a stop-distance calculation from the selected MT5 terminal.
- This public evidence is useful for screening only. It does not establish the actual demo server, account type, symbol suffix, volume min/step, tick value, current spread, margin, swaps, history availability or execution costs.
- Once the owner creates a free Pepperstone MT5 demo with GBP account currency and a virtual balance of £200, run `ExportSymbolContract.mq5` on EURUSD (including any broker suffix) and preserve the exported CSV. Then populate `research/capital_feasibility_template.csv` with the frozen strategy's actual stop distance and conservative cost/gap allowances. Do not share credentials in ChatGPT.
- If the minimum volume fails, the correct outcome is to reject that symbol/strategy combination, not raise the risk cap. Continue screening other frozen candidates/instruments only with their actual stop geometry and broker contract data.

