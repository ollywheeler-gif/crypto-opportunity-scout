# MT5 Trading Lab
Research and validation workspace for four agent roles: strategy research, MQL5 development, backtesting, and independent review.

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
- [Ten initial strategy hypotheses](research/candidate_register.md) — hypotheses, not performance claims.
- [Acceptance gates](docs/ACCEPTANCE_GATES.md) — feasibility, costs, chronological testing, review and demo gates.
- [Capital feasibility worksheet](research/capital_feasibility_template.csv) and [calculator](scripts/capital_feasibility.py) — require real broker inputs; estimates only.
- [Artifact and data conventions](docs/ARTIFACTS_AND_DATA.md).
- [Windows MT5 runner](scripts/run_mt5_candidate.ps1) and [runbook](docs/MT5_CLOUD_RUNNER.md) — not yet executed against an installed MT5 environment.
- [Current plan and external dependencies](docs/NEXT_STEPS.md).

## Local checks
From the repository root:
- `python mt5-trading-lab/scripts/validate_project.py`
- `python -m unittest discover -s mt5-trading-lab/tests -v`

GitHub Actions on Linux validates project files and Python logic. It does not compile MQL5 or run the MT5 Strategy Tester.
