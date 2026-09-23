[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }),
    [string]$SourcePolicy,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$CommunicationLanguage,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$WritingLanguage,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$CodeLanguage,
    [switch]$ApproveReplacement,
    [string]$ApprovedContentHash,
    [string]$ExpectedTargetHash
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

$CodexHome = [IO.Path]::GetFullPath($CodexHome)
$useEmbeddedPolicy = -not $PSBoundParameters.ContainsKey('SourcePolicy')
if ($useEmbeddedPolicy) { $SourcePolicy = Join-Path (Split-Path $PSScriptRoot -Parent) 'SKILL.md' }
$SourcePolicy = [IO.Path]::GetFullPath($SourcePolicy)
$target = Join-Path $CodexHome 'AGENTS.md'
$override = Join-Path $CodexHome 'AGENTS.override.md'
$config = Join-Path $CodexHome 'config.toml'
foreach ($path in @($CodexHome, $SourcePolicy, $target, $override, $config)) { Assert-UnlinkedPath $path }
if ($SourcePolicy -eq $target) { throw 'The source policy cannot be the destination.' }
$template = [IO.File]::ReadAllText($SourcePolicy)
if ($useEmbeddedPolicy) {
    $blocks = [regex]::Matches($template, '(?ms)^```markdown\r?\n(# User operating instructions\r?\n.*?)^```\r?$')
    if ($blocks.Count -ne 1) { throw 'SKILL.md must contain exactly one operating policy block.' }
    $template = $blocks[0].Groups[1].Value
}
$content = $template.Replace('{{COMMUNICATION_LANGUAGE}}', $CommunicationLanguage.Trim()).Replace('{{WRITING_LANGUAGE}}', $WritingLanguage.Trim()).Replace('{{CODE_LANGUAGE}}', $CodeLanguage.Trim())
if ([string]::IsNullOrWhiteSpace($content) -or $content -match '\{\{[^}]+\}\}') { throw 'The policy is empty or contains unresolved placeholders.' }
$bytes = [Text.UTF8Encoding]::new($false).GetBytes($content)
$contentHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
$targetHash = Get-TargetHash $target
$hasOverride = (Test-Path -LiteralPath $override -PathType Leaf) -and -not [string]::IsNullOrWhiteSpace([IO.File]::ReadAllText($override))
if ($hasOverride) { Write-Warning 'AGENTS.override.md takes precedence. Resolve it separately before applying.' }
if (Test-Path -LiteralPath $config -PathType Leaf) {
    if ([IO.File]::ReadAllText($config) -match '(?m)^\s*(model_instructions_file|developer_instructions)\s*=') {
        Write-Warning 'Custom instructions are configured. They are not modified; inspect them for conflicts before claiming activation.'
    }
}
Write-Output "Target: $target"
Write-Output "Target SHA256: $targetHash"
Write-Output "Content SHA256: $contentHash"
Write-Output "Proposed complete content:`n$content"
if ($WhatIfPreference) {
    $null = $PSCmdlet.ShouldProcess($target, 'Replace complete user instructions with backup')
    return
}
if (-not $ApproveReplacement -or $ApprovedContentHash -cne $contentHash) {
    throw 'Preview first, obtain approval of the complete content, then pass -ApproveReplacement and its -ApprovedContentHash.'
}
if ($ExpectedTargetHash -cne $targetHash) { throw 'The target differs from the reviewed snapshot. Preview and approve again.' }
if ($hasOverride) { throw 'The global override prevents the intended instruction loading. No files were changed.' }
if ($targetHash -ceq $contentHash) { Write-Output 'Already current; no files or backups changed.'; return }
if (-not $PSCmdlet.ShouldProcess($target, 'Replace complete user instructions with backup')) { return }

$backup = $null
if ($targetHash -ne 'MISSING') {
    $backupDirectory = Join-Path $CodexHome ('backups/setup-codex-' + [Guid]::NewGuid().ToString('N'))
    Assert-UnlinkedPath $backupDirectory
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    $backup = Join-Path $backupDirectory 'AGENTS.md'
}
New-Item -ItemType Directory -Path $CodexHome -Force | Out-Null
$staged = Join-Path $CodexHome ('.agents-' + [Guid]::NewGuid().ToString('N') + '.tmp')
try {
    [IO.File]::WriteAllBytes($staged, $bytes)
    Assert-UnlinkedPath $target
    if ((Get-TargetHash $target) -cne $targetHash) { throw 'The destination changed during setup. The replacement was cancelled.' }
    if ($targetHash -eq 'MISSING') {
        [IO.File]::Move($staged, $target)
    } else {
        [IO.File]::Replace($staged, $target, $backup)
    }
    if ((Get-TargetHash $target) -cne $contentHash) { throw "Post-write verification failed. Backup: $backup" }
} catch {
    throw "Setup failed: $($_.Exception.Message) Backup: $backup"
} finally {
    if (Test-Path -LiteralPath $staged) { Remove-Item -LiteralPath $staged }
}
Write-Output "Replaced: $target"
if ($backup) { Write-Output "Backup: $backup" }
Write-Output 'Configuration and installed skills were not modified. Verify loading in a new Codex task.'
