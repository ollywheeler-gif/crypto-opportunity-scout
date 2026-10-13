# MT5 cloud runner runbook
This document is a checklist, not evidence that a runner is provisioned.

Prerequisites: compatible Windows environment with MT5 and MetaEditor, test/demo terminal profile, required historical data, broker symbol/cost specifications, Python 3.11+, isolated working directory and artifact retention.

A common MetaEditor CLI pattern (verify against installed build):
```powershell
$metaEditor = "C:\Path\To\MetaEditor64.exe"
$source = "C:\Path\To\MQL5\Experts\TradingLab\Candidate.mq5"
$log = "C:\Path\To\logs\Candidate-compile.log"
& $metaEditor "/compile:$source" "/log:$log"
$exitCode = $LASTEXITCODE
Get-Content $log
if ($exitCode -ne 0) { throw "MetaEditor compile returned $exitCode" }
```
Confirm the compiler log and a fresh EX5; exit code alone is insufficient. For Strategy Tester preserve INI/config, terminal/tester logs, raw report, normalized CSV and reconciliation notes. Never use live credentials in unattended jobs. Do not enable live trading in test jobs.
