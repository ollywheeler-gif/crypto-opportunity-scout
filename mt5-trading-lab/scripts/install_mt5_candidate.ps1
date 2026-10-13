[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$TerminalDataFolder,
  [Parameter(Mandatory=$true)][string]$RepositorySource,
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
    Write-Host "Existing file backed up to $backup"
  } else {
    Write-Host "Installed source already matches repository source."
  }
}
Copy-Item -LiteralPath $RepositorySource -Destination $destination -Force
$sourceHash = (Get-FileHash -LiteralPath $RepositorySource -Algorithm SHA256).Hash
$installedHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
if ($sourceHash -ne $installedHash) {
  throw "Installed source hash does not match repository source hash."
}
[PSCustomObject]@{
  installedSource = $destination
  expectedExpertName = "$ExpertSubfolder\$([System.IO.Path]::GetFileNameWithoutExtension($destination))"
  sha256 = $installedHash
  note = "Source copied only. No compile, terminal launch, account login or trading action was performed."
} | ConvertTo-Json -Depth 3
