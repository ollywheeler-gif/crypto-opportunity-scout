[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$TerminalDataFolder,
  [Parameter(Mandatory=$true)][string]$RepositorySource,
  [string]$RiskGuardSource,
  [string]$ExpertSubfolder = "TradingLab"
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $TerminalDataFolder -PathType Container)) {
  throw "MT5 terminal data folder not found: $TerminalDataFolder"
}
if (-not (Test-Path -LiteralPath $RepositorySource -PathType Leaf)) {
  throw "Repository source not found: $RepositorySource"
}
if ([System.IO.Path]::GetExtension($RepositorySource).ToLowerInvariant() -ne ".mq5") {
  throw "RepositorySource must be an .mq5 file."
}

# Default to the repository's shared risk guard next to the MT5 lab folder.
if ([string]::IsNullOrWhiteSpace($RiskGuardSource)) {
  $labRoot = Split-Path (Split-Path (Split-Path $RepositorySource -Parent) -Parent) -Parent
  $RiskGuardSource = Join-Path $labRoot "mql5\Include\TradingLab\RiskGuard.mqh"
}
if (-not (Test-Path -LiteralPath $RiskGuardSource -PathType Leaf)) {
  throw "Shared RiskGuard.mqh not found: $RiskGuardSource. Supply -RiskGuardSource explicitly."
}

$expertsRoot = Join-Path $TerminalDataFolder "MQL5\Experts"
$destinationFolder = Join-Path $expertsRoot $ExpertSubfolder
New-Item -ItemType Directory -Force -Path $destinationFolder | Out-Null
$destination = Join-Path $destinationFolder ([System.IO.Path]::GetFileName($RepositorySource))
if (Test-Path -LiteralPath $destination) {
  $existingHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
  $sourceHash = (Get-FileHash -LiteralPath $RepositorySource -Algorithm SHA256).Hash
  if ($existingHash -ne $sourceHash) {
    $backup = "$destination.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -LiteralPath $destination -Destination $backup
    Write-Host "Existing EA source backed up to $backup"
  }
}
Copy-Item -LiteralPath $RepositorySource -Destination $destination -Force
$sourceHash = (Get-FileHash -LiteralPath $RepositorySource -Algorithm SHA256).Hash
$installedHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
if ($sourceHash -ne $installedHash) {
  throw "Installed EA source hash does not match repository source hash."
}

$includeFolder = Join-Path $TerminalDataFolder "MQL5\Include\TradingLab"
New-Item -ItemType Directory -Force -Path $includeFolder | Out-Null
$includeDestination = Join-Path $includeFolder "RiskGuard.mqh"
if (Test-Path -LiteralPath $includeDestination) {
  $existingIncludeHash = (Get-FileHash -LiteralPath $includeDestination -Algorithm SHA256).Hash
  $sourceIncludeHash = (Get-FileHash -LiteralPath $RiskGuardSource -Algorithm SHA256).Hash
  if ($existingIncludeHash -ne $sourceIncludeHash) {
    $backupInclude = "$includeDestination.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -LiteralPath $includeDestination -Destination $backupInclude
    Write-Host "Existing RiskGuard include backed up to $backupInclude"
  }
}
Copy-Item -LiteralPath $RiskGuardSource -Destination $includeDestination -Force
$includeSourceHash = (Get-FileHash -LiteralPath $RiskGuardSource -Algorithm SHA256).Hash
$includeInstalledHash = (Get-FileHash -LiteralPath $includeDestination -Algorithm SHA256).Hash
if ($includeSourceHash -ne $includeInstalledHash) {
  throw "Installed RiskGuard include hash does not match repository source hash."
}

[PSCustomObject]@{
  installedSource = $destination
  sourceSha256 = $installedHash
  installedRiskGuard = $includeDestination
  riskGuardSha256 = $includeInstalledHash
  expectedExpertName = "$ExpertSubfolder\$([System.IO.Path]::GetFileNameWithoutExtension($destination))"
  note = "EA source and shared risk include copied and hash-verified only. No compile, terminal launch, account login or trading action was performed."
} | ConvertTo-Json -Depth 3
