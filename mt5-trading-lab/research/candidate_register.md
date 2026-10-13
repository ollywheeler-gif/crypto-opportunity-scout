# Candidate register — research hypotheses, not results

**Status:** Ten initial hypotheses. DON-02 has a written v1 specification and initial MQL5 source (`STRAT-002_DonchianBreakout.mq5`), but it is still research-only: not compiled, not backtested, and not approved for demo/live use. The other nine now have deterministic v1 research-spec drafts, but none is implemented, compiled or backtested. Ranking prioritizes testability, lower turnover, and falsifiability—not expected profit.

## Evidence informing the shortlist
- Time-series momentum has been documented across liquid futures in currencies, equity indices, commodities, and bonds over long historical samples; this is research evidence, not proof that a retail CFD implementation remains profitable after costs: https://doi.org/10.1016/j.jfineco.2011.11.003
- Currency momentum research reports meaningful transaction-cost sensitivity and unstable returns across time: https://www.sciencedirect.com/science/article/pii/S0304405X12001353
- A 2024 study emphasizes that transaction costs and price impact can materially reduce currency strategy performance: https://www.sciencedirect.com/science/article/pii/S0304405X24001090
- MT5 Strategy Tester requirements and EA testing behaviour must be checked against the actual terminal build: https://www.mql5.com/en/docs/runtime/testing

## Initial candidates

| ID | Candidate hypothesis | Initial instruments / timeframe | Main falsification risks |
|---|---|---|---|
| TS-MOM-01 | Time-series momentum using lagged 3–12 month return direction, volatility-scaled; exit/reverse only on a predeclared signal change | Major FX, US index proxy, gold; D1/H4 | Regime changes, financing and rollover costs, trend crashes, proxy-versus-CFD differences |
| DON-02 | Donchian breakout with ATR-based stop and time-based exit; no pyramiding initially | EURUSD, GBPUSD, XAUUSD, US indices; H4/D1 | False breakouts, gap/slippage risk, high spread around rollover |
| EMA-TREND-03 | Slow/fast EMA alignment plus volatility-normalized stop; low-turnover trend following | Major FX and gold; H4 | Parameter sensitivity, whipsaw in ranges, small trade sample |
| PULLBACK-04 | Pullback entry only in a confirmed higher-timeframe trend, with fixed rule-based invalidation | Major FX; H1/H4 | Discretion-like overfitting, ambiguous signal timing, execution costs |
| LONDON-05 | London-session range breakout with ATR/range filter and explicit DST/calendar rules | EURUSD, GBPUSD; M15/H1 | Spread spikes, session definition, false breaks, high turnover |
| INDEX-ORB-06 | Opening-range breakout during the broker-defined cash-index session; one attempt per session | US500/US100 proxies; M5/M15 | Session mismatch, opening slippage, broker CFD hours and spread |
| VOL-COMP-07 | Volatility contraction followed by a range breakout, with fixed lookback and ATR stop | FX majors, gold, indices; H1/H4 | Lookback overfitting, news gaps, low sample size |
| REGIME-MR-08 | Mean reversion only when a predeclared trend-strength filter says the market is range-bound | EURUSD/EURGBP; H1 | Regime misclassification, rare large losses, spread eroding small targets |
| RSI-PB-09 | Short-term RSI pullback entry only in a higher-timeframe trend; no averaging down | FX majors; H1 | Indicator parameter mining, trend reversals, crowded exits |
| CARRY-FX-10 | Slow FX trend/momentum combined with documented broker swap/financing filter; no naked carry assumption | Major FX; D1 | Missing historic swaps, swap changes, weekend/holiday financing, rate regime changes |

## Current implementation status\n- DON-02 / STRAT-002: written deterministic H1 v1 specification and guarded EA source exist. The first compile, broker-feasibility check, and tester smoke test are still pending. No performance claim is made.\n- STRAT-003: a disabled-by-default EMA trend EA source has been added; compilation and Strategy Tester evidence are pending.
- Other candidates: deterministic v1 research-spec drafts are present in `research/specs/`; they remain drafts pending Agent 0 review and are not implemented, compiled or backtested.\n\n## Order of evaluation
1. TS-MOM-01 and DON-02: low-turnover hypotheses with clear rules and substantial published background.
2. EMA-TREND-03 and PULLBACK-04: simple baselines that can expose whether added complexity helps.
3. LONDON-05, INDEX-ORB-06, and VOL-COMP-07: session/intraday candidates, requiring better cost and execution assumptions.
4. REGIME-MR-08 and RSI-PB-09: higher risk of regime error and small-edge cost erosion.
5. CARRY-FX-10: blocked until historical swap/financing assumptions are defensible.

## £100 feasibility gate
For each symbol, calculate the cash loss at the broker's minimum permitted volume and the proposed stop distance, including tick value, currency conversion, spread, commission and plausible slippage. Compare with a provisional per-trade budget of £0.25–£0.50. If the minimum size exceeds the budget, reject that symbol/strategy for a £100 account; do not hide the problem by shrinking stops or using leverage assumptions unrealistically.

## Required next step
Agent 0 and Agent 1 must review/freeze the nine new v1 spec drafts; define date windows before results are seen, then assess broker feasibility. Do not attach performance numbers until actual test evidence exists.
