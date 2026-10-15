# MT5 VPS bootstrap diagnostic

This is a non-trading setup test for a Windows VPS. It installs the official MetaTrader terminal and Python integration, then checks whether Python can initialize the local terminal. It does not request broker credentials, save passwords, or place trades.

## Run on the VPS

1. Connect to the Windows VPS using Remote Desktop.
2. Open **Windows PowerShell as Administrator**.
3. Run these commands:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
$script = Join-Path $env:TEMP 'bootstrap-mt5-vps.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ollywheeler-gif/crypto-opportunity-scout/vps-bootstrap-diagnostics/scripts/vps/bootstrap-mt5-vps.ps1' -OutFile $script
& $script
```

4. When it finishes, find the log folder at `C:\MT5VPS\logs`.
5. Share the contents of `ipc-diagnostic.json` and the relevant log output, after checking that no personal details appear. The script does not collect broker credentials.

## What this test establishes

- Whether the official MT5 terminal installs and launches on this Windows VPS.
- Whether the official MetaTrader5 Python package installs.
- Whether Python can initialize the terminal in standard or portable mode.
- The error code if terminal IPC still fails.

This is a diagnostic only. It does not authenticate a broker account, run a strategy, or place trades. Do not put broker passwords into GitHub files or commit them to the repository.
