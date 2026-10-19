<#
.SYNOPSIS
Installs optional third-party tools of the reverse-engineer skill into the per-user tools root.

.DESCRIPTION
Downloads official releases (Temurin JDK 21, Ghidra, the jadx CLI, ilspycmd) into
$env:REVERSE_ENGINEER_TOOLS, or %LOCALAPPDATA%\reverse-engineer\tools by default.
Needs no admin rights and changes no PATH: the reverse-engineer tools look there first.

.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File install-tools.ps1 jdk jadx
#>
param(
  [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)]
  [ValidateSet('jdk', 'ghidra', 'jadx', 'ilspycmd')]
  [string[]] $Tools
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = if ($env:REVERSE_ENGINEER_TOOLS) { $env:REVERSE_ENGINEER_TOOLS } else { Join-Path $env:LOCALAPPDATA 'reverse-engineer\tools' }
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'aarch64' } else { 'x64' }
# Windows' own curl and tar: from Git Bash, GNU tar (which cannot read zip) comes first on PATH.
$curl = Join-Path $env:SystemRoot 'System32\curl.exe'
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'

# GH_TOKEN or GITHUB_TOKEN, when set, lifts the anonymous GitHub API limit (60 requests an hour per IP).
function Get-Release([string] $Repo, [string] $Pattern) {
  $token = if ($env:GH_TOKEN) { $env:GH_TOKEN } else { $env:GITHUB_TOKEN }
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  try {
    $latest = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest" -Headers $headers
  } catch {
    throw "cannot read the latest release of $Repo (GitHub API rate limit? set GH_TOKEN): $($_.Exception.Message)"
  }
  $url = $latest.assets |
    Where-Object name -Match $Pattern | Select-Object -First 1 -ExpandProperty browser_download_url
  if (-not $url) { throw "no release asset matching $Pattern in $Repo" }
  $url
}

function Install-Archive([string] $Url, [string] $Destination) {
  $file = Join-Path ([IO.Path]::GetTempPath()) "re-download-$([guid]::NewGuid())"
  try {
    & $curl -fsSL -o $file $Url
    if ($LASTEXITCODE) { throw "download failed: $Url" }
    New-Item -ItemType Directory -Force $Destination | Out-Null
    & $tar -xf $file -C $Destination
    if ($LASTEXITCODE) { throw "extract failed: $Url" }
  } finally {
    Remove-Item $file -Force -ErrorAction SilentlyContinue
  }
}

foreach ($tool in $Tools) {
  switch ($tool) {
    'jdk' { Install-Archive "https://api.adoptium.net/v3/binary/latest/21/ga/windows/$arch/jdk/hotspot/normal/eclipse" $root }
    'ghidra' { Install-Archive (Get-Release 'NationalSecurityAgency/ghidra' '\.zip$') $root }
    # The CLI archive, not jadx-gui.
    'jadx' { Install-Archive (Get-Release 'skylot/jadx' '^jadx-[\d.]+\.zip$') (Join-Path $root 'jadx') }
    'ilspycmd' {
      # Reuse an installed .NET 10+ SDK, else install one into the tools root.
      $dotnet = (Get-Command dotnet -ErrorAction SilentlyContinue).Source
      if (-not $dotnet -or -not ((& $dotnet --list-sdks) -match '^(1\d|[2-9]\d)\.')) {
        $installer = Join-Path ([IO.Path]::GetTempPath()) 'dotnet-install.ps1'
        & $curl -fsSL -o $installer https://dot.net/v1/dotnet-install.ps1
        if ($LASTEXITCODE) { throw 'download failed: dotnet-install.ps1' }
        & $installer -Channel 10.0 -InstallDir (Join-Path $root 'dotnet')
        Remove-Item $installer -Force
        $dotnet = Join-Path $root 'dotnet\dotnet.exe'
      }
      & $dotnet tool update ilspycmd --tool-path (Join-Path $root 'dotnet-tools')
      if ($LASTEXITCODE) { throw 'dotnet tool update ilspycmd failed' }
    }
  }
  Write-Output "installed $tool into $root"
}
