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
$compileArgs = @("/compile:""$source""", "/log")
$process = Start-Process -FilePath $metaEditor -ArgumentList $compileArgs -Wait -PassThru
$exitCode = $process.ExitCode
Get-Content $sourceLog
Copy-Item $sourceLog "C:\Path\To\artifacts\compile.log"
$compileText = Get-Content -LiteralPath $sourceLog -Raw
$ex5 = [System.IO.Path]::ChangeExtension($source, ".ex5")
if ($compileText -notmatch 'Result:\s*0 errors?,\s*0 warnings?' -or -not (Test-Path -LiteralPath $ex5 -PathType Leaf)) {
  throw "Compile did not produce a fresh EX5 with zero errors and zero warnings (process exit $exitCode)."
}
```

Check the complete log for errors and warnings, and verify that a fresh EX5 exists. A zero exit code alone is not acceptance evidence. The runner removes any previous EX5 before compiling to prevent accidental reuse of a stale binary. MetaEditor may return a non-zero process exit code despite a clean compiler summary, so require the explicit zero-error/zero-warning summary and fresh EX5 together.

## Tester configuration and execution
- Use a disposable terminal profile that is not logged into a real account. The runner rejects account credential fields in the supplied INI, but cannot inspect the account already logged into a terminal.
- The INI must include a `[Tester]` section and explicit `Expert`, `Symbol`, `Period`, `FromDate`, `ToDate`, `Model`, `Deposit`, `Currency`, `Leverage`, and `Report` settings.
- Set `Expert=` to the expert path relative to `MQL5\Experts` (for example `TradingLab\STRAT-002_DonchianBreakout`, without `.ex5`). Verify the exact syntax accepted by the installed MT5 build.
- The report path in the INI must match the runner's `ReportPath` argument. The runner refuses to archive a report that was not updated by the current run.
- Set the EA inputs explicitly: enable the strategy only in the tester/demo environment, set `ConfirmBrokerCostsReviewed=true` only after review, and enter positive spread, slippage and gap-loss sizing allowances. These allowances do not replace the tester's actual cost settings.
- Preserve the INI, compiler log, terminal/tester logs, raw report, normalized trade CSV and reconciliation notes.

The runner is a guarded starter, not yet proven against the user's installed MT5 build. A report file existing is not proof of a valid completed backtest. Reconcile symbol, dates, modelling mode, deposit/currency/leverage, costs, trades, P/L and logs before using any metrics.

## Export broker symbol contract metadata without placing orders

The repository includes `mql5/Scripts/TradingLab/ExportSymbolContract.mq5`. It is a read-only script: it selects the chosen symbol, reads MT5 symbol properties, optionally calculates the broker-reported margin for the minimum buy volume, and writes a CSV under the terminal's `MQL5/Files` directory. It does not submit, modify or close orders.

1. Use a terminal logged into the intended broker's **demo** account, not a real account.
2. Compile the script in MetaEditor and require zero errors and zero warnings.
3. In MT5 Navigator → Scripts, run `ExportSymbolContract`; leave `ContractSymbolInput` blank to use the chart symbol, or enter the broker's exact symbol name (including suffix).
4. Retrieve `MQL5/Files/TradingLab_symbol_contract.csv` using **File → Open Data Folder**.
5. Verify the values against the broker's official contract specification and record the capture time, server, account currency, symbol suffix, minimum volume, tick size/value, volume step, stops/freeze levels, margin and swaps. A snapshot is not a historical spread or financing series.
6. Enter the account equity and GBP conversion rate privately in the feasibility worksheet; neither is exported by the script. Never put login IDs or credentials in the repository.

The script's CSV is evidence to review, not automatic approval. Minimum-volume loss, current margin, historical financing and cost stress still need independent checks.


## Persistent risk circuit-breakers

All current EAs include `mql5/Include/TradingLab/RiskGuard.mqh`. The provisional defaults are a **1% daily equity-loss halt**, a review log at **5% peak-to-trough drawdown**, and a **persistent halt at 10% drawdown**. These are safety defaults, not a guarantee against losses; gaps, market closures and rejected closes can still produce larger losses. They must be exercised in the Strategy Tester and reviewed before any demo proposal.

- The guard runs on every tick even when the strategy's entry switch is disabled, and attempts to close positions matching that EA's symbol and magic number after a halt.
- Daily loss state resets at the next broker-server day. The 10% peak-drawdown halt persists across EA/terminal restarts until deliberately reset after investigation.
- State is stored in MT5 terminal global variables. On initialization, the Experts log prints the `TLRG_...` state prefix. For a deliberate reset, first investigate and preserve logs; then use MT5's Global Variables dialog (F3) to delete **all** variables with that exact prefix. Do not delete only the halt flag, because the stored peak equity may immediately trigger the halt again.
- Strategy Tester/optimization runs start with a clean guard state. Demo runs preserve state across restarts. Do not copy tester state into a demo terminal.
- Never test these reset procedures on a real account; the EAs refuse real-account initialization.
