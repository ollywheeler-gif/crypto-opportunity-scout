# MT5 Trading Lab
Research and validation workspace for five coordinated roles: a project director, strategy research, MQL5 development, backtesting, and independent review.

## Truthful status
This is project scaffolding, not a deployed autonomous agent service. No Windows MT5 runner, broker connection, or market-data feed is provisioned. No real-market backtests have been completed by this repository. No EA source has yet passed the project's acceptance gates.

## Safety
- Research/testing only; live trading disabled.
- Never provision paid resources automatically.
- Never commit credentials.
- No martingale or uncontrolled grid.
- Do not call a strategy backtested unless an actual MT5 tester report and logs are retained and reconciled.
- No live deployment without separate explicit owner approval.

## Research and controls
- [Project director / Agent 0](agents/agent_0_project_director.md) coordinates the four specialist agents and enforces evidence gates.
- [Multi-agent operating protocol](docs/MULTI_AGENT_OPERATING_PROTOCOL.md) defines handoffs, artifacts, blocker handling and the critical path.
- [Ten initial strategy hypotheses](research/candidate_register.md) — hypotheses, not performance claims.
- [First deterministic test specification](research/specs/STRAT-002-donchian-breakout-v1.md) — source is written but not yet compiled or tested.
- [Nine additional deterministic strategy-spec drafts](research/specs/) cover time-series momentum, EMA trend, pullback, London breakout, index opening range, volatility contraction, regime mean reversion, RSI pullback and swap-aware FX momentum. These are drafts, not validated strategies.
- [Acceptance gates](docs/ACCEPTANCE_GATES.md) — feasibility, costs, chronological testing, review and demo gates.
- [Capital feasibility worksheet](research/capital_feasibility_template.csv) and [calculator](scripts/capital_feasibility.py) — require real broker inputs; estimates only.
- [Artifact and data conventions](docs/ARTIFACTS_AND_DATA.md).
- Static tests check safety invariants in the EA source; these do not replace MetaEditor compilation.
- [Windows MetaEditor compile workflow](../.github/workflows/mt5-mql5-compile.yml) attempts a no-account source compile on a temporary GitHub-hosted Windows runner and retains compile evidence; it is not an MT5 backtest.
- [Windows MetaEditor compile workflow](../.github/workflows/mt5-mql5-compile.yml) attempts a no-account source compile on a temporary GitHub-hosted Windows runner and retains compile evidence; it is not an MT5 backtest.
- [MT5 source installer](scripts/install_mt5_candidate.ps1), [Windows MT5 runner](scripts/run_mt5_candidate.ps1) and [runbook](docs/MT5_CLOUD_RUNNER.md) — not yet executed against an installed MT5 environment.
- [Current plan and external dependencies](docs/NEXT_STEPS.md).
- [Dated progress log and evidence status](docs/PROGRESS_LOG.md).
- [Machine-readable acceptance gate register](docs/gate_register.csv).

## Local checks
From the repository root:
- `python mt5-trading-lab/scripts/validate_project.py`
- `python -m unittest discover -s mt5-trading-lab/tests -v`

GitHub Actions on Linux validates project files and Python logic. It does not compile MQL5 or run the MT5 Strategy Tester.
