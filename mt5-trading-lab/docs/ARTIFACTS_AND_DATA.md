# Data and artifact conventions

Keep all test inputs and outputs immutable by candidate version and run ID. Never overwrite a prior run to make a result appear cleaner.

## Suggested layout
    artifacts/
      candidate-<id>/
        source/
        configs/
        compile/
        tester/
        normalized/
        reconciliation/
        review/

## Minimum manifest fields
- Candidate ID/version and strategy hypothesis version.
- Git commit and SHA-256 of .mq5, compiled .ex5 (where stable), config and data files.
- MT5 terminal/compiler build, broker/server label, symbol and instrument type.
- Date range, timezone/DST, tester model, deposit/currency/leverage, spread assumptions and cost model.
- Start/end timestamp, process exit code, compile log, terminal/tester log, raw report, normalized trade export.
- Analyst/agent role, result status, exceptions and reconciliation decision.

## CSV normalization
The trade analyzer expects a close_time column and net_profit column. net_profit must be trade-level P/L after commission, swap and other costs exactly once. Preserve original raw exports; never silently rename gross profit as net profit. Include a stable trade identifier if available.

## Security and retention
- Never commit broker passwords, investor passwords, API keys, account numbers or private keys.
- Use demo credentials only on a dedicated Windows runner, stored in the machine's secret store, not in repository files or test INI files.
- Keep GitHub Actions Linux jobs to static checks and Python analysis. They are not MT5 Strategy Tester evidence.
- Keep raw reports even when a run fails. Record failure reason and preserve configuration so a run can be reproduced.
