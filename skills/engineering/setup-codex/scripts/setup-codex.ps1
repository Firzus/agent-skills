[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }),
    [string]$SourcePrompt = $(Join-Path (Split-Path $PSScriptRoot -Parent) "codex-operating-policy.md"),
    [ValidateSet("low", "medium", "high")]
    [string]$Verbosity = "low"
)

$ErrorActionPreference = "Stop"

function Set-RootTomlString {
    param(
        [string]$Text,
        [string]$Key,
        [string]$Value
    )

    $newline = if ($Text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $section = [regex]::Match($Text, "(?m)^[\t ]*\[")
    $root = if ($section.Success) { $Text.Substring(0, $section.Index) } else { $Text }
    $suffix = if ($section.Success) { $Text.Substring($section.Index) } else { "" }
    $pattern = "(?m)^[\t ]*" + [regex]::Escape($Key) + "[\t ]*=.*$"
    $matches = [regex]::Matches($root, $pattern)

    if ($matches.Count -gt 1) {
        throw "The root key '$Key' occurs more than once in config.toml."
    }

    $escapedValue = $Value.Replace("\", "\\").Replace('"', '\"')
    $line = "$Key = `"$escapedValue`""

    if ($matches.Count -eq 1) {
        $root = [regex]::Replace($root, $pattern, $line)
    } else {
        if ($root.Length -gt 0 -and -not $root.EndsWith($newline)) {
            $root += $newline
        }
        $root += $line + $newline
    }

    return $root + $suffix
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Text
    )

    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

$CodexHome = [System.IO.Path]::GetFullPath($CodexHome)
$SourcePrompt = [System.IO.Path]::GetFullPath($SourcePrompt)
$configPath = Join-Path $CodexHome "config.toml"
$promptDirectory = Join-Path $CodexHome "instructions"
$promptPath = Join-Path $promptDirectory "codex-operating-policy.md"

if (-not (Test-Path -LiteralPath $SourcePrompt -PathType Leaf)) {
    throw "Source prompt not found: $SourcePrompt"
}

$originalConfig = if (Test-Path -LiteralPath $configPath -PathType Leaf) {
    [System.IO.File]::ReadAllText($configPath)
} else {
    ""
}

$promptConfigPath = $promptPath.Replace("\", "/")
$updatedConfig = Set-RootTomlString $originalConfig "model_verbosity" $Verbosity
$updatedConfig = Set-RootTomlString $updatedConfig "model_instructions_file" $promptConfigPath
$configChanged = $updatedConfig -cne $originalConfig
$promptChanged = -not (Test-Path -LiteralPath $promptPath -PathType Leaf) -or
    (Get-FileHash -LiteralPath $SourcePrompt -Algorithm SHA256).Hash -cne
    (Get-FileHash -LiteralPath $promptPath -Algorithm SHA256).Hash

if (-not $configChanged -and -not $promptChanged) {
    Write-Output "Codex setup is already current at $CodexHome."
    exit 0
}

if (-not $PSCmdlet.ShouldProcess($CodexHome, "Install the Codex operating policy")) {
    exit 0
}

$existingFiles = @($configPath, $promptPath) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
$backupDirectory = $null

if ($existingFiles.Count -gt 0) {
    $backupDirectory = Join-Path $CodexHome ("backups/setup-codex-" + (Get-Date -Format "yyyyMMdd-HHmmssfff"))
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

    foreach ($file in $existingFiles) {
        Copy-Item -LiteralPath $file -Destination (Join-Path $backupDirectory (Split-Path $file -Leaf))
    }
}

New-Item -ItemType Directory -Path $CodexHome -Force | Out-Null
New-Item -ItemType Directory -Path $promptDirectory -Force | Out-Null

if ($configChanged) {
    Write-Utf8NoBom $configPath $updatedConfig
}

if ($promptChanged) {
    Copy-Item -LiteralPath $SourcePrompt -Destination $promptPath -Force
}

Write-Output "Installed the Codex operating policy at $CodexHome."
if ($backupDirectory) {
    Write-Output "Backup: $backupDirectory"
}
Write-Output "Start a new Codex task to load the instructions."
