# MT5 VPS bootstrap and Python IPC diagnostic
# Run from an elevated PowerShell window on the Windows VPS.
# This script does NOT request or store broker credentials and does NOT place trades.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$root = 'C:\MT5VPS'
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $root, $logs | Out-Null
$log = Join-Path $logs ('bootstrap-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
Start-Transcript -Path $log -Force | Out-Null

try {
    Write-Host '=== MT5 VPS bootstrap / diagnostic ==='
    Write-Host "Time: $(Get-Date -Format o)"
    Write-Host "Computer: $env:COMPUTERNAME"
    Write-Host "OS: $((Get-CimInstance Win32_OperatingSystem).Caption)"
    Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
    Write-Host "Log file: $log"

    # Install the official MetaTrader terminal if it is not already present.
    $terminal = Join-Path $root 'terminal64.exe'
    if (-not (Test-Path $terminal)) {
        $installer = Join-Path $env:TEMP 'mt5setup-vps.exe'
        Write-Host 'Downloading official MetaTrader installer...'
        Invoke-WebRequest 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' -OutFile $installer
        $sig = Get-AuthenticodeSignature -FilePath $installer
        if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'MetaQuotes') {
            throw "MetaTrader installer signature check failed: $($sig.Status). Stopping for safety."
        }
        Write-Host 'Installer signature validated. Installing terminal...'
        $proc = Start-Process -FilePath $installer -ArgumentList ('/auto /path:"' + $root + '"') -Wait -PassThru
        if (-not (Test-Path $terminal)) {
            throw "MT5 installation did not create terminal64.exe (installer exit $($proc.ExitCode))."
        }
    } else {
        Write-Host "MT5 terminal already exists at $terminal"
    }

    # Prefer an installed Python if one is already available; otherwise install
    # a pinned official Python 3.12 build with pip and PATH enabled.
    $python = $null
    $pyLauncher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        $candidate = (& py -3.12 -c "import sys; print(sys.executable)" 2>$null | Select-Object -First 1)
        if ($LASTEXITCODE -eq 0 -and $candidate -and (Test-Path $candidate)) { $python = $candidate.Trim() }
    }
    if (-not $python) {
        $python = 'C:\Program Files\Python312\python.exe'
        if (-not (Test-Path $python)) {
            $pyInstaller = Join-Path $env:TEMP 'python-3.12.10-amd64.exe'
            Write-Host 'Downloading official Python 3.12.10 installer...'
            Invoke-WebRequest 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' -OutFile $pyInstaller
            $pySig = Get-AuthenticodeSignature -FilePath $pyInstaller
            if ($pySig.Status -ne 'Valid' -or $pySig.SignerCertificate.Subject -notmatch 'Python Software Foundation') {
                throw "Python installer signature check failed: $($pySig.Status). Stopping for safety."
            }
            $proc = Start-Process -FilePath $pyInstaller -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_test=0' -Wait -PassThru
            if (-not (Test-Path $python)) {
                throw "Python installation did not create $python (installer exit $($proc.ExitCode))."
            }
        }
    }

    Write-Host "Python executable: $python"
    & $python --version
    & $python -m pip install --disable-pip-version-check --upgrade pip
    & $python -m pip install --disable-pip-version-check MetaTrader5
    if ($LASTEXITCODE -ne 0) { throw 'Installing the official MetaTrader5 Python package failed.' }

    $diag = Join-Path $root 'mt5_ipc_diagnostic.py'
    @'
import os, sys, time, json, subprocess
from pathlib import Path
import MetaTrader5 as mt5

terminal = Path(r"C:\MT5VPS\terminal64.exe")
out = Path(r"C:\MT5VPS\logs\ipc-diagnostic.json")
result = {
    "python": sys.version,
    "python_executable": sys.executable,
    "mt5_package_version": getattr(mt5, "__version__", "unknown"),
    "terminal_path": str(terminal),
    "terminal_exists": terminal.is_file(),
    "attempts": [],
}
if not terminal.is_file():
    raise SystemExit("Terminal executable missing.")

# Try the default installed-terminal mode first, then portable mode. No credentials
# are supplied and no trading functions are called.
for label, kwargs in [
    ("installed_default", {"path": str(terminal), "timeout": 60000}),
    ("portable_mode", {"path": str(terminal), "timeout": 60000, "portable": True}),
]:
    try:
        mt5.shutdown()
    except Exception:
        pass
    ok = mt5.initialize(**kwargs)
    err = mt5.last_error()
    item = {"mode": label, "initialize_ok": bool(ok), "last_error": repr(err)}
    if ok:
        try:
            item["terminal_version"] = repr(mt5.version())
            ti = mt5.terminal_info()
            item["terminal_info_available"] = ti is not None
            item["terminal_connected"] = getattr(ti, "connected", None) if ti else None
            item["account_info_available_without_login"] = mt5.account_info() is not None
        finally:
            mt5.shutdown()
    result["attempts"].append(item)

try:
    p = subprocess.run(["powershell", "-NoProfile", "-Command",
        "Get-Process terminal64,terminal -ErrorAction SilentlyContinue | Select-Object ProcessName,Id,SessionId | ConvertTo-Json -Compress"],
        capture_output=True, text=True, timeout=15)
    result["terminal_processes_json"] = p.stdout.strip()
except Exception as e:
    result["terminal_process_inspection_error"] = repr(e)

out.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result, indent=2))
print("Diagnostic JSON saved to", out)
'@ | Set-Content -Path $diag -Encoding utf8

    Write-Host 'Running MT5 Python IPC diagnostic (no broker credentials used)...'
    & $python $diag
    if ($LASTEXITCODE -ne 0) { throw "MT5 diagnostic exited with code $LASTEXITCODE." }

    Write-Host ''
    Write-Host '=== COMPLETE ==='
    Write-Host "Log: $log"
    Write-Host "Diagnostic JSON: $(Join-Path $logs 'ipc-diagnostic.json')"
    Write-Host 'No broker credentials were requested or saved. No trades were placed.'
}
catch {
    Write-Error $_
    Write-Host "Bootstrap stopped. Review log: $log"
    exit 1
}
finally {
    try { Stop-Transcript | Out-Null } catch {}
}
