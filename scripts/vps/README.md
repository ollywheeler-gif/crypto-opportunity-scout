# MT5 VPS bootstrap diagnostic

This is a non-trading setup test for a Windows VPS. It installs the official MetaTrader terminal and Python integration, then checks whether Python can initialize the local terminal. It does not request broker credentials, save passwords, or place trades.

## Recommended route: let GitHub run the setup on the VPS

GitHub cannot use an RDP password as a remote command. The VPS must first be registered as a **self-hosted GitHub Actions runner**. This is a one-time setup step on the VPS.

### 1. Get the temporary runner setup commands from GitHub

1. Open the repository: https://github.com/ollywheeler-gif/crypto-opportunity-scout
2. Open **Settings → Actions → Runners**.
3. Select **New self-hosted runner**, then choose **Windows** and **x64**.
4. Keep that page open. GitHub displays the download/configuration commands and a short-lived registration token. Follow the commands shown there exactly; the token expires, so do not copy it into this repository, a workflow, or a message.
5. On the VPS, open **PowerShell as Administrator** and run the commands shown by GitHub. Use the runner folder suggested by GitHub or a folder such as `C:\actions-runner`.
6. When configuration asks for labels, add the custom label `mt5-vps` (keep the default labels too). Give the runner a recognisable name such as `mt5-vps-windows`.
7. For the first test, run the runner interactively with `run.cmd` and leave that PowerShell window open. This avoids setting up a persistent Windows service before we know it works.

**Never send the runner registration token or Windows Administrator password to ChatGPT or commit them to GitHub.** The token is a temporary setup credential.

### 2. Start the installation job from GitHub

Once the runner page shows the runner as **Idle** (green/online):

1. Open the repository **Actions** tab.
2. Select **Set up MT5 on registered VPS**.
3. Select **Run workflow**, choose branch `vps-bootstrap-diagnostics`, and run it.
4. Open the job to see the installation and diagnostic output.

Workflow link: https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/workflows/setup-mt5-on-vps.yml

The workflow is manual-only and targets a Windows x64 self-hosted runner with the `mt5-vps` label. Do not enable it for untrusted pull requests: a self-hosted runner can execute repository code on the VPS.

### 3. If you prefer to run the diagnostic directly once

1. Connect to the Windows VPS using Remote Desktop.
2. Open **Windows PowerShell as Administrator**.
3. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
$script = Join-Path $env:TEMP 'bootstrap-mt5-vps.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ollywheeler-gif/crypto-opportunity-scout/vps-bootstrap-diagnostics/scripts/vps/bootstrap-mt5-vps.ps1' -OutFile $script
& $script
```

4. When it finishes, find logs in `C:\MT5VPS\logs`, especially `ipc-diagnostic.json`.

## What this test establishes

- Whether the official MT5 terminal installs and launches on this Windows VPS.
- Whether the official MetaTrader5 Python package installs.
- Whether Python can initialize the terminal in standard or portable mode.
- The error code if terminal IPC still fails.

This diagnostic does not authenticate a broker account, run a strategy, or place trades. Do not put broker passwords into GitHub files or commit them to the repository.
