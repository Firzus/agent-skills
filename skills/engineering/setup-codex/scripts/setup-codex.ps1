[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }),
    [string]$SourcePrompt = $(Join-Path (Split-Path $PSScriptRoot -Parent) "codex-operating-policy.md"),
    [string]$WorkflowSource = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../../..")),
    [string]$SkillsHome,
    [string[]]$ReplaceSkill = @(),
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

function Assert-UnlinkedPath {
    param([string]$Path)

    $current = [System.IO.Path]::GetFullPath($Path)
    while ($current) {
        $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
        if ($item -and ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
            throw "Linked path requires explicit resolution before setup: $current"
        }
        $current = Split-Path $current -Parent
    }
}

function Assert-ChildPath {
    param([string]$Path, [string]$Parent)

    $prefix = [System.IO.Path]::GetFullPath($Parent).TrimEnd([char[]]"\/") + [System.IO.Path]::DirectorySeparatorChar
    if (-not [System.IO.Path]::GetFullPath($Path).StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside the expected directory: $Path"
    }
}

function Assert-SeparatePaths {
    param([string]$First, [string]$Second)

    $firstPath = [System.IO.Path]::GetFullPath($First).TrimEnd([char[]]"\/")
    $secondPath = [System.IO.Path]::GetFullPath($Second).TrimEnd([char[]]"\/")
    $separator = [System.IO.Path]::DirectorySeparatorChar
    if ($firstPath -eq $secondPath -or
        $firstPath.StartsWith($secondPath + $separator, [System.StringComparison]::OrdinalIgnoreCase) -or
        $secondPath.StartsWith($firstPath + $separator, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Setup paths overlap: $First ; $Second"
    }
}

function Get-SkillSignature {
    param([string]$Path)

    Assert-UnlinkedPath $Path
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        throw "Skill directory not found: $Path"
    }
    $entries = foreach ($entry in Get-ChildItem -LiteralPath $Path -Recurse -Force | Sort-Object FullName) {
        if ($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            throw "Linked skill content requires explicit resolution before setup: $($entry.FullName)"
        }
        $relative = [System.IO.Path]::GetRelativePath($Path, $entry.FullName)
        if ($entry.PSIsContainer) {
            "$relative/"
        } else {
            "$relative $((Get-FileHash -LiteralPath $entry.FullName -Algorithm SHA256).Hash)"
        }
    }
    return $entries -join "`n"
}

$CodexHome = [System.IO.Path]::GetFullPath($CodexHome)
$WorkflowSource = [System.IO.Path]::GetFullPath($WorkflowSource)
if (-not $SkillsHome) {
    $defaultCodexHome = [System.IO.Path]::GetFullPath((Join-Path $HOME ".codex"))
    if ($CodexHome -ne $defaultCodexHome) {
        throw "An alternate Codex home requires an explicit -SkillsHome to keep profiles isolated."
    }
    $SkillsHome = Join-Path $HOME ".agents/skills"
}
$SkillsHome = [System.IO.Path]::GetFullPath($SkillsHome)
$sourceSkills = Join-Path $WorkflowSource "skills/engineering"
if (-not $PSBoundParameters.ContainsKey("SourcePrompt")) {
    $SourcePrompt = Join-Path $sourceSkills "setup-codex/codex-operating-policy.md"
}
$SourcePrompt = [System.IO.Path]::GetFullPath($SourcePrompt)
$configPath = Join-Path $CodexHome "config.toml"
$promptDirectory = Join-Path $CodexHome "instructions"
$promptPath = Join-Path $promptDirectory "codex-operating-policy.md"

foreach ($path in @($CodexHome, $SkillsHome, $SourcePrompt, $configPath, $promptPath)) {
    Assert-UnlinkedPath $path
}
if (-not (Test-Path -LiteralPath $SourcePrompt -PathType Leaf)) {
    throw "Workflow prompt not found: $SourcePrompt. Set -WorkflowSource to an approved complete repository checkout."
}

