# MT5 Trading Lab

Research and validation workspace for a bounded team of eight roles: Agent 0 project director plus seven specialists covering strategy research, MQL5 development, testing, independent review, broker/capital feasibility, independent data analysis and build automation.

## Truthful status
This is role-based project scaffolding, not a deployed autonomous agent service. The roles provide clear work ownership and handoffs; they do not imply eight independent agents are continuously executing. No always-on Windows MT5 runner, broker connection or market-data feed is provisioned. No real-market Strategy Tester evidence has been established by this repository. A clean compile is not strategy validation.

## Safety
- Research/testing only; live trading disabled.
- Never provision paid resources automatically or commit credentials.
- No martingale or uncontrolled grid.
- Do not call a strategy backtested unless an actual MT5 tester report and logs are retained and reconciled.
- Synthetic smoke tests validate mechanics only, never profitability.
- No live deployment without separate explicit owner approval.

## Team and governance
- [Agent 0 — Project director](agents/agent_0_project_director.md) coordinates work and enforces acceptance gates.
- [Agent 1 — Strategy researcher](agents/agent_1_researcher.md).
- [Agent 2 — MQL5 developer](agents/agent_2_developer.md).
- [Agent 3 — MT5 tester](agents/agent_3_tester.md).
- [Agent 4 — Independent reviewer](agents/agent_4_reviewer.md).
- [Agent 5 — Broker and capital feasibility](agents/agent_5_broker_feasibility.md).
- [Agent 6 — Independent test and data analyst](agents/agent_6_independent_test_analyst.md).
- [Agent 7 — Build and automation engineer](agents/agent_7_build_automation.md).
- [Multi-agent operating protocol](docs/MULTI_AGENT_OPERATING_PROTOCOL.md) defines handoffs, parallelism, artifacts, blocker handling and the critical path. Eight roles is the current ceiling; new roles require a proven recurring bottleneck and non-duplicative deliverables.

## Research and controls
- [Ten initial strategy hypotheses](research/candidate_register.md) — hypotheses, not performance claims.
- [Strategy specifications](research/specs/) — frozen/draft status is recorded in the gate register; specifications are not validated strategies.
- [Acceptance gates](docs/ACCEPTANCE_GATES.md) and [pre-registered test protocol](docs/PRE_REGISTERED_TEST_PROTOCOL.md).
- [Capital feasibility worksheet](research/capital_feasibility_template.csv) and [calculator](scripts/capital_feasibility.py) — require verified broker inputs; estimates only.
- [Preliminary broker feasibility research](docs/BROKER_FEASIBILITY_RESEARCH.md) compares public MT5 terms but does not select a broker or replace exact symbol metadata.
- [Index session schedule requirements](docs/INDEX_SESSION_SCHEDULE.md) and [blank per-date schedule template](research/index_session_schedule_template.csv) keep STRAT-006 disabled until broker sessions are verified.
- [Historical swap data requirements](docs/SWAP_HISTORY_REQUIREMENTS.md) and [swap-history schema](research/swap_history_template.csv) explain why STRAT-010 remains blocked without real financing history.
- [MQL5 symbol contract exporter](mql5/Scripts/TradingLab/ExportSymbolContract.mq5) captures local broker symbol metadata without sending orders; [contract-to-feasibility importer](scripts/contract_export_to_feasibility.py) turns the export into a worksheet row using explicit stop/cost inputs.
- [Persistent risk circuit-breaker](mql5/Include/TradingLab/RiskGuard.mqh) is integrated into all current EAs: provisional 1% daily-loss halt, 5% drawdown review, 10% persistent drawdown halt. These controls still require tester and restart validation before any demo proposal.
- [Donchian reference model](scripts/donchian_reference.py), [risk-guard reference model](scripts/risk_guard_reference.py) and [cost reconciliation](scripts/reconcile_costs.py), with tests, validate narrow logic/arithmetic only—not MT5 execution.
- [Windows MetaEditor compile workflow](../.github/workflows/mt5-mql5-compile.yml) retains no-account compile evidence; STRAT-001 through STRAT-004 and STRAT-007 through STRAT-009, plus the read-only exporter, have compiled with zero errors/warnings. This is not an MT5 backtest.
- [MT5 tester configuration validator](scripts/validate_tester_config.py) and [credential-free smoke template](research/mt5_tester_smoke_template.ini) fail closed on missing/unsafe settings. Validation is not execution; broker history and a Strategy Tester run remain pending.
- [MT5 source installer](scripts/install_mt5_candidate.ps1), [Windows runner](scripts/run_mt5_candidate.ps1) and [runbook](docs/MT5_CLOUD_RUNNER.md) are not yet verified as an end-to-end real-data Strategy Tester pipeline.
- [Backtest infrastructure plan](docs/BACKTEST_INFRASTRUCTURE_PLAN.md) — sourced no-cost path using Windows GitHub Actions, a free demo environment, and independent historical data checks.
- [Background agent runtime decision](docs/BACKGROUND_AGENT_RUNTIME_DECISION.md) — proposed OpenAI Agents SDK coordinator on GitHub Actions, with dry-run first and explicit approval before any API spend or scheduled model calls.
- [Project plan](docs/NEXT_STEPS.md), [progress log](docs/PROGRESS_LOG.md), and [machine-readable gate register](docs/gate_register.csv).
- [Agent 4's independent STRAT-002 code review](research/reviews/STRAT-002-code-review-v1.md) remains BLOCKED until the required runtime and broker evidence exists.

## Local checks
From repository root:
- `python mt5-trading-lab/scripts/validate_project.py`
- `python -m unittest discover -s mt5-trading-lab/tests -v`

GitHub Actions on Linux validates project files and Python logic. Windows MetaEditor compilation is separate. Neither one alone establishes market performance.
