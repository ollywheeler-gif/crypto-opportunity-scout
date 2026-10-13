# MT5 Trading Lab
Cloud-first research and validation workspace for four agent roles: strategy research, MQL5 development, backtesting, and independent review.

## Truthful status
This is project scaffolding, not a deployed autonomous agent service. No cloud Windows MT5 runner, broker connection, or market-data feed is provisioned. No real-market backtests have been completed by this repository. The example MA crossover EA is a software smoke test only.

## Safety
- Research/testing only; live trading disabled.
- Never provision paid resources automatically.
- Never commit credentials.
- No martingale or uncontrolled grid.
- Do not call a strategy backtested unless an actual MT5 tester report and logs are retained and reconciled.
- No live deployment without separate explicit owner approval.

## Local checks
`python scripts/validate_project.py`
`python -m unittest discover -s tests -v`

See docs/EXECUTION_REALITY.md, docs/WORKFLOW.md and docs/MT5_CLOUD_RUNNER.md.
