# MT5 Windows runner runbook

This is a checklist, not evidence that a runner is provisioned or that the EA has compiled. MetaEditor and Strategy Tester must run on a Windows environment with a real MT5 installation.

## Prerequisites
- MT5 and MetaEditor installed.
- A dedicated demo/test terminal profile with no real-account login.
- Historical data and exact broker symbol specifications.
- A known data folder, accessible through MT5 **File → Open Data Folder**.
- Broker inputs for spread, commission, tick value, minimum volume, margin and financing.
- An isolated artifact directory.

## Install the repository EA
From a local checkout of the repository, run this from PowerShell after verifying the terminal data-folder path:

```powershell
.\mt5-trading-lab\scripts\install_mt5_candidate.ps1 -TerminalDataFolder "C:\Users\<you>\AppData\Roaming\MetaQuotes\Terminal\<terminal-id>" -RepositorySource "C:\path\to\repo\mt5-trading-lab\mql5\Experts\STRAT-002_DonchianBreakout.mq5"
```

The installer copies the source into `MQL5\Experts\TradingLab`, backs up a differing existing source, and verifies SHA-256. It does not compile, launch MT5, log into an account, or trade.

## Compile manually first
The documented MetaEditor command-line pattern uses `/compile` and `/log`. The compiler log is written beside the source file; copy it into the artifact directory after compilation.

```powershell
$metaEditor = "C:\Path\To\MetaEditor64.exe"
$source = "C:\Path\To\MQL5\Experts\TradingLab\STRAT-002_DonchianBreakout.mq5"
$sourceLog = [System.IO.Path]::ChangeExtension($source, ".log")
& $metaEditor "/compile:$source" "/log"
$exitCode = $LASTEXITCODE
Get-Content $sourceLog
Copy-Item $sourceLog "C:\Path\To\artifacts\compile.log"
if ($exitCode -ne 0) { throw "MetaEditor compile returned $exitCode" }
```

Check the complete log for errors and warnings, and verify that a fresh EX5 exists. A zero exit code alone is not acceptance evidence. The runner removes any previous EX5 before compiling to prevent accidental reuse of a stale binary.

## Tester configuration and execution
- Use a disposable terminal profile that is not logged into a real account. The runner rejects account credential fields in the supplied INI, but cannot inspect the account already logged into a terminal.
- The INI must include a `[Tester]` section and explicit `Expert`, `Symbol`, `Period`, `FromDate`, `ToDate`, `Model`, `Deposit`, `Currency`, `Leverage`, and `Report` settings.
- Set `Expert=` to the expert path relative to `MQL5\Experts` (for example `TradingLab\STRAT-002_DonchianBreakout`, without `.ex5`). Verify the exact syntax accepted by the installed MT5 build.
- The report path in the INI must match the runner's `ReportPath` argument. The runner refuses to archive a report that was not updated by the current run.
- Set the EA inputs explicitly: enable the strategy only in the tester/demo environment, set `ConfirmBrokerCostsReviewed=true` only after review, and enter positive spread, slippage and gap-loss sizing allowances. These allowances do not replace the tester's actual cost settings.
- Preserve the INI, compiler log, terminal/tester logs, raw report, normalized trade CSV and reconciliation notes.

The runner is a guarded starter, not yet proven against the user's installed MT5 build. A report file existing is not proof of a valid completed backtest. Reconcile symbol, dates, modelling mode, deposit/currency/leverage, costs, trades, P/L and logs before using any metrics.