$skillNames = @("deep-research", "prototype", "implement", "manage-project")
foreach ($name in $ReplaceSkill) {
    if ($name -notin $skillNames) {
        throw "Replacement is not a workflow skill: $name"
    }
}
$skillPlan = foreach ($name in $skillNames) {
    $source = Join-Path $sourceSkills $name
    $target = Join-Path $SkillsHome $name
    foreach ($managedPath in @($configPath, $promptDirectory, (Join-Path $CodexHome "backups"))) {
        Assert-SeparatePaths $target $managedPath
        Assert-SeparatePaths $source $managedPath
    }
    Assert-SeparatePaths $target $SourcePrompt
    $entryPoint = Join-Path $source "SKILL.md"
    if (-not (Test-Path -LiteralPath $entryPoint -PathType Leaf)) {
        throw "Workflow skill not found: $entryPoint. Set -WorkflowSource to an approved complete repository checkout."
    }
    $sourceSignature = Get-SkillSignature $source
    $metadata = [System.IO.File]::ReadAllText($entryPoint)
    if ($metadata -notmatch "(?s)\A---\r?\n(.*?)\r?\n---") {
        throw "Skill metadata not found: $entryPoint"
    }
    $frontmatter = $Matches[1]
    if ($frontmatter -notmatch "(?m)^name:\s*$([regex]::Escape($name))\s*$" -or $frontmatter -notmatch "(?m)^description:") {
        throw "Unexpected skill metadata: $entryPoint"
    }
    Assert-UnlinkedPath $target
    $exists = Test-Path -LiteralPath $target
    $targetSignature = if ($exists) { Get-SkillSignature $target } else { $null }
    [pscustomobject]@{
        Name = $name
        Source = $source
        Target = $target
        SourceSignature = $sourceSignature
        TargetSignature = $targetSignature
        Exists = $exists
        Changed = -not $exists -or $sourceSignature -cne $targetSignature
    }
}
$skillChanges = @($skillPlan | Where-Object Changed)
foreach ($skill in $skillChanges) {
    foreach ($source in $skillPlan.Source) {
        Assert-SeparatePaths $source $skill.Target
    }
}
$conflicts = @($skillChanges | Where-Object { $_.Exists -and $_.Name -notin $ReplaceSkill })
if ($conflicts.Count -gt 0) {
    throw "Existing skills differ: $($conflicts.Target -join ', '). Review the differences and authorize only approved names with -ReplaceSkill."
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

if (-not $configChanged -and -not $promptChanged -and $skillChanges.Count -eq 0) {
    Write-Output "Codex workflow is already current at $CodexHome; skills: $SkillsHome."
    exit 0
}
foreach ($skill in $skillChanges) {
    $action = if ($skill.Exists) { "replace with backup" } else { "install" }
    Write-Output "Skill $($skill.Name): $action at $($skill.Target)"
}
if (-not $PSCmdlet.ShouldProcess("$CodexHome; skills: $SkillsHome", "Install the Codex workflow")) {
    exit 0
}

$existingFiles = @($configPath, $promptPath) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
$backupDirectory = $null
if ($existingFiles.Count -gt 0 -or @($skillChanges | Where-Object Exists).Count -gt 0) {
    $backupDirectory = Join-Path $CodexHome ("backups/setup-codex-" + (Get-Date -Format "yyyyMMdd-HHmmssfff"))
    Assert-UnlinkedPath $backupDirectory
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    foreach ($file in $existingFiles) {
        Copy-Item -LiteralPath $file -Destination (Join-Path $backupDirectory (Split-Path $file -Leaf))
    }
}

New-Item -ItemType Directory -Path $SkillsHome -Force | Out-Null
foreach ($skill in $skillChanges) {
    if ((Get-SkillSignature $skill.Source) -cne $skill.SourceSignature) {
        throw "Skill source changed during setup: $($skill.Source)"
    }
    if ($skill.Exists) {
        if ((Get-SkillSignature $skill.Target) -cne $skill.TargetSignature) {
            throw "Skill destination changed during setup: $($skill.Target)"
        }
        $savedSkill = Join-Path $backupDirectory "skills/$($skill.Name)"
        Assert-ChildPath $skill.Target $SkillsHome
        Assert-ChildPath $savedSkill $backupDirectory
        Assert-UnlinkedPath $savedSkill
        New-Item -ItemType Directory -Path (Split-Path $savedSkill -Parent) -Force | Out-Null
        Move-Item -LiteralPath $skill.Target -Destination $savedSkill
    } elseif (Test-Path -LiteralPath $skill.Target) {
        throw "Skill destination appeared during setup: $($skill.Target)"
    }
    Copy-Item -LiteralPath $skill.Source -Destination $skill.Target -Recurse
}
foreach ($skill in $skillPlan) {
    if ((Get-SkillSignature $skill.Target) -cne $skill.SourceSignature) {
        throw "Skill verification failed; the policy was not activated: $($skill.Target)"
    }
}

New-Item -ItemType Directory -Path $promptDirectory -Force | Out-Null
if ($promptChanged) {
    Copy-Item -LiteralPath $SourcePrompt -Destination $promptPath -Force
}
if ($configChanged) {
    Write-Utf8NoBom $configPath $updatedConfig
}
Write-Output "Installed the Codex workflow at $CodexHome; skills: $SkillsHome."
if ($backupDirectory) {
    Write-Output "Backup: $backupDirectory"
}
Write-Output "Start a new Codex task to verify instruction loading and skill discovery."
