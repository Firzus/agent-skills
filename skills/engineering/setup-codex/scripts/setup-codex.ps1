[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }),
    [string]$SourcePolicy,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$CommunicationLanguage,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$WritingLanguage,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$CodeLanguage,
    [switch]$ApproveInstall,
    [string]$ApprovedContentHash,
    [string]$ApprovedConfigHash,
    [string]$ExpectedPolicyHash,
    [string]$ExpectedConfigHash,
    [switch]$SetLowVerbosity,
    [switch]$ApproveLowVerbosity
)

$ErrorActionPreference = 'Stop'
foreach ($language in @($CommunicationLanguage, $WritingLanguage, $CodeLanguage)) {
    if ([string]::IsNullOrWhiteSpace($language)) { throw 'Each language choice must be explicit and nonempty.' }
}

function Assert-UnlinkedPath([string]$Path) {
    $current = [IO.Path]::GetFullPath($Path)
    while ($current) {
        $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
        if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Linked path requires separate resolution: $current"
        }
        $current = Split-Path $current -Parent
    }
}

function Get-TargetHash([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return 'MISSING' }
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Not a file: $Path" }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Get-BytesHash([byte[]]$Bytes) {
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes))
}

function Set-RootSetting([string]$Text, [string]$Key, [string]$Value) {
    $table = [regex]::Match($Text, '(?m)^[ \t]*\[[^\r\n]+\]')
    $rootEnd = if ($table.Success) { $table.Index } else { $Text.Length }
    $matches = [regex]::Matches($Text.Substring(0, $rootEnd), '(?m)^[ \t]*' + [regex]::Escape($Key) + '[ \t]*=[^\r\n]*')
    if ($matches.Count -gt 1) { throw "Multiple user-level $Key settings require manual resolution." }
    $setting = "$Key = $Value"
    if ($matches.Count -eq 1) {
        $match = $matches[0]
        return $Text.Substring(0, $match.Index) + $setting + $Text.Substring($match.Index + $match.Length)
    }
    $newline = if ($Text.Contains("`r`n")) { "`r`n" } else { "`n" }
    return $setting + $newline + $Text
}

function Install-File([string]$Path, [byte[]]$Bytes, [string]$ExpectedHash, [string]$Backup) {
    $staged = Join-Path $CodexHome ('.setup-codex-' + [Guid]::NewGuid().ToString('N') + '.tmp')
    try {
        [IO.File]::WriteAllBytes($staged, $Bytes)
        Assert-UnlinkedPath $Path
        if ((Get-TargetHash $Path) -cne $ExpectedHash) { throw "Destination changed during setup: $Path" }
        if ($ExpectedHash -eq 'MISSING') {
            [IO.File]::Move($staged, $Path)
        } else {
            [IO.File]::Replace($staged, $Path, $Backup)
        }
        if ((Get-TargetHash $Path) -cne (Get-BytesHash $Bytes)) { throw "Post-write verification failed: $Path" }
    } finally {
        if (Test-Path -LiteralPath $staged) { Remove-Item -LiteralPath $staged }
    }
}

