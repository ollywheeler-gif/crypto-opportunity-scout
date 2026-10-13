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


## Install the repository EA into a terminal data folder
Use the helper after identifying the exact data folder via MT5 **File → Open Data Folder**. It copies the source and verifies SHA-256; it does not compile or launch MT5.

```powershell
.\\install_mt5_candidate.ps1 -TerminalDataFolder "C:\\Users\\<you>\\AppData\\Roaming\\MetaQuotes\\Terminal\\<terminal-id>" -RepositorySource "C:\\path\\to\\repo\\mt5-trading-lab\\mql5\\Experts\\STRAT-002_DonchianBreakout.mq5"
```

## Important setup notes before using the runner
- Put the EA source in the selected MT5 terminal's own data-folder `MQL5/Experts/TradingLab/` directory before compiling. The Strategy Tester must use the resulting EX5 from that same terminal's data folder. The repository copy is the source of record; compare its SHA-256 with the installed copy.
- Set `Expert=` in the tester INI to the expert name/path relative to `MQL5/Experts` (for example, `TradingLab\\STRAT-002_DonchianBreakout`, without the `.ex5` suffix). Verify the exact syntax accepted by the installed MT5 build.
- Use a fresh, dedicated demo/test terminal profile. The runner rejects account credential fields in the supplied INI, but it cannot inspect or guarantee the account already logged into an existing terminal. Do not point it at a terminal logged into a real account.
- Configure spread and commission realistically in the tester. The EA's `EstimatedSpreadCostPerLot`, `EstimatedRoundTurnCostPerLot` and `EstimatedSlippageCostPerLot` are sizing allowances, not substitutes for tester cost settings. The EA refuses to run when enabled if spread or slippage allowances are zero.
- The runner is a guarded starter, not yet proven against the user's MT5 build. Validate first on a disposable test installation and inspect all logs. It cannot certify that a report is a complete Strategy Tester report; manual reconciliation remains mandatory.
