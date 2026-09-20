---
name: setup-codex
description: Install the four workflow skills, the Codex operating policy, and its settings with backups and conflict checks.
disable-model-invocation: true
---

# Set up the Codex workflow

Install deep-research, prototype, implement, and manage-project with their references before activating the global policy. Keep personal and project agreements, model selection, authentication, permissions, and MCP servers unchanged.

## 1. Inspect and prepare

Resolve the target Codex home from `CODEX_HOME`, falling back to `~/.codex`. Read the existing policy and configuration. Identify the skill destination and other skill locations exposed by the host; the default user destination is `~/.agents/skills`. An alternate Codex home requires an explicit skill destination to preserve isolation.

Locate an approved complete checkout of this repository containing the four methods and setup-codex. Verify its revision or reviewed content. A standalone setup-codex installation does not contain its sibling skills: locate that checkout or obtain the approved revision with an available repository tool before continuing. If the source is unavailable, report it rather than use unrelated same-name skills or silently fetch a different revision.

Report source, destinations, installed copies, and conflicts. Include the two managed root keys, `model_instructions_file` and `model_verbosity`, which the installer replaces. Check for duplicate names and conflicting workflow procedures in exposed locations before activation; the script checks its chosen destination, not every host's discovery paths, and leaves all other skill directories untouched.

Existing identical skills are preserved. Any different content, including personal files, requires explicit replacement approval by name. Linked paths require a separate approved resolution; the installer refuses to write through them. Preview any removal, preserve shared link targets, and leave unrelated skills untouched.

**Done when:** source and destinations are unambiguous, conflicts are resolved or their replacements explicitly approved, and the planned changes are understood.

## 2. Install skills, then activate the policy

Use the bundled PowerShell installer with the approved repository root:

```powershell
pwsh -File "<skill-directory>/scripts/setup-codex.ps1" -WorkflowSource "<repository-root>"
```

When running directly from a complete checkout, the source defaults to that checkout. For another profile or a test, pass both `-CodexHome <path>` and `-SkillsHome <path>`; selecting a Codex profile alone never selects an isolated skill destination.

Use `-WhatIf` to preview without writing. After explicit approval, `-ReplaceSkill <name>` authorizes replacement of that differing skill; the parameter also accepts a PowerShell string array. Without that approval, keep the conflicting skill and stop before activation.

The installer validates all four sources and destinations first. It copies only those four directories, including references, and checks their complete content before writing the prompt and activating its settings. It performs no network installation and adds no dependency. Missing sources and detected conflicts fail before writes; a later filesystem failure can leave a partial skill copy and must be reported, not called a completed install.

These settings are managed:

```toml
model_verbosity = "low"
model_instructions_file = "<codex-home>/instructions/codex-operating-policy.md"
```

Existing profile files and approved replaced skills are backed up under `<codex-home>/backups/`. A current installation is preserved on rerun without another backup. Changed skill content needs renewed replacement approval.

**Done when:** the installer confirms all four skills and the policy, with no unresolved error.

## 3. Verify and hand over

Check that:

- the four installed directories and references match the approved sources;
- duplicate names or disabled entries in the host's exposed configuration have been resolved, not assumed away;
- each managed setting occurs once at the TOML root, the policy path resolves, and its content matches the approved prompt;
- unrelated configuration and skills remain intact;
- backups contain the replaced files and any approved skill replacements.

Report installed paths, preserved or replaced skills, backup locations, and remaining discovery limits. Verify loading and discovery in a new Codex task; the current task's instructions do not prove that the new package is active. Request a new task from the user when the current tools cannot verify it without creating one.

**Done when:** file checks pass and loading is either observed or explicitly pending. Installation alone is not a behavioral trial.

## Restore

Use the recorded backup to restore replaced profile files and skill directories. Preview removal of newly created destinations or replacement copies before restoring; preserve subsequent user edits and shared link targets. Check the restored state in a new task.