$CodexHome = [IO.Path]::GetFullPath($CodexHome)
$useEmbeddedPolicy = -not $PSBoundParameters.ContainsKey('SourcePolicy')
if ($useEmbeddedPolicy) { $SourcePolicy = Join-Path (Split-Path $PSScriptRoot -Parent) 'SKILL.md' }
$SourcePolicy = [IO.Path]::GetFullPath($SourcePolicy)
$policy = Join-Path $CodexHome 'instructions/codex-operating-policy.md'
$config = Join-Path $CodexHome 'config.toml'
foreach ($path in @($CodexHome, $SourcePolicy, $policy, $config)) { Assert-UnlinkedPath $path }
if ($SourcePolicy -in @($policy, $config)) { throw 'The source policy cannot be a destination.' }
$template = [IO.File]::ReadAllText($SourcePolicy)
if ($useEmbeddedPolicy) {
    $blocks = [regex]::Matches($template, '(?ms)^```markdown\r?\n(# Codex Operating Policy\r?\n.*?)^```\r?$')
    if ($blocks.Count -ne 1) { throw 'SKILL.md must contain exactly one Codex Operating Policy block.' }
    $template = $blocks[0].Groups[1].Value
}
$content = $template.Replace('{{COMMUNICATION_LANGUAGE}}', $CommunicationLanguage.Trim()).Replace('{{WRITING_LANGUAGE}}', $WritingLanguage.Trim()).Replace('{{CODE_LANGUAGE}}', $CodeLanguage.Trim())
if ([string]::IsNullOrWhiteSpace($content) -or $content -match '\{\{[^}]+\}\}') { throw 'The policy is empty or contains unresolved placeholders.' }
$utf8 = [Text.UTF8Encoding]::new($false, $true)
$policyBytes = $utf8.GetBytes($content)
$contentHash = Get-BytesHash $policyBytes
$policyHash = Get-TargetHash $policy
$configHash = Get-TargetHash $config
if ($configHash -eq 'MISSING') { $configRaw = [byte[]]::new(0) } else { $configRaw = [IO.File]::ReadAllBytes($config) }
$hasBom = $configRaw.Length -ge 3 -and $configRaw[0] -eq 0xEF -and $configRaw[1] -eq 0xBB -and $configRaw[2] -eq 0xBF
$configText = if ($hasBom) { $utf8.GetString($configRaw, 3, $configRaw.Length - 3) } else { $utf8.GetString($configRaw) }
$policyValue = ConvertTo-Json -InputObject ($policy.Replace('\', '/')) -Compress
$configContent = Set-RootSetting $configText 'model_instructions_file' $policyValue
if ($SetLowVerbosity) { $configContent = Set-RootSetting $configContent 'model_verbosity' '"low"' }
$configBytes = $utf8.GetBytes($configContent)
if ($hasBom) { $configBytes = [byte[]]@(0xEF, 0xBB, 0xBF) + $configBytes }
$newConfigHash = Get-BytesHash $configBytes
if ($configText -match '(?m)^[ \t]*developer_instructions[ \t]*=') {
    Write-Warning 'Existing developer_instructions may add conflicting instructions.'
}
Write-Output "Policy target: $policy"
Write-Output "Policy SHA256: $policyHash"
Write-Output "Config target: $config"
Write-Output "Config SHA256: $configHash"
Write-Output "Content SHA256: $contentHash"
Write-Output "Proposed config SHA256: $newConfigHash"
Write-Output "Proposed config setting: model_instructions_file = $policyValue"
if ($SetLowVerbosity) {
    Write-Output 'Proposed verbosity setting: model_verbosity = "low"'
}
Write-Output "Proposed complete content:`n$content"
if ($WhatIfPreference) {
    $null = $PSCmdlet.ShouldProcess($policy, 'Install operating policy and configure Codex')
    return
}
if (-not $ApproveInstall -or $ApprovedContentHash -cne $contentHash) {
    throw 'Preview first, obtain approval of the complete policy and config setting, then pass -ApproveInstall and -ApprovedContentHash.'
}
if ($ApprovedConfigHash -cne $newConfigHash) {
    throw 'The proposed config differs from the approved preview. Pass its -ApprovedConfigHash.'
}
if ($SetLowVerbosity -and -not $ApproveLowVerbosity) {
    throw 'Explicit approval of model_verbosity = "low" is required. Ask the user, then pass -ApproveLowVerbosity.'
}
if ($ApproveLowVerbosity -and -not $SetLowVerbosity) { throw '-ApproveLowVerbosity requires -SetLowVerbosity.' }
if ($ExpectedPolicyHash -cne $policyHash -or $ExpectedConfigHash -cne $configHash) {
    throw 'A destination differs from the reviewed snapshot. Preview and approve again.'
}
if ($policyHash -ceq $contentHash -and $configHash -ceq $newConfigHash) {
    Write-Output 'Already current.'
    return
}
if (-not $PSCmdlet.ShouldProcess($policy, 'Install operating policy and configure Codex')) { return }

New-Item -ItemType Directory -Path (Split-Path $policy -Parent) -Force | Out-Null
$backupDirectory = $null
if (($policyHash -ne 'MISSING' -and $policyHash -cne $contentHash) -or
    ($configHash -ne 'MISSING' -and $configHash -cne $newConfigHash)) {
    $backupDirectory = Join-Path $CodexHome ('backups/setup-codex-' + [Guid]::NewGuid().ToString('N'))
    Assert-UnlinkedPath $backupDirectory
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
}
$policyBackup = if ($policyHash -ne 'MISSING' -and $policyHash -cne $contentHash) { Join-Path $backupDirectory 'codex-operating-policy.md' } else { $null }
$configBackup = if ($configHash -ne 'MISSING' -and $configHash -cne $newConfigHash) { Join-Path $backupDirectory 'config.toml' } else { $null }
try {
    if ($policyHash -cne $contentHash) { Install-File $policy $policyBytes $policyHash $policyBackup }
    if ($configHash -cne $newConfigHash) { Install-File $config $configBytes $configHash $configBackup }
} catch {
    throw "Setup failed: $($_.Exception.Message) Inspect the policy and config destinations. Backup directory: $backupDirectory"
}
Write-Output "Policy installed: $policy"
Write-Output "Configuration updated: $config"
if ($backupDirectory) { Write-Output "Backups: $backupDirectory" }
Write-Output 'Verify loading in a new Codex task.'
