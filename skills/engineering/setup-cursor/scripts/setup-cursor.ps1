[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$CursorHome = (Join-Path $HOME '.cursor'),
    [string]$SourcePolicy,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$CommunicationLanguage,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$WritingLanguage,
    [Parameter(Mandatory)][ValidatePattern('^[^\r\n{}]{1,80}$')][string]$CodeLanguage,
    [switch]$ApproveInstall,
    [string]$ApprovedContentHash,
    [string]$ExpectedPolicyHash
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
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

$CursorHome = [IO.Path]::GetFullPath($CursorHome)
$useEmbeddedPolicy = -not $PSBoundParameters.ContainsKey('SourcePolicy')
if ($useEmbeddedPolicy) { $SourcePolicy = Join-Path (Split-Path $PSScriptRoot -Parent) 'SKILL.md' }
$SourcePolicy = [IO.Path]::GetFullPath($SourcePolicy)
$rules = Join-Path $CursorHome 'rules'
$policy = Join-Path $rules 'cursor-operating-policy.mdc'
foreach ($path in @($CursorHome, $SourcePolicy, $policy)) { Assert-UnlinkedPath $path }
if ($SourcePolicy -eq $policy) { throw 'The source policy cannot be the destination.' }
$template = [IO.File]::ReadAllText($SourcePolicy)
if ($useEmbeddedPolicy) {
    $blocks = [regex]::Matches($template, '(?ms)^```markdown\r?\n(# Cursor Operating Policy\r?\n.*?)^```\r?$')
    if ($blocks.Count -ne 1) { throw 'SKILL.md must contain exactly one Cursor Operating Policy block.' }
    $template = $blocks[0].Groups[1].Value
}
$body = $template.Replace('{{COMMUNICATION_LANGUAGE}}', $CommunicationLanguage.Trim()).Replace('{{WRITING_LANGUAGE}}', $WritingLanguage.Trim()).Replace('{{CODE_LANGUAGE}}', $CodeLanguage.Trim())
if ([string]::IsNullOrWhiteSpace($body) -or $body -match '\{\{[^}]+\}\}') { throw 'The policy is empty or contains unresolved placeholders.' }
$frontmatter = "---`ndescription: Personal communication, safety, and Git conventions`nalwaysApply: true`n---`n`n"
$content = $frontmatter + $body
$utf8 = [Text.UTF8Encoding]::new($false, $true)
$policyBytes = $utf8.GetBytes($content)
$contentHash = Get-BytesHash $policyBytes
$policyHash = Get-TargetHash $policy
$otherRules = @()
if (Test-Path -LiteralPath $rules -PathType Container) {
    $otherRules = @(Get-ChildItem -LiteralPath $rules -Force | Where-Object { $_.FullName -ne $policy } | ForEach-Object { $_.Name })
}
if ($otherRules.Count -gt 0) {
    Write-Warning "Other user rules may add conflicting instructions: $($otherRules -join ', ')"
}
Write-Output "Policy target: $policy"
Write-Output "Policy SHA256: $policyHash"
Write-Output "Content SHA256: $contentHash"
Write-Output "Other rule files: $(if ($otherRules.Count) { $otherRules -join ', ' } else { 'none' })"
Write-Output "Proposed complete content:`n$content"
if ($WhatIfPreference) {
    $null = $PSCmdlet.ShouldProcess($policy, 'Install Cursor operating policy rule')
    return
}
if (-not $ApproveInstall -or $ApprovedContentHash -cne $contentHash) {
    throw 'Preview first, obtain approval of the complete policy, then pass -ApproveInstall and -ApprovedContentHash.'
}
if ($ExpectedPolicyHash -cne $policyHash) {
    throw 'The destination differs from the reviewed snapshot. Preview and approve again.'
}
if ($policyHash -ceq $contentHash) {
    Write-Output 'Already current.'
    return
}
if (-not $PSCmdlet.ShouldProcess($policy, 'Install Cursor operating policy rule')) { return }

New-Item -ItemType Directory -Path $rules -Force | Out-Null
$backupDirectory = $null
$backup = $null
if ($policyHash -ne 'MISSING') {
    $backupDirectory = Join-Path $CursorHome ('backups/setup-cursor-' + [Guid]::NewGuid().ToString('N'))
    Assert-UnlinkedPath $backupDirectory
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    $backup = Join-Path $backupDirectory 'cursor-operating-policy.mdc'
}
$staged = Join-Path $CursorHome ('.setup-cursor-' + [Guid]::NewGuid().ToString('N') + '.tmp')
try {
    [IO.File]::WriteAllBytes($staged, $policyBytes)
    Assert-UnlinkedPath $policy
    if ((Get-TargetHash $policy) -cne $policyHash) { throw "Destination changed during setup: $policy" }
    if ($policyHash -eq 'MISSING') {
        [IO.File]::Move($staged, $policy)
    } else {
        [IO.File]::Replace($staged, $policy, $backup)
    }
    if ((Get-TargetHash $policy) -cne $contentHash) { throw "Post-write verification failed: $policy" }
} catch {
    throw "Setup failed: $($_.Exception.Message) Inspect the policy destination. Backup directory: $backupDirectory"
} finally {
    if (Test-Path -LiteralPath $staged) { Remove-Item -LiteralPath $staged }
}
Write-Output "Policy installed: $policy"
if ($backupDirectory) { Write-Output "Backup: $backupDirectory" }
Write-Output 'Verify loading in a new Cursor Agent chat.'
