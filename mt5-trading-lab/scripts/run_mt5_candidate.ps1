[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$MetaEditorPath,
  [Parameter(Mandatory=$true)][string]$TerminalPath,
  [Parameter(Mandatory=$true)][string]$ExpertSource,
  [Parameter(Mandatory=$true)][string]$TesterConfig,
  [Parameter(Mandatory=$true)][string]$ReportPath,
  [Parameter(Mandatory=$true)][string]$ArtifactDirectory
)
$ErrorActionPreference = "Stop"

function Require-File([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "$Label not found: $Path"
  }
}
Require-File $MetaEditorPath "MetaEditor executable"
Require-File $TerminalPath "MT5 terminal executable"
Require-File $ExpertSource "EA source"
Require-File $TesterConfig "Strategy Tester configuration"

$configText = Get-Content -LiteralPath $TesterConfig -Raw
if ($configText -notmatch '(?im)^\s*\[Tester\]\s*$') {
  throw "Tester config must contain a [Tester] section. No terminal was launched."
}
if ($configText -match '(?im)^\s*(Login|Password|Server)\s*=') {
  throw "Remove account credentials/server fields from unattended test config. No terminal was launched."
}

$resolvedSource = (Resolve-Path -LiteralPath $ExpertSource).Path
$resolvedReport = [System.IO.Path]::GetFullPath($ReportPath)
$resolvedArtifacts = [System.IO.Path]::GetFullPath($ArtifactDirectory)
New-Item -ItemType Directory -Force -Path $resolvedArtifacts | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$compileLogSource = [System.IO.Path]::ChangeExtension($resolvedSource, ".log")
$compileLog = Join-Path $resolvedArtifacts "compile-$stamp.log"
$expertEx5 = [System.IO.Path]::ChangeExtension($resolvedSource, ".ex5")
# Remove any old binary first so a failed compile cannot accidentally reuse it.
if (Test-Path -LiteralPath $expertEx5) {
  Remove-Item -LiteralPath $expertEx5 -Force
}

# Compile and inspect the log; exit code alone is not sufficient.
if (Test-Path -LiteralPath $compileLogSource) { Remove-Item -LiteralPath $compileLogSource -Force }
& $MetaEditorPath "/compile:$resolvedSource" "/log"
$compileExit = $LASTEXITCODE
if (Test-Path -LiteralPath $compileLogSource) {
  Copy-Item -LiteralPath $compileLogSource -Destination $compileLog -Force
}
if (-not (Test-Path -LiteralPath $compileLog)) {
  throw "Compiler did not produce a log. Exit code: $compileExit"
}
$compileText = Get-Content -LiteralPath $compileLog -Raw
if ($compileExit -ne 0 -or $compileText -match '(?im)\b[1-9]\d*\s+errors?\b' -or -not (Test-Path -LiteralPath $expertEx5)) {
  throw "Compile failed or produced no EX5. Inspect $compileLog"
}

# Require explicit tester inputs rather than accepting silent defaults.
foreach ($key in @("Expert","Symbol","Period","FromDate","ToDate","Model","Deposit","Currency","Leverage","Report")) {
  if ($configText -notmatch "(?im)^\s*$([regex]::Escape($key))\s*=") {
    throw "Tester config is missing required [Tester] setting '$key'. No tester launched."
  }
}
$reportMatch = [regex]::Match($configText, '(?im)^\s*Report\s*=\s*(.+?)\s*$')
if (-not $reportMatch.Success) {
  throw "Tester report setting could not be parsed. No tester launched."
}
$configuredReport = $reportMatch.Groups[1].Value.Trim().Trim('"')
if ([System.IO.Path]::GetFullPath($configuredReport) -ne $resolvedReport) {
  throw "ReportPath argument must exactly match the Report setting in TesterConfig."
}

$reportBeforeUtc = if (Test-Path -LiteralPath $resolvedReport -PathType Leaf) {
  (Get-Item -LiteralPath $resolvedReport).LastWriteTimeUtc
} else { [datetime]::MinValue }
$runStartedUtc = [datetime]::UtcNow
$terminalArgs = @("/config:$([System.IO.Path]::GetFullPath($TesterConfig))")
$process = Start-Process -FilePath $TerminalPath -ArgumentList $terminalArgs -PassThru -Wait
if ($process.ExitCode -ne 0) {
  throw "MT5 terminal returned exit code $($process.ExitCode). Inspect terminal logs."
}
if (-not (Test-Path -LiteralPath $resolvedReport -PathType Leaf)) {
  throw "Tester report not found at configured Report path: $resolvedReport. A zero exit code is not proof of a completed test."
}
$reportAfterUtc = (Get-Item -LiteralPath $resolvedReport).LastWriteTimeUtc
if ($reportAfterUtc -le $reportBeforeUtc) {
  throw "Report was not freshly updated during this run; refusing to archive a potentially stale report."
}
if ($reportBeforeUtc -eq [datetime]::MinValue -and $reportAfterUtc -lt $runStartedUtc.AddSeconds(-5)) {
  throw "New report timestamp predates this run; refusing to archive a potentially stale report."
}

$reportCopy = Join-Path $resolvedArtifacts "report-$stamp$([System.IO.Path]::GetExtension($resolvedReport))"
Copy-Item -LiteralPath $resolvedReport -Destination $reportCopy -Force
Copy-Item -LiteralPath $TesterConfig -Destination (Join-Path $resolvedArtifacts "tester-config-$stamp.ini") -Force

$hashes = @($resolvedSource, $expertEx5, $compileLog, $reportCopy) | ForEach-Object {
  if (Test-Path -LiteralPath $_ -PathType Leaf) {
    $item = Get-Item -LiteralPath $_
    $hash = Get-FileHash -LiteralPath $_ -Algorithm SHA256
    [PSCustomObject]@{
      path = $item.FullName
      bytes = $item.Length
      sha256 = $hash.Hash
      lastWriteUtc = $item.LastWriteTimeUtc.ToString("o")
    }
  }
}
$manifest = [PSCustomObject]@{
  status = "RUN_COMPLETED_REPORT_PRESENT_REQUIRES_MANUAL_RECONCILIATION"
  runTimestampLocal = (Get-Date).ToString("o")
  metaEditorPath = $MetaEditorPath
  terminalPath = $TerminalPath
  expertSource = $resolvedSource
  testerConfig = [System.IO.Path]::GetFullPath($TesterConfig)
  compileExitCode = $compileExit
  terminalExitCode = $process.ExitCode
  artifacts = $hashes
  note = "A report file existing is not proof of valid results. Verify tester completion, symbol, dates, model, costs, deposit, currency, leverage, and report/log consistency."
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $resolvedArtifacts "manifest-$stamp.json") -Encoding UTF8
Write-Host "Run artifacts recorded in $resolvedArtifacts"
